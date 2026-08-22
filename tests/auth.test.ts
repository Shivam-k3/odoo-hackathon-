import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';

describe('Authentication & User Management Tests', () => {
  beforeAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  const testUser = {
    email: 'alice.smith@dayflow.com',
    password: 'SecurePassword123!',
    firstName: 'Alice',
    lastName: 'Smith',
    phone: '+1234567890',
    department: 'Engineering',
    designation: 'Software Engineer',
    joiningDate: '2026-01-10',
  };

  let registeredLoginId = '';
  let authToken = '';

  it('1. should register a new user with generated Login ID and hashed password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.role).toBe('EMPLOYEE');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('password');

    expect(res.body.data.employee.loginId).toMatch(/^OI[A-Z]{4}\d{8}$/);
    expect(res.body.data.employee.firstName).toBe(testUser.firstName);

    registeredLoginId = res.body.data.employee.loginId;
    authToken = res.body.data.token;
  });

  it('2. should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('3. should authenticate successfully using Email and Password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.employee.loginId).toBe(registeredLoginId);
  });

  it('4. should authenticate successfully using Dayflow Login ID and Password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: registeredLoginId,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.employee.loginId).toBe(registeredLoginId);
  });

  it('5. should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('6. should reject login with non-existent user identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'nonexistent@dayflow.com',
        password: 'Password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('7. should reject login if account is inactive', async () => {
    // Set user to INACTIVE in DB
    await prisma.user.update({
      where: { email: testUser.email.toLowerCase() },
      data: { status: 'INACTIVE' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('inactive');

    // Restore active status
    await prisma.user.update({
      where: { email: testUser.email.toLowerCase() },
      data: { status: 'ACTIVE' },
    });
  });

  it('8. should return authenticated user profile on /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.employee.loginId).toBe(registeredLoginId);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('9. should reject /api/auth/me without authorization token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
