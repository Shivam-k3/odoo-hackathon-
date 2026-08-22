import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';
import { getTodayDateString } from '../src/utils/dateUtils';

describe('Admin Dashboard Analytics and Reports Tests', () => {
  let adminToken = '';
  let adminId = '';
  let emp1Token = '';
  let emp1Id = '';
  let emp2Token = '';
  let emp2Id = '';
  const today = getTodayDateString();
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

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
        email: 'dash.admin@dayflow.com',
        password: 'Admin@123',
        firstName: 'Divya',
        lastName: 'Shah',
        role: 'ADMIN_HR',
      });
    adminToken = admin.body.data.token;
    adminId = admin.body.data.user.id;

    const emp1 = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'dash.emp1@dayflow.com',
        password: 'Emp@12345',
        firstName: 'Karan',
        lastName: 'Patel',
        department: 'Engineering',
      });
    emp1Token = emp1.body.data.token;
    emp1Id = emp1.body.data.employee.id;

    const emp2 = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'dash.emp2@dayflow.com',
        password: 'Emp@12345',
        firstName: 'Meera',
        lastName: 'Iyer',
        department: 'Sales',
      });
    emp2Token = emp2.body.data.token;
    emp2Id = emp2.body.data.employee.id;

    // Attendance: emp1 present today + absent yesterday; emp2 half-day today.
    await prisma.attendance.createMany({
      data: [
        { employeeId: emp1Id, date: today, status: 'PRESENT', workHours: 8, extraHours: 1 },
        { employeeId: emp1Id, date: yesterday, status: 'ABSENT' },
        { employeeId: emp2Id, date: today, status: 'HALF_DAY', workHours: 4 },
      ],
    });

    // Approved sick leave for emp1 covering today; pending PTO for emp2.
    await prisma.leaveRequest.createMany({
      data: [
        {
          employeeId: emp1Id,
          leaveType: 'SICK',
          startDate: new Date(`${today}T00:00:00.000Z`),
          endDate: new Date(`${today}T00:00:00.000Z`),
          requestedDays: 1,
          remarks: 'Not feeling well',
          attachment: '/uploads/leaves/seeded-cert.pdf',
          status: 'APPROVED',
          decidedById: adminId,
          decidedAt: new Date(),
        },
        {
          employeeId: emp2Id,
          leaveType: 'PTO',
          startDate: new Date('2026-12-20T00:00:00.000Z'),
          endDate: new Date('2026-12-22T00:00:00.000Z'),
          requestedDays: 3,
          status: 'PENDING',
        },
      ],
    });

    // One payslip for the current month for payroll summary/report.
    await prisma.salaryStructure.create({
      data: {
        employeeId: emp1Id,
        monthlyWage: 50000,
        effectiveFrom: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`),
        createdById: adminId,
      },
    });
    await prisma.payslip.create({
      data: {
        employeeId: emp1Id,
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
        workingDays: 21,
        presentDays: 16,
        paidLeaveDays: 2,
        unpaidLeaveDays: 1,
        payableDays: 18,
        monthlyWage: 50000,
        basicSalary: 25000,
        hra: 12500,
        standardAllowance: 4167.5,
        performanceBonus: 2082.5,
        lta: 2083.33,
        fixedAllowance: 4166.67,
        grossEarnings: 50000,
        employeePf: 3000,
        employerPf: 3000,
        professionalTax: 200,
        netPay: 46800,
        generatedById: adminId,
      },
    });
  });

  afterAll(async () => {
    await cleanAll();
    await prisma.$disconnect();
  });

  describe('Dashboard analytics (all values from live DB)', () => {
    it('returns correct aggregated metrics for ADMIN_HR', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      // Admin accounts also carry an employee profile (Member 1 signup creates one for every user).
      expect(d.employees.totalActive).toBe(3);
      expect(d.employees.presentToday).toBe(1);
      expect(d.employees.halfDayToday).toBe(1);
      expect(d.employees.onApprovedLeaveToday).toBe(1);
      // 2 active - 1 present - 1 half-day - 1 on-leave -> none left to be absent
      expect(d.employees.absentToday).toBe(0);
      expect(d.leaves.pendingRequests).toBe(1);
      expect(d.leaves.approvedTotal).toBe(1);
      expect(d.attendanceSummary.month).toBe(today.slice(0, 7));
      expect(d.attendanceSummary.present).toBeGreaterThanOrEqual(1);
      expect(d.payrollSummary.payslipsGenerated).toBe(1);
      expect(d.payrollSummary.totalNet).toBe(46800);
      expect(d.payrollSummary.currency).toBe('INR');
    });

    it('blocks employees and anonymous users from dashboard', async () => {
      const empRes = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${emp1Token}`);
      expect(empRes.status).toBe(403);

      const anonRes = await request(app).get('/api/admin/dashboard');
      expect(anonRes.status).toBe(401);
    });
  });

  describe('Reports with filters', () => {
    it('attendance report filters by status and department', async () => {
      const presentOnly = await request(app)
        .get('/api/admin/reports/attendance?status=PRESENT')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(presentOnly.status).toBe(200);
      expect(presentOnly.body.data.summary.present).toBe(1);

      const sales = await request(app)
        .get('/api/admin/reports/attendance?department=Sales')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(sales.body.data.records.length).toBe(1);
      expect(sales.body.data.records[0].employee.department).toBe('Sales');

      const ranged = await request(app)
        .get(`/api/admin/reports/attendance?from=${yesterday}&to=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(ranged.body.data.summary.totalRecords).toBe(3);
    });

    it('attendance report exports CSV', async () => {
      const res = await request(app)
        .get('/api/admin/reports/attendance?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Date,Login ID,Name,Department,Status');
    });

    it('leave report filters by type and status', async () => {
      const approvedSick = await request(app)
        .get('/api/admin/reports/leaves?status=APPROVED&leaveType=SICK')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approvedSick.status).toBe(200);
      expect(approvedSick.body.data.summary.approved).toBe(1);
      expect(approvedSick.body.data.summary.totalDaysRequested).toBe(1);

      const pending = await request(app)
        .get('/api/admin/reports/leaves?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pending.body.data.summary.pending).toBe(1);
    });

    it('payroll report returns stored payslips with component totals', async () => {
      const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const res = await request(app)
        .get(`/api/admin/reports/payroll?month=${monthKey}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.summary.payslipCount).toBe(1);
      expect(res.body.data.summary.totalGross).toBe(50000);
      expect(res.body.data.summary.totalNetPay).toBe(46800);
    });

    it('employee report searches by name and groups by department', async () => {
      const search = await request(app)
        .get('/api/admin/reports/employees?search=Meera')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(search.status).toBe(200);
      expect(search.body.data.totalEmployees).toBe(1);
      expect(search.body.data.byDepartment.Sales).toBe(1);
      // Salary must never leak through reports
      expect(JSON.stringify(search.body.data)).not.toContain('salary');
    });

    it('blocks employees from every report endpoint', async () => {
      for (const path of [
        '/api/admin/reports/attendance',
        '/api/admin/reports/leaves',
        '/api/admin/reports/payroll',
        '/api/admin/reports/employees',
      ]) {
        const res = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${emp1Token}`);
        expect([401, 403]).toContain(res.status);
      }
    });
  });
});
