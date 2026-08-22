import { prisma } from '../models/prisma';
import { getMonthRange } from '../utils/dateUtils';
import { WEEKEND_DAYS, HALF_DAY_PAYABLE_FRACTION } from '../config/constants';
import { LEAVE_TYPES } from '../config/constants';

export interface PayableDaysResult {
  month: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  payableDays: number;
}

function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getUTCDay());
}

/**
 * Reusable attendance + leave integration.
 *
 * Payability rules (per Dayflow requirements):
 *   - Present working day        -> payable
 *   - Half day                   -> half payable
 *   - Approved PAID leave        -> payable
 *   - Approved UNPAID leave      -> not payable
 *   - Missing / absent day       -> not payable
 *   - Weekends are excluded entirely
 *
 * Approved leave takes precedence over any attendance row for that date so a
 * properly approved paid leave still counts as payable even if Member 1's
 * attendance table has no record for it.
 */
export async function getPayableDays(
  employeeId: string,
  monthStr?: string
): Promise<PayableDaysResult> {
  const { startDate, endDate, yearMonth } = getMonthRange(monthStr);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  const [attendanceRows, approvedLeaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
    }),
  ]);

  const attendanceByDate = new Map(attendanceRows.map((r) => [r.date, r]));

  const leaveCovering = (date: Date) =>
    approvedLeaves.find((l) => l.startDate <= date && l.endDate >= date);

  let workingDays = 0;
  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let absentDays = 0;

  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    if (!isWeekend(cursor)) {
      workingDays += 1;
      const dateKey = cursor.toISOString().slice(0, 10);

      const leave = leaveCovering(cursor);
      if (leave) {
        if (LEAVE_TYPES[leave.leaveType as keyof typeof LEAVE_TYPES]?.isPaid) {
          paidLeaveDays += 1;
        } else {
          unpaidLeaveDays += 1;
        }
      } else {
        const record = attendanceByDate.get(dateKey);
        if (record?.status === 'PRESENT') {
          presentDays += 1;
        } else if (record?.status === 'HALF_DAY') {
          presentDays += HALF_DAY_PAYABLE_FRACTION;
        } else {
          // ABSENT status or missing attendance -> not payable.
          absentDays += 1;
        }
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const payableDays =
    Math.round((presentDays + paidLeaveDays) * 100) / 100;

  return {
    month: yearMonth,
    startDate,
    endDate,
    workingDays,
    presentDays: Math.round(presentDays * 100) / 100,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    payableDays,
  };
}
