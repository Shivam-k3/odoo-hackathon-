import bcrypt from 'bcryptjs';
import { prisma } from '../models/prisma';
import { generateLoginId } from './loginId.service';
import { UpdateOwnProfileInput, AdminCreateEmployeeInput, AdminUpdateEmployeeInput } from '../validators/employee.validator';

export class EmployeeService {
  /**
   * Helper to format employee record with parsed skills and certifications JSON.
   */
  private formatEmployee(employee: any, includeSalary = true) {
    if (!employee) return null;
    const formatted = { ...employee };

    if (!includeSalary) {
      delete formatted.salary;
    }

    if (typeof formatted.skills === 'string') {
      try {
        formatted.skills = JSON.parse(formatted.skills);
      } catch {
        formatted.skills = [];
      }
    } else if (!formatted.skills) {
      formatted.skills = [];
    }

    if (typeof formatted.certifications === 'string') {
      try {
        formatted.certifications = JSON.parse(formatted.certifications);
      } catch {
        formatted.certifications = [];
      }
    } else if (!formatted.certifications) {
      formatted.certifications = [];
    }

    return formatted;
  }

  /**
   * Get employee profile for the authenticated employee (own profile).
   */
  async getOwnProfile(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee profile not found' };
    }

    // Do not expose salary on standard employee own profile query unless admin
    const isAdmin = employee.user.role === 'ADMIN_HR';
    return this.formatEmployee(employee, isAdmin);
  }

  /**
   * Update allowed fields of own profile by employee.
   * Whitelist enforced: address, phone, profilePicture, about, skills, certifications.
   * Modifying any unauthorized fields (salary, department, designation, etc.) is prohibited.
   */
  async updateOwnProfile(userId: string, data: UpdateOwnProfileInput) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee profile not found' };
    }

    // Whitelist only allowed fields
    const updateData: any = {};
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
    if (data.about !== undefined) updateData.about = data.about;
    if (data.skills !== undefined) updateData.skills = data.skills ? JSON.stringify(data.skills) : null;
    if (data.certifications !== undefined) {
      updateData.certifications = data.certifications ? JSON.stringify(data.certifications) : null;
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return this.formatEmployee(updated, false);
  }

  /**
   * Admin: Get all employees with filtering, searching, and pagination.
   */
  async getAllEmployees(options: {
    query?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.department) {
      where.department = options.department;
    }

    if (options.query) {
      const q = options.query.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { loginId: { contains: q } },
        { department: { contains: q } },
        { designation: { contains: q } },
      ];
    }

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      employees: employees.map((emp) => this.formatEmployee(emp, true)),
    };
  }

  /**
   * Admin: Get single employee by ID.
   */
  async getEmployeeById(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    return this.formatEmployee(employee, true);
  }

  /**
   * Admin: Create a new employee with user account and generated Login ID.
   */
  async adminCreateEmployee(data: AdminCreateEmployeeInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw { statusCode: 409, message: 'An account with this email already exists' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const joiningDateObj = data.joiningDate ? new Date(data.joiningDate) : new Date();
    const dobObj = data.dob ? new Date(data.dob) : null;

    const loginId = await generateLoginId(data.firstName, data.lastName, joiningDateObj);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role || 'EMPLOYEE',
          status: data.status || 'ACTIVE',
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          loginId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          profilePicture: data.profilePicture || null,
          department: data.department || null,
          designation: data.designation || null,
          joiningDate: joiningDateObj,
          address: data.address || null,
          dob: dobObj,
          gender: data.gender || null,
          about: data.about || null,
          skills: data.skills ? JSON.stringify(data.skills) : null,
          certifications: data.certifications ? JSON.stringify(data.certifications) : null,
          salary: data.salary || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return employee;
    });

    return this.formatEmployee(result, true);
  }

  /**
   * Admin: Update employee record (all organizational, payroll, and personal fields).
   */
  async adminUpdateEmployee(employeeId: string, data: AdminUpdateEmployeeInput) {
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!existingEmployee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.joiningDate !== undefined) updateData.joiningDate = new Date(data.joiningDate);
    if (data.address !== undefined) updateData.address = data.address;
    if (data.dob !== undefined) updateData.dob = data.dob ? new Date(data.dob) : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.about !== undefined) updateData.about = data.about;
    if (data.skills !== undefined) updateData.skills = data.skills ? JSON.stringify(data.skills) : null;
    if (data.certifications !== undefined) {
      updateData.certifications = data.certifications ? JSON.stringify(data.certifications) : null;
    }
    if (data.salary !== undefined) updateData.salary = data.salary;

    // Handle email change if provided
    if (data.email && data.email.toLowerCase() !== existingEmployee.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailConflict) {
        throw { statusCode: 409, message: 'Email is already in use by another user' };
      }
      updateData.email = data.email.toLowerCase();
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update User if role, status, or email changed
      if (data.role || data.status || updateData.email) {
        await tx.user.update({
          where: { id: existingEmployee.userId },
          data: {
            ...(data.role && { role: data.role }),
            ...(data.status && { status: data.status }),
            ...(updateData.email && { email: updateData.email }),
          },
        });
      }

      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return updated;
    });

    return this.formatEmployee(result, true);
  }
}

export const employeeService = new EmployeeService();
