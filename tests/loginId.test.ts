import { getCompanyPrefix, getNameInitials, generateLoginId } from '../src/services/loginId.service';
import { prisma } from '../src/models/prisma';

describe('Dayflow Login ID Generator Tests', () => {
  beforeAll(async () => {
    // Clean up test data
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

  describe('Company Prefix Extraction', () => {
    it('should derive prefix from first letters of two words', () => {
      expect(getCompanyPrefix('Odoo India')).toBe('OI');
      expect(getCompanyPrefix('Dayflow Technologies')).toBe('DT');
      expect(getCompanyPrefix('Acme Corp')).toBe('AC');
    });

    it('should handle single word company names', () => {
      expect(getCompanyPrefix('Dayflow')).toBe('DA');
      expect(getCompanyPrefix('Odoo')).toBe('OD');
    });
  });

  describe('Name Initials Extraction', () => {
    it('should derive 2 letters from first name and 2 from last name', () => {
      expect(getNameInitials('John', 'Doe')).toBe('JODO');
      expect(getNameInitials('Alex', 'Smith')).toBe('ALSM');
      expect(getNameInitials('Raj', 'Kumar')).toBe('RAKU');
    });

    it('should pad with X if names are shorter than 2 characters', () => {
      expect(getNameInitials('A', 'B')).toBe('AXBX');
      expect(getNameInitials('Al', 'S')).toBe('ALSX');
    });
  });

  describe('Login ID Generation & Sequential Collision Prevention', () => {
    it('should generate properly formatted Login ID (OIJODO20260001)', async () => {
      const joiningDate = new Date('2026-06-15');
      const loginId = await generateLoginId('John', 'Doe', joiningDate, 'Odoo India');
      expect(loginId).toBe('OIJODO20260001');
    });

    it('should increment serial number for same initials and year', async () => {
      const joiningDate = new Date('2026-06-15');

      // Create first user in DB to occupy 0001
      const u1 = await prisma.user.create({
        data: {
          email: 'johndoe1@example.com',
          passwordHash: 'hashed1',
          role: 'EMPLOYEE',
        },
      });

      await prisma.employee.create({
        data: {
          userId: u1.id,
          loginId: 'OIJODO20260001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'johndoe1@example.com',
          joiningDate,
        },
      });

      // Next generation should be 0002
      const nextId = await generateLoginId('John', 'Doe', joiningDate, 'Odoo India');
      expect(nextId).toBe('OIJODO20260002');
    });
  });
});
