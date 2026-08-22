import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';

describe('Leave Management Tests', () => {
  let adminToken = '';
  let adminId = '';
  let empToken = '';
  let emp2Token = '';
  let empId = '';
  let emp2Id = '';
  let ptoRequestId = '';

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
        email: 'leave.admin@dayflow.com',
        password: 'Admin@123',
        firstName: 'Asha',
        lastName: 'Rao',
        role: 'ADMIN_HR',
      });
    adminToken = admin.body.data.token;
    adminId = admin.body.data.user.id;

    const emp = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'leave.emp1@dayflow.com',
        password: 'Emp@12345',
        firstName: 'Ravi',
        lastName: 'Kumar',
        department: 'Engineering',
      });
    empToken = emp.body.data.token;
    empId = emp.body.data.employee.id;

    const emp2 = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'leave.emp2@dayflow.com',
        password: 'Emp@12345',
        firstName: 'Neha',
        lastName: 'Verma',
        department: 'Sales',
      });
    emp2Token = emp2.body.data.token;
    emp2Id = emp2.body.data.employee.id;
  });

  afterAll(async () => {
    await cleanAll();
    await prisma.$disconnect();
  });

  it('creates a PTO request and computes requestedDays server-side', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'PTO', startDate: '2026-09-01', endDate: '2026-09-05', remarks: 'Family function' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leaveRequest.requestedDays).toBe(5);
    expect(res.body.data.leaveRequest.status).toBe('PENDING');
    ptoRequestId = res.body.data.leaveRequest.id;
  });

  it('shows allocations with pending days reserved and correct remaining balance', async () => {
    const res = await request(app)
      .get('/api/leaves/allocations/me')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(200);
    const pto = res.body.data.allocations.find((a: any) => a.leaveType === 'PTO');
    expect(pto.entitled).toBe(12);
    expect(pto.pending).toBe(5);
    expect(pto.remaining).toBe(7);
    const unpaid = res.body.data.allocations.find((a: any) => a.leaveType === 'UNPAID');
    expect(unpaid.entitled).toBeNull();
    expect(unpaid.remaining).toBeNull();
  });

  it('rejects Sick Leave without medical certificate attachment', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'SICK', startDate: '2026-10-01', endDate: '2026-10-02' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/medical certificate/i);
  });

  it('accepts Sick Leave with medical certificate attachment', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .field('leaveType', 'SICK')
      .field('startDate', '2026-10-06')
      .field('endDate', '2026-10-07')
      .field('remarks', 'Fever')
      .attach('attachment', Buffer.from('%PDF-1.4 fake certificate'), {
        filename: 'certificate.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.leaveRequest.attachment).toContain('/uploads/leaves/');
    expect(res.body.data.leaveRequest.requestedDays).toBe(2);
  });

  it('rejects end date before start date', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'PTO', startDate: '2026-09-10', endDate: '2026-09-08' });

    expect(res.status).toBe(422);
  });

  it('rejects an invalid leave type', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'CASUAL', startDate: '2026-09-10', endDate: '2026-09-11' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('prevents overlapping leave requests', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'PTO', startDate: '2026-09-04', endDate: '2026-09-10' });

    expect(res.status).toBe(409);
  });

  it('prevents requesting more days than the remaining allocation', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveType: 'PTO', startDate: '2026-11-01', endDate: '2026-11-30' });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it('employee sees only their own requests', async () => {
    const res = await request(app)
      .get('/api/leaves/me')
      .set('Authorization', `Bearer ${emp2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);

    const other = await request(app)
      .get(`/api/leaves/${ptoRequestId}`)
      .set('Authorization', `Bearer ${emp2Token}`);
    expect(other.status).toBe(404);
  });

  it('blocks employees from admin leave APIs', async () => {
    const list = await request(app)
      .get('/api/admin/leaves')
      .set('Authorization', `Bearer ${empToken}`);
    expect(list.status).toBe(403);

    const approve = await request(app)
      .post(`/api/admin/leaves/${ptoRequestId}/approve`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(approve.status).toBe(403);
  });

  it('admin lists all requests with filters and views details', async () => {
    const list = await request(app)
      .get('/api/admin/leaves?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(2);
    expect(list.body.data.records[0].employee).toBeDefined();

    const detail = await request(app)
      .get(`/api/admin/leaves/${ptoRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.leaveRequest.employee.loginId).toBeDefined();
  });

  it('admin approves PTO, records actor/timestamp and updates allocation', async () => {
    const res = await request(app)
      .post(`/api/admin/leaves/${ptoRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Approved, enjoy!' });

    expect(res.status).toBe(200);
    expect(res.body.data.leaveRequest.status).toBe('APPROVED');
    expect(res.body.data.leaveRequest.decidedBy.email).toBe('leave.admin@dayflow.com');
    expect(res.body.data.leaveRequest.decidedAt).toBeDefined();
    expect(res.body.data.leaveRequest.adminComment).toBe('Approved, enjoy!');

    const alloc = await request(app)
      .get('/api/leaves/allocations/me')
      .set('Authorization', `Bearer ${empToken}`);
    const pto = alloc.body.data.allocations.find((a: any) => a.leaveType === 'PTO');
    expect(pto.used).toBe(5);
    expect(pto.remaining).toBe(7);
  });

  it('blocks double approval and approval-after-rejection transitions', async () => {
    const again = await request(app)
      .post(`/api/admin/leaves/${ptoRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(again.status).toBe(409);
    expect(again.body.message).toMatch(/invalid transition|already/i);

    const rejectAfterApprove = await request(app)
      .post(`/api/admin/leaves/${ptoRequestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(rejectAfterApprove.status).toBe(409);
  });

  it('admin rejects a request with comment while preserving history', async () => {
    const applyRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${emp2Token}`)
      .send({ leaveType: 'UNPAID', startDate: '2026-12-01', endDate: '2026-12-03', remarks: 'Personal' });
    const id = applyRes.body.data.leaveRequest.id;

    const res = await request(app)
      .post(`/api/admin/leaves/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Team deadline in that window' });

    expect(res.status).toBe(200);
    expect(res.body.data.leaveRequest.status).toBe('REJECTED');
    expect(res.body.data.leaveRequest.adminComment).toBe('Team deadline in that window');
    expect(res.body.data.leaveRequest.decidedAt).toBeDefined();
  });

  it('notifies admins on submission and employees on decision', async () => {
    const adminNotifications = await prisma.notification.findMany({
      where: { recipientUserId: adminId, type: 'LEAVE_SUBMITTED' },
    });
    expect(adminNotifications.length).toBeGreaterThanOrEqual(2);

    const empUser = await prisma.employee.findUnique({ where: { id: empId } });
    const empNotifications = await prisma.notification.findMany({
      where: { recipientUserId: empUser!.userId, type: 'LEAVE_APPROVED' },
    });
    expect(empNotifications.length).toBe(1);
  });
});
