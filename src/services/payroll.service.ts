import { prisma } from '../models/prisma';
import { calculateSalary, SalaryComponents } from '../utils/payrollCalculator';
import { getPayableDays } from './payableDays.service';
import { notificationService } from './notification.service';

function monthBounds(monthStr?: string) {
  const now = new Date();
  let year: number;
  let month: number;
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const parts = monthStr.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  return { periodYear: year, periodMonth: month };
}

export const payrollService = {
  /**
   * Admin/HR only. Creates or updates the employee salary structure.
   * Only the wage is accepted; every component is derived server-side.
   * Every change writes an audit row (who/when/old/new).
   */
  async upsertSalaryStructure(
    employeeId: string,
    monthlyWage: number,
    actorId: string,
    effectiveFrom?: string
  ) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    // Validate by running the authoritative calculator (throws on invalid wage).
    calculateSalary(monthlyWage);

    const existing = await prisma.salaryStructure.findUnique({
      where: { employeeId },
    });

    const result = await prisma.$transaction(async (tx) => {
      const structure = existing
        ? await tx.salaryStructure.update({
            where: { id: existing.id },
            data: {
              monthlyWage,
              updatedById: actorId,
              ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom) } : {}),
            },
          })
        : await tx.salaryStructure.create({
            data: {
              employeeId,
              monthlyWage,
              effectiveFrom: effectiveFrom
                ? new Date(effectiveFrom)
                : new Date(new Date().getFullYear(), 0, 1),
              createdById: actorId,
            },
          });

      await tx.salaryAudit.create({
        data: {
          structureId: structure.id,
          actorId,
          action: existing ? 'UPDATE' : 'CREATE',
          oldWage: existing?.monthlyWage ?? null,
          newWage: monthlyWage,
        },
      });

      return structure;
    });

    return result;
  },

  async getSalaryStructure(employeeId: string) {
    return prisma.salaryStructure.findUnique({ where: { employeeId } });
  },

  /** Full computed breakdown for an employee (structure + components). */
  async getMyPayroll(employeeId: string) {
    const structure = await this.getSalaryStructure(employeeId);
    if (!structure) {
      throw { statusCode: 404, message: 'No salary structure configured for this employee' };
    }
    const components: SalaryComponents = calculateSalary(structure.monthlyWage);
    const payslips = await prisma.payslip.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    return {
      salaryStructure: structure,
      components,
      payslips,
    };
  },

  /**
   * Admin/HR: generate (or regenerate) a payslip for a pay period.
   * Payable days come exclusively from attendance + approved leave.
   */
  async generatePayslip(employeeId: string, monthStr: string | undefined, actorId?: string) {
    const structure = await this.getSalaryStructure(employeeId);
    if (!structure) {
      throw {
        statusCode: 422,
        message: 'Set up a salary structure for this employee before generating payslips',
      };
    }

    const payable = await getPayableDays(employeeId, monthStr);
    const components = calculateSalary(structure.monthlyWage);
    const { periodYear, periodMonth } = monthBounds(monthStr);

    const payslip = await prisma.payslip.upsert({
      where: {
        employeeId_periodYear_periodMonth: { employeeId, periodYear, periodMonth },
      },
      update: {
        workingDays: payable.workingDays,
        presentDays: payable.presentDays,
        paidLeaveDays: payable.paidLeaveDays,
        unpaidLeaveDays: payable.unpaidLeaveDays,
        payableDays: payable.payableDays,
        monthlyWage: components.monthlyWage,
        basicSalary: components.basicSalary,
        hra: components.hra,
        standardAllowance: components.standardAllowance,
        performanceBonus: components.performanceBonus,
        lta: components.lta,
        fixedAllowance: components.fixedAllowance,
        grossEarnings: components.grossEarnings,
        employeePf: components.employeePf,
        employerPf: components.employerPf,
        professionalTax: components.professionalTax,
        netPay: components.netPay,
        generatedById: actorId ?? null,
        generatedAt: new Date(),
      },
      create: {
        employeeId,
        periodYear,
        periodMonth,
        workingDays: payable.workingDays,
        presentDays: payable.presentDays,
        paidLeaveDays: payable.paidLeaveDays,
        unpaidLeaveDays: payable.unpaidLeaveDays,
        payableDays: payable.payableDays,
        monthlyWage: components.monthlyWage,
        basicSalary: components.basicSalary,
        hra: components.hra,
        standardAllowance: components.standardAllowance,
        performanceBonus: components.performanceBonus,
        lta: components.lta,
        fixedAllowance: components.fixedAllowance,
        grossEarnings: components.grossEarnings,
        employeePf: components.employeePf,
        employerPf: components.employerPf,
        professionalTax: components.professionalTax,
        netPay: components.netPay,
        generatedById: actorId ?? null,
      },
    });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true, firstName: true, lastName: true },
    });
    if (employee) {
      await notificationService.notify({
        recipientUserId: employee.userId,
        type: 'PAYSLIP_AVAILABLE',
        title: `Payslip available for ${payable.month}`,
        body: `Net pay ₹${components.netPay} for ${payable.month}`,
        meta: { payslipId: payslip.id },
      });
    }

    return { payslip, attendanceBreakdown: payable, currency: 'INR' };
  },

  /** Employee reads one of their own payslips. */
  async getMyPayslip(employeeId: string, year: number, month: number) {
    const payslip = await prisma.payslip.findUnique({
      where: {
        employeeId_periodYear_periodMonth: { employeeId, periodYear: year, periodMonth: month },
      },
    });
    if (!payslip) {
      throw { statusCode: 404, message: 'Payslip not found for this period' };
    }
    return payslip;
  },

  async adminListPayslips(
    options: { month?: string; employeeId?: string; department?: string } = {}
  ) {
    const where: any = {};
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.department) where.employee = { department: options.department };
    if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
      const [y, m] = options.month.split('-').map((p) => parseInt(p, 10));
      where.periodYear = y;
      where.periodMonth = m;
    }
    const records = await prisma.payslip.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
      },
    });
    const totals = records.reduce(
      (acc, r) => ({
        totalGross: Math.round((acc.totalGross + r.grossEarnings) * 100) / 100,
        totalNet: Math.round((acc.totalNet + r.netPay) * 100) / 100,
      }),
      { totalGross: 0, totalNet: 0 }
    );
    return { count: records.length, totals, records, currency: 'INR' };
  },
};
