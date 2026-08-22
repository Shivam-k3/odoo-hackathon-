import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';
import { getTodayDateString } from '../src/utils/dateUtils';

describe('Attendance System Tests', () => {
  let employee1Token: string;
  let employee1Id: string;
  let employee2Token: string;
  let employee2Id: string;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();

    // 1. Setup Employee 1
    const emp1Res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'emp1@dayflow.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });
    employee1Token = emp1Res.body.data.token;
    employee1Id = emp1Res.body.data.employee.id;

    // 2. Setup Employee 2
    const emp2Res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'emp2@dayflow.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
      });
    employee2Token = emp2Res.body.data.token;
    employee2Id = emp2Res.body.data.employee.id;

    // 3. Setup Admin
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'admin.att@dayflow.com',
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'Officer',
      });

    await prisma.user.update({
      where: { email: 'admin.att@dayflow.com' },
      data: { role: 'ADMIN_HR' },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'admin.att@dayflow.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Check-In Flow & Validation', () => {
    it('1. should record check-in for authenticated employee', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(employee1Id);
      expect(res.body.data.status).toBe('PRESENT');
      expect(res.body.data.checkInTime).toBeDefined();
    });

    it('2. should prevent duplicate check-in on the same day', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already checked in');
    });

    it('3. should reject check-out for employee who has not checked in (Employee 2)', async () => {
      const res = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No active check-in found');
    });
  });

  describe('Check-Out Flow & Work Hours Calculation', () => {
    it('4. should record check-out and calculate work hours & overtime', async () => {
      // Simulate check-in 9 hours ago in database
      const today = getTodayDateString();
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);

      await prisma.attendance.update({
        where: {
          employeeId_date: {
            employeeId: employee1Id,
            date: today,
          },
        },
        data: {
          checkInTime: nineHoursAgo,
        },
      });

      const res = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOutTime).toBeDefined();
      expect(res.body.data.workHours).toBeGreaterThanOrEqual(8.9);
      expect(res.body.data.extraHours).toBeGreaterThanOrEqual(0.9);
      expect(res.body.data.status).toBe('PRESENT');
    });

    it('5. should prevent duplicate check-out', async () => {
      const res = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already checked out');
    });
  });

  describe('Employee Attendance Self-Service & Isolation', () => {
    it('6. should retrieve today\'s attendance status for employee', async () => {
      const res = await request(app)
        .get('/api/attendance/me/today')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(employee1Id);
      expect(res.body.data.checkInTime).toBeDefined();
      expect(res.body.data.checkOutTime).toBeDefined();
    });

    it('7. should retrieve weekly and monthly attendance for employee', async () => {
      const weeklyRes = await request(app)
        .get('/api/attendance/me/weekly')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(weeklyRes.status).toBe(200);
      expect(weeklyRes.body.success).toBe(true);
      expect(weeklyRes.body.data.records.length).toBeGreaterThanOrEqual(1);

      const monthlyRes = await request(app)
        .get('/api/attendance/me/monthly')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(monthlyRes.status).toBe(200);
      expect(monthlyRes.body.success).toBe(true);
      expect(monthlyRes.body.data.stats.presentDays).toBe(1);
    });

    it('8. should prohibit employee from accessing Admin attendance endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/attendance/admin/all')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('Admin Attendance Overview & Analytics', () => {
    it('9. should allow Admin to get company-wide attendance', async () => {
      const res = await request(app)
        .get('/api/attendance/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records.length).toBeGreaterThanOrEqual(1);
    });

    it('10. should allow Admin to get today\'s roster & counts', async () => {
      const res = await request(app)
        .get('/api/attendance/admin/today')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toHaveProperty('presentCount');
      expect(res.body.data.summary).toHaveProperty('absentCount');
      expect(res.body.data.summary).toHaveProperty('checkedInCount');
    });

    it('11. should allow Admin to view specific employee\'s attendance history', async () => {
      const res = await request(app)
        .get(`/api/attendance/admin/employee/${employee1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee.id).toBe(employee1Id);
      expect(res.body.data.records.length).toBeGreaterThanOrEqual(1);
    });

    it('12. should allow Admin to get monthly attendance summary and statistics', async () => {
      const res = await request(app)
        .get('/api/attendance/admin/monthly-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.aggregateStats).toHaveProperty('totalWorkHours');
      expect(res.body.data.aggregateStats).toHaveProperty('presentTotal');
    });
  });
});
