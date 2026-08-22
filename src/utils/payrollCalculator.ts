import { PAYROLL_RATES, PROFESSIONAL_TAX_MONTHLY } from '../config/constants';

export interface SalaryComponents {
  monthlyWage: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  grossEarnings: number;
  employeePf: number;
  employerPf: number;
  professionalTax: number;
  netPay: number;
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Authoritative Dayflow salary engine.
 * Derives every statutory component from the monthly wage alone.
 * Any component values supplied by a client are ignored - this function is
 * the single source of truth for payroll arithmetic.
 */
export function calculateSalary(monthlyWage: number): SalaryComponents {
  if (typeof monthlyWage !== 'number' || !Number.isFinite(monthlyWage) || monthlyWage <= 0) {
    throw { statusCode: 422, message: 'Monthly wage must be a positive number' };
  }

  const basic = round2(monthlyWage * PAYROLL_RATES.BASIC_OF_WAGE);
  const hra = round2(basic * PAYROLL_RATES.HRA_OF_BASIC);
  const standardAllowance = round2(basic * PAYROLL_RATES.STANDARD_ALLOWANCE_OF_BASIC);
  const performanceBonus = round2(basic * PAYROLL_RATES.PERFORMANCE_BONUS_OF_BASIC);
  const lta = round2(basic * PAYROLL_RATES.LTA_OF_BASIC);

  // Fixed allowance absorbs the remainder so total earnings equal the wage exactly.
  const fixedAllowance = round2(
    monthlyWage - (basic + hra + standardAllowance + performanceBonus + lta)
  );

  if (fixedAllowance < 0) {
    throw {
      statusCode: 422,
      message: 'Earning components exceed the monthly wage; invalid configuration',
    };
  }

  const employeePf = round2(basic * PAYROLL_RATES.EMPLOYEE_PF_OF_BASIC);
  const employerPf = round2(basic * PAYROLL_RATES.EMPLOYER_PF_OF_BASIC);
  const professionalTax = PROFESSIONAL_TAX_MONTHLY;

  const grossEarnings = round2(
    basic + hra + standardAllowance + performanceBonus + lta + fixedAllowance
  );
  const netPay = round2(grossEarnings - employeePf - professionalTax);

  return {
    monthlyWage: round2(monthlyWage),
    basicSalary: basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    grossEarnings,
    employeePf,
    employerPf,
    professionalTax,
    netPay,
  };
}
