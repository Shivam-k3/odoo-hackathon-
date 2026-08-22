import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../models/prisma';
import { generateLoginId } from './loginId.service';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
  employee: {
    id: string;
    loginId: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string | null;
    designation?: string | null;
    profilePicture?: string | null;
  };
}

export class AuthService {
  /**
   * Generates JWT token for authenticated user
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  }

  /**
   * Registers a new user and associated employee profile.
   * Ensures password hashing and algorithmic Login ID generation.
   */
  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    designation?: string;
    joiningDate?: string;
    role?: 'EMPLOYEE' | 'ADMIN_HR';
  }): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw { statusCode: 409, message: 'An account with this email already exists' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const joiningDateObj = data.joiningDate ? new Date(data.joiningDate) : new Date();
    const loginId = await generateLoginId(data.firstName, data.lastName, joiningDateObj);

    // Secure role assignment: default to EMPLOYEE unless explicitly provided by authorized caller
    const assignedRole = data.role === 'ADMIN_HR' ? 'ADMIN_HR' : 'EMPLOYEE';

    // Create user and employee in database transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: assignedRole,
          status: 'ACTIVE',
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
          department: data.department || null,
          designation: data.designation || null,
          joiningDate: joiningDateObj,
        },
      });

      return { user, employee };
    });

    const token = this.generateToken(result.user);

    return {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
      },
      employee: {
        id: result.employee.id,
        loginId: result.employee.loginId,
        firstName: result.employee.firstName,
        lastName: result.employee.lastName,
        email: result.employee.email,
        department: result.employee.department,
        designation: result.employee.designation,
        profilePicture: result.employee.profilePicture,
      },
    };
  }

  /**
   * Authenticates user using either Login ID or Email + Password.
   */
  async login(loginIdentifier: string, password: string): Promise<AuthResult> {
    const cleanIdentifier = loginIdentifier.trim();

    let user = null;
    let employee = null;

    // Check if identifier is an email or login ID
    if (cleanIdentifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: cleanIdentifier.toLowerCase() },
        include: { employee: true },
      });
      employee = user?.employee || null;
    } else {
      // Find employee by login ID first, then fetch associated user
      employee = await prisma.employee.findUnique({
        where: { loginId: cleanIdentifier.toUpperCase() },
        include: { user: true },
      });
      user = employee?.user || null;
    }

    if (!user || !employee) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (user.status !== 'ACTIVE') {
      throw { statusCode: 403, message: `Account is ${user.status.toLowerCase()}. Please contact administrator.` };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      employee: {
        id: employee.id,
        loginId: employee.loginId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        profilePicture: employee.profilePicture,
      },
    };
  }

  /**
   * Retrieves profile of current authenticated user
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePicture: true,
            department: true,
            designation: true,
            joiningDate: true,
            address: true,
            dob: true,
            gender: true,
            about: true,
            skills: true,
            certifications: true,
            salary: true,
          },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Hide salary for non-admin if employee queries self through this endpoint
    let sanitizedEmployee = user.employee;
    if (sanitizedEmployee && user.role !== 'ADMIN_HR') {
      const { salary, ...rest } = sanitizedEmployee;
      sanitizedEmployee = rest as any;
    }

    // Parse JSON skills and certifications if stored as JSON string
    if (sanitizedEmployee) {
      sanitizedEmployee = {
        ...sanitizedEmployee,
        skills: sanitizedEmployee.skills ? JSON.parse(sanitizedEmployee.skills) : [],
        certifications: sanitizedEmployee.certifications ? JSON.parse(sanitizedEmployee.certifications) : [],
      };
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      employee: sanitizedEmployee,
    };
  }
}

export const authService = new AuthService();
