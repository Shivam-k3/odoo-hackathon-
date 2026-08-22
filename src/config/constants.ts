export const LEAVE_TYPES = {
  PTO: {
    code: 'PTO',
    name: 'Paid Time Off',
    isPaid: true,
    requiresAttachment: false,
    annualQuota: 12,
  },
  SICK: {
    code: 'SICK',
    name: 'Sick Leave',
    isPaid: true,
    requiresAttachment: true,
    annualQuota: 6,
  },
  UNPAID: {
    code: 'UNPAID',
    name: 'Unpaid Leave',
    isPaid: false,
    requiresAttachment: false,
    annualQuota: null,
  },
} as const;

export type LeaveTypeCode = keyof typeof LEAVE_TYPES;

export const LEAVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// Sunday (0) and Saturday (6) are non-working days for payable-day purposes.
export const WEEKEND_DAYS = [0, 6];

export const PAYROLL_RATES = {
  BASIC_OF_WAGE: 0.5,
  HRA_OF_BASIC: 0.5,
  STANDARD_ALLOWANCE_OF_BASIC: 0.1667,
  PERFORMANCE_BONUS_OF_BASIC: 0.0833,
  LTA_OF_BASIC: 0.08333,
  EMPLOYEE_PF_OF_BASIC: 0.12,
  EMPLOYER_PF_OF_BASIC: 0.12,
} as const;

export const PROFESSIONAL_TAX_MONTHLY = 200;

export const HALF_DAY_PAYABLE_FRACTION = 0.5;
