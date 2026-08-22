import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';
import { calculateSalary } from '../src/utils/payrollCalculator';

describe('Payroll Engine, Payslips and Payable Days Tests', () => {
  let adminToken = '';
  let adminId = '';
  let empToken = '';
  let empId = '';

  const cleanAll = async () => {
    await prisma.notification.deleteMany();
    await prisma.payslip.deleteMany();
    await prisma.salaryAudit.deleteMany();
    await prisma.salaryStructure.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveAllocation.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
  };

  beforeAll(async () => {
    await cleanAll();

    const admin = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'pay.admin@dayflow.com',
        password: 'Admin@123',
        firstName: 'Priya',
        lastName: 'Nair',
        role: 'ADMIN_HR',
      });
    adminToken = admin.body.data.token;
    adminId = admin.body.data.user.id;

    const emp = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'pay.emp@dayflow.com',
        password: 'Emp@12345',
        firstName: 'Arjun',
        lastName: 'Mehta',
        department: 'Engineering',
      });
    empToken = emp.body.data.token;
    empId = emp.body.data.employee.id;
  });

  afterAll(async () => {
    await cleanAll();
    await prisma.$disconnect();
  });

  describe('Salary calculator (authoritative server-side math)', () => {
    it('computes the exact ₹50,000 wage breakdown', () => {
      const s = calculateSalary(50000);
      expect(s.basicSalary).toBe(25000);
      expect(s.hra).toBe(12500);
      expect(s.standardAllowance).toBeCloseTo(4167.5, 2);
      expect(s.performanceBonus).toBeCloseTo(2082.5, 2);
      // LTA is 8.333% of Basic per the Dayflow specification: 25000 * 0.08333 = 2083.25
      expect(s.lta).toBe(2083.25);
      expect(s.fixedAllowance).toBe(4166.75);
      expect(s.grossEarnings).toBe(50000);
      expect(s.employeePf).toBe(3000);
      expect(s.employerPf).toBe(3000);
      expect(s.professionalTax).toBe(200);
      expect(s.netPay).toBe(46800);
    });

    it('keeps gross equal to wage and fixed allowance non-negative for sample wages', () => {
      for (const wage of [18000.55, 25341.1, 75000, 1234567.89]) {
        const s = calculateSalary(wage);
        expect(s.fixedAllowance).toBeGreaterThanOrEqual(0);
        expect(s.grossEarnings).toBe(wage);
      }
    });

    it('rejects invalid wages', () => {
      expect(() => calculateSalary(0)).toThrow();
      expect(() => calculateSalary(-100)).toThrow();
      // @ts-expect-error intentionally wrong type
      expect(() => calculateSalary('abc')).toThrow();
    });
  });

  describe('Salary structure APIs', () => {
    it('admin creates a salary structure; employee payroll is read-only', async () => {
      const create = await request(app)
        .post(`/api/admin/payroll/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyWage: 50000 });

      expect(create.status).toBe(201);
      expect(create.body.data.salaryStructure.monthlyWage).toBe(50000);

      const duplicate = await request(app)
        .post(`/api/admin/payroll/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyWage: 50000 });
      expect(duplicate.status).toBe(409);

      const me = await request(app)
        .get('/api/payroll/me')
        .set('Authorization', `Bearer ${empToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.currency).toBe('INR');
      expect(me.body.data.components.netPay).toBe(46800);
    });

    it('ignores client-submitted component values and recalculates from wage', async () => {
      await request(app)
        .put(`/api/admin/payroll/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyWage: 60000, basicSalary: 999999, netPay: 1 });

      const me = await request(app)
        .get('/api/payroll/me')
        .set('Authorization', `Bearer ${empToken}`);

      const expected = calculateSalary(60000);
      expect(me.body.data.components.basicSalary).toBe(expected.basicSalary);
      expect(me.body.data.components.netPay).toBe(expected.netPay);
      expect(me.body.data.components.basicSalary).not.toBe(999999);
    });

    it('audits every salary change with actor and old/new wage', async () => {
      const audits = await prisma.salaryAudit.findMany({
        where: { structure: { employeeId: empId } },
        orderBy: { createdAt: 'asc' },
      });
      expect(audits.length).toBe(2);
      expect(audits[0].action).toBe('CREATE');
      expect(audits[0].newWage).toBe(50000);
      expect(audits[0].actorId).toBe(adminId);
      expect(audits[1].action).toBe('UPDATE');
      expect(audits[1].oldWage).toBe(50000);
      expect(audits[1].newWage).toBe(60000);
    });

    it('blocks employees from admin payroll APIs and other employees salary data', async () => {
      const listAll = await request(app)
        .get('/api/admin/payroll')
        .set('Authorization', `Bearer ${empToken}`);
      expect(listAll.status).toBe(403);

      const viewOther = await request(app)
        .get(`/api/admin/payroll/${empId}`)
        .set('Authorization', `Bearer ${empToken}`);
      expect(viewOther.status).toBe(403);

      const createByEmployee = await request(app)
        .post(`/api/admin/payroll/${empId}`)
        .set('Authorization', `Bearer ${empToken}`)
        .send({ monthlyWage: 1 });
      expect(createByEmployee.status).toBe(403);
    });

    it('rejects invalid wages on structure creation', async () => {
      const res = await request(app)
        .post('/api/admin/payroll/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyWage: -5 });
      expect(res.status).toBe(400);
    });
  });

  describe('Attendance + approved leave -> payable days -> payslip', () => {
    beforeAll(async () => {
      // August 2026: 21 working days (Aug 1 is Saturday).
      // Aug 3-4 (Mon-Tue): APPROVED paid PTO.
      // Aug 5 (Wed): APPROVED unpaid leave.
      // Aug 6 (Thu): attendance ABSENT.
      // Aug 7 (Fri): missing attendance entirely.
      // Remaining 16 working days: PRESENT.
      const year = 2026;
      const presentDays: string[] = [];
      for (let day = 1; day <= 31; day++) {
        const d = new Date(Date.UTC(year, 7, day));
        const dow = d.getUTCDay();
        if (dow === 0 || dow === 6) continue;
        const key = d.toISOString().slice(0, 10);
        if (['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].includes(key)) continue;
        presentDays.push(key);
      }

      await prisma.attendance.createMany({
        data: [
          ...presentDays.map((date) => ({
            employeeId: empId,
            date,
            status: 'PRESENT',
            workHours: 8,
          })),
          { employeeId: empId, date: '2026-08-06', status: 'ABSENT' },
          // Conflicting ABSENT row under an APPROVED paid leave day must still be payable.
          { employeeId: empId, date: '2026-08-04', status: 'ABSENT' },
        ],
      });

      await prisma.leaveRequest.createMany({
        data: [
          {
            employeeId: empId,
            leaveType: 'PTO',
            startDate: new Date('2026-08-03T00:00:00.000Z'),
            endDate: new Date('2026-08-04T00:00:00.000Z'),
            requestedDays: 2,
            status: 'APPROVED',
            decidedById: adminId,
            decidedAt: new Date(),
          },
          {
            employeeId: empId,
            leaveType: 'UNPAID',
            startDate: new Date('2026-08-05T00:00:00.000Z'),
            endDate: new Date('2026-08-05T00:00:00.000Z'),
            requestedDays: 1,
            status: 'APPROVED',
            decidedById: adminId,
            decidedAt: new Date(),
          },
        ],
      });
    });

    it('employee sees transparent payable-days breakdown for own data', async () => {
      const res = await request(app)
        .get('/api/payroll/me/payable-days?month=2026-08')
        .set('Authorization', `Bearer ${empToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.workingDays).toBe(21);
      expect(d.presentDays).toBe(16);
      expect(d.paidLeaveDays).toBe(2);
      expect(d.unpaidLeaveDays).toBe(1);
      expect(d.absentDays).toBe(2);
      expect(d.payableDays).toBe(18);
    });

    it('admin generates a payslip using backend-computed payable days only', async () => {
      const gen = await request(app)
        .post(`/api/admin/payroll/${empId}/generate-payslip`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: '2026-08' });

      expect(gen.status).toBe(201);
      const payslip = gen.body.data.payslip;
      expect(payslip.workingDays).toBe(21);
      expect(payslip.payableDays).toBe(18);
      expect(payslip.monthlyWage).toBe(60000);
      expect(payslip.grossEarnings).toBe(60000);
      expect(payslip.netPay).toBe(calculateSalary(60000).netPay);

      // Regeneration overwrites the same period instead of duplicating.
      const regen = await request(app)
        .post(`/api/admin/payroll/${empId}/generate-payslip`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: '2026-08' });
      expect(regen.status).toBe(201);
      const count = await prisma.payslip.count({ where: { employeeId: empId } });
      expect(count).toBe(1);
    });

    it('employee reads own payslip and gets PAYSLIP_AVAILABLE notification', async () => {
      const slip = await request(app)
        .get('/api/payroll/payslip?year=2026&month=8')
        .set('Authorization', `Bearer ${empToken}`);
      expect(slip.status).toBe(200);
      expect(slip.body.data.payslip.payableDays).toBe(18);

      const empUser = await prisma.employee.findUnique({ where: { id: empId } });
      const notif = await prisma.notification.findFirst({
        where: { recipientUserId: empUser!.userId, type: 'PAYSLIP_AVAILABLE' },
      });
      expect(notif).not.toBeNull();
    });

    it('returns 404 for missing payslip periods', async () => {
      const res = await request(app)
        .get('/api/payroll/payslip?year=2030&month=1')
        .set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(404);
    });
  });
});
