import { z } from 'zod';

export const upsertSalarySchema = z.object({
  monthlyWage: z
    .number({ invalid_type_error: 'monthlyWage must be a number', required_error: 'monthlyWage is required' })
    .positive('monthlyWage must be greater than 0')
    .max(10000000, 'monthlyWage exceeds the allowed maximum'),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be in YYYY-MM-DD format')
    .optional(),
});

export const payslipPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format').optional(),
});

export const myPayslipQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/, 'year must be YYYY'),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'month must be 1-12'),
});

export const adminPayslipsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
});
