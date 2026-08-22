import { z } from 'zod';

// Allowed fields for an employee updating their own profile
export const updateOwnProfileSchema = z.object({
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  profilePicture: z.string().url('Invalid URL for profile picture').or(z.string()).optional().nullable(),
  about: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  certifications: z.array(z.string()).optional().nullable(),
});

// Admin creating a new employee
export const adminCreateEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  joiningDate: z.string().optional(),
  address: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  certifications: z.array(z.string()).optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  role: z.enum(['EMPLOYEE', 'ADMIN_HR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
});

// Admin updating an existing employee
export const adminUpdateEmployeeSchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  joiningDate: z.string().optional(),
  address: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  certifications: z.array(z.string()).optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  role: z.enum(['EMPLOYEE', 'ADMIN_HR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
});

export const searchEmployeeQuerySchema = z.object({
  query: z.string().optional(),
  department: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type AdminCreateEmployeeInput = z.infer<typeof adminCreateEmployeeSchema>;
export type AdminUpdateEmployeeInput = z.infer<typeof adminUpdateEmployeeSchema>;
