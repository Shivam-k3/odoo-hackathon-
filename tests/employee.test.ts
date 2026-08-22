import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/models/prisma';

describe('Employee Management & Profile Permissions Tests', () => {
  let employeeToken: string;
  let employeeId: string;
  let adminToken: string;
  let adminId: string;
  let secondEmployeeId: string;

  beforeAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();

    // 1. Create standard employee
    const empRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'bob.builder@dayflow.com',
        password: 'Password123!',
        firstName: 'Bob',
        lastName: 'Builder',
        department: 'Operations',
        designation: 'Engineer',
      });
    employeeToken = empRes.body.data.token;
    employeeId = empRes.body.data.employee.id;

    // 2. Create second employee
    const emp2Res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'charlie.brown@dayflow.com',
        password: 'Password123!',
        firstName: 'Charlie',
        lastName: 'Brown',
        department: 'Finance',
        designation: 'Accountant',
      });
    secondEmployeeId = emp2Res.body.data.employee.id;

    // 3. Create Admin/HR user
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'admin.hr@dayflow.com',
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'Manager',
        role: 'ADMIN_HR',
      });

    // Elevate admin role explicitly in DB to verify backend authorization
    await prisma.user.update({
      where: { email: 'admin.hr@dayflow.com' },
      data: { role: 'ADMIN_HR' },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'admin.hr@dayflow.com',
        password: 'AdminPassword123!',
      });

    adminToken = adminLogin.body.data.token;
    adminId = adminLogin.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Employee Self-Service Profile Access & Permissions', () => {
    it('1. should allow employee to get their own profile', async () => {
      const res = await request(app)
        .get('/api/employees/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Bob');
      expect(res.body.data.email).toBe('bob.builder@dayflow.com');
      expect(res.body.data).not.toHaveProperty('salary'); // Protected from standard view
    });

    it('2. should allow employee to update allowed profile fields (address, phone, skills, about)', async () => {
      const updateData = {
        phone: '+91 9876543210',
        address: '123 Tech Park, Bangalore',
        about: 'Passionate full-stack software engineer.',
        skills: ['TypeScript', 'Express', 'Prisma', 'React'],
        certifications: ['Odoo Certified Developer'],
      };

      const res = await request(app)
        .put('/api/employees/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(updateData.phone);
      expect(res.body.data.address).toBe(updateData.address);
      expect(res.body.data.about).toBe(updateData.about);
      expect(res.body.data.skills).toEqual(updateData.skills);
      expect(res.body.data.certifications).toEqual(updateData.certifications);
    });

    it('3. should prohibit employee from modifying restricted administrative fields (salary, department, role)', async () => {
      const attemptedHack = {
        salary: 1000000,
        department: 'Executive Board',
        role: 'ADMIN_HR',
      };

      const res = await request(app)
        .put('/api/employees/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(attemptedHack);

      // Verify department and salary did not change in DB
      const dbEmp = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { user: true },
      });

      expect(dbEmp?.department).toBe('Operations'); // Unchanged
      expect(dbEmp?.salary).toBeNull(); // Unchanged
      expect(dbEmp?.user.role).toBe('EMPLOYEE'); // Unchanged
    });

    it('4. should block employee from accessing Admin employee listing (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('5. should block employee from accessing another employee record directly by ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/employees/${secondEmployeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Employee Management APIs', () => {
    it('6. should allow Admin to list all employees with pagination & search', async () => {
      const res = await request(app)
        .get('/api/employees?query=Bob')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employees.length).toBe(1);
      expect(res.body.data.employees[0].firstName).toBe('Bob');
    });

    it('7. should allow Admin to get employee by ID with full administrative fields', async () => {
      const res = await request(app)
        .get(`/api/employees/${secondEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(secondEmployeeId);
      expect(res.body.data.firstName).toBe('Charlie');
    });

    it('8. should allow Admin to create a new employee with salary and role', async () => {
      const newEmpData = {
        email: 'david.miller@dayflow.com',
        password: 'Password123!',
        firstName: 'David',
        lastName: 'Miller',
        department: 'Human Resources',
        designation: 'HR Specialist',
        salary: 75000,
        role: 'EMPLOYEE',
      };

      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmpData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(newEmpData.email.toLowerCase());
      expect(res.body.data.salary).toBe(75000);
      expect(res.body.data.loginId).toMatch(/^OI[A-Z]{4}\d{8}$/);
    });

    it('9. should allow Admin to update employee department and salary', async () => {
      const res = await request(app)
        .put(`/api/employees/${secondEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department: 'Senior Finance',
          designation: 'Lead Financial Analyst',
          salary: 95000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.department).toBe('Senior Finance');
      expect(res.body.data.salary).toBe(95000);
    });
  });
});
