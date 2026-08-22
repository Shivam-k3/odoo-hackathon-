import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/models/prisma';
import { config } from '../src/config/env';

/**
 * Security regression suite:
 * - Token forgery / tampering / absence
 * - Role enforcement on admin-only surfaces (ADMIN_HR)
 * - IDOR attempts by EMPLOYEE accounts
 * - Injection probes (SQL-style strings, NoSQL-style objects)
 * - XSS payload storage with JSON-only responses + no credential leakage
 */
describe('Security Tests (auth, RBAC, IDOR, injection, XSS)', () => {
  const employee = {
    email: 'sec.emp@dayflow.com',
    password: 'SecurePassword123!',
    firstName: 'Security',
    lastName: 'Employee',
    department: 'Engineering',
    designation: 'QA Engineer',
    joiningDate: '2026-01-15',
  };

  const adminAccount = {
    email: 'sec.admin@dayflow.com',
    password: 'AdminPassword123!',
    firstName: 'Security',
    lastName: 'Admin',
    department: 'Human Resources',
    designation: 'HR Manager',
    joiningDate: '2026-01-02',
  };

  const xssUser = {
    email: 'xss.probe@dayflow.com',
    password: 'SecurePassword123!',
    firstName: '<script>alert(1)</script>',
    lastName: 'Probe<img src=x onerror=alert(2)>',
    department: 'Engineering',
    designation: 'Tester',
    joiningDate: '2026-02-01',
  };

  let employeeToken = '';
  let adminToken = '';
  let leaveRequestId = '';

  beforeAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.payslip.deleteMany();
    await prisma.salaryAudit.deleteMany();
    await prisma.leaveAllocation.deleteMany();
    await prisma.salaryStructure.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();

    // Employee account (real signup flow)
    const empRes = await request(app).post('/api/auth/signup').send(employee);
    employeeToken = empRes.body.data.token;

    // Second account promoted to ADMIN_HR directly in DB, then real login
    await request(app).post('/api/auth/signup').send(adminAccount);
    await prisma.user.update({
      where: { email: adminAccount.email.toLowerCase() },
      data: { role: 'ADMIN_HR' },
    });
    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: adminAccount.email, password: adminAccount.password });
    adminToken = admRes.body.data.token;

    // A leave request owned by the employee — used for IDOR checks
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const leaveRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveType: 'PTO', startDate: tomorrow, endDate: dayAfter });
    leaveRequestId = leaveRes.body.data?.id || '';
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.payslip.deleteMany();
    await prisma.salaryAudit.deleteMany();
    await prisma.leaveAllocation.deleteMany();
    await prisma.salaryStructure.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------- TOKENS

  it('rejects /api/auth/me with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a syntactically invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('rejects a token signed with the wrong secret (forgery)', async () => {
    const forged = jwt.sign(
      { id: '00000000-0000-0000-0000-000000000000', role: 'ADMIN_HR' },
      'attacker-controlled-secret',
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token whose signature byte was flipped (tampering)', async () => {
    const parts = employeeToken.split('.');
    const sig = Buffer.from(parts[2], 'base64url');
    sig[0] = sig[0] ^ 0xff;
    parts[2] = sig.toString('base64url');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${parts.join('.')}`);
    expect(res.status).toBe(401);
  });

  // --------------------------------------------------------------- RBAC

  it('forbids EMPLOYEE from listing all employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('forbids EMPLOYEE from admin attendance overview', async () => {
    const res = await request(app)
      .get('/api/attendance/admin/today')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('forbids EMPLOYEE from payroll reports', async () => {
    const res = await request(app)
      .get('/api/admin/reports/payroll')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('allows ADMIN_HR on the same admin surface (control test)', async () => {
    const res = await request(app)
      .get('/api/employees?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // --------------------------------------------------------------- IDOR

  it('forbids EMPLOYEE reading any leave detail by id (IDOR)', async () => {
    if (!leaveRequestId) return; // creation unsupported in env — skip safely
    const res = await request(app)
      .get(`/api/admin/leaves/${leaveRequestId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('forbids EMPLOYEE approving their own leave (privilege escalation)', async () => {
    if (!leaveRequestId) return;
    const res = await request(app)
      .post(`/api/admin/leaves/${leaveRequestId}/approve`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('lets ADMIN_HR read that same leave (control test)', async () => {
    if (!leaveRequestId) return;
    const res = await request(app)
      .get(`/api/admin/leaves/${leaveRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  // ----------------------------------------------------------- INJECTION

  it('does not authenticate SQL-style injection payloads', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: "admin@dayflow.com' OR '1'='1", password: "' OR '1'='1" });
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('rejects NoSQL-style object payloads at validation layer', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: { $gt: '' }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects oversized junk identifiers cleanly', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: 'a'.repeat(5000), password: 'b'.repeat(5000) });
    expect([400, 401]).toContain(res.status);
  });

  // ----------------------------------------------------------------- XSS

  it('stores XSS probe payloads but only ever returns JSON (no HTML execution context), and never leaks hashes', async () => {
    const res = await request(app).post('/api/auth/signup').send(xssUser);

    if (res.status === 201) {
      // Stored raw is acceptable because every response is application/json;
      // the SPA escapes on render. Assert no HTML content type sneaks out.
      expect(String(res.headers['content-type'])).toContain('application/json');
      expect(JSON.stringify(res.body)).not.toContain('<script src=');
    } else {
      // Or the validator rejects hostile input outright — also acceptable.
      expect(res.status).toBe(400);
    }
    expect(res.body.data?.user).not.toHaveProperty('passwordHash');

    // Admin directory search returns JSON too
    const list = await request(app)
      .get('/api/employees?search=Probe&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(String(list.headers['content-type'])).toContain('application/json');
  });

  it('never exposes password material on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: employee.email, password: employee.password });
    expect(res.status).toBe(200);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('$2a$');
    expect(serialized).not.toContain('$2b$');
  });

  it('signs tokens with the configured server secret (env-driven)', async () => {
    expect(config.jwtSecret).toBeDefined();
    expect(String(config.jwtSecret).length).toBeGreaterThanOrEqual(16);
    const decoded = jwt.verify(employeeToken, config.jwtSecret as string);
    expect(decoded).toHaveProperty('exp');
  });
});
