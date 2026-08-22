import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leaveType: z.enum(['PTO', 'SICK', 'UNPAID'], {
    errorMap: () => ({ message: 'leaveType must be one of PTO, SICK, UNPAID' }),
  }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
  remarks: z.string().max(500).optional(),
  attachment: z.string().max(500).optional(),
});

export const myLeavesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const decideLeaveSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const adminLeavesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  leaveType: z.enum(['PTO', 'SICK', 'UNPAID']).optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});
