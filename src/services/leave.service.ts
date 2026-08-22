import { prisma } from '../models/prisma';
import { LEAVE_TYPES, LEAVE_STATUS, LeaveTypeCode } from '../config/constants';
import { notificationService } from './notification.service';

const PAID_LEAVE_TYPES: string[] = ['PTO', 'SICK'];

function parseDateOnly(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw { statusCode: 422, message: 'Invalid date. Expected format YYYY-MM-DD' };
  }
  return d;
}

export function calculateRequestedDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

async function ensureAllocations(employeeId: string, year: number) {
  for (const [code, meta] of Object.entries(LEAVE_TYPES)) {
    await prisma.leaveAllocation.upsert({
      where: {
        employeeId_year_leaveType: { employeeId, year, leaveType: code },
      },
      update: {},
      create: {
        employeeId,
        year,
        leaveType: code,
        entitled: meta.annualQuota,
        used: 0,
      },
    });
  }
}

async function pendingDaysForType(employeeId: string, year: number, leaveType: string) {
  const agg = await prisma.leaveRequest.aggregate({
    where: {
      employeeId,
      leaveType,
      status: LEAVE_STATUS.PENDING,
    },
    _sum: { requestedDays: true },
  });
  // Requests are charged to the allocation year of their start date.
  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId, leaveType, status: LEAVE_STATUS.PENDING },
    select: { startDate: true, requestedDays: true },
  });
  void agg;
  let total = 0;
  for (const row of rows) {
    if (row.startDate.getUTCFullYear() === year) total += row.requestedDays;
  }
  return total;
}

export interface ApplyLeaveInput {
  leaveType: LeaveTypeCode;
  startDate: string;
  endDate: string;
  remarks?: string;
  attachment?: string | null;
}

export const leaveService = {
  async applyLeave(employeeId: string, input: ApplyLeaveInput) {
    const meta = LEAVE_TYPES[input.leaveType];
    if (!meta) {
      throw { statusCode: 422, message: 'Invalid leave type' };
    }

    const start = parseDateOnly(input.startDate);
    const end = parseDateOnly(input.endDate);
    if (end.getTime() < start.getTime()) {
      throw { statusCode: 422, message: 'End date cannot be before start date' };
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    if (meta.requiresAttachment && !input.attachment) {
      throw {
        statusCode: 422,
        message: `Medical certificate attachment is mandatory for ${meta.name}`,
      };
    }

    const requestedDays = calculateRequestedDays(start, end);

    // Prevent overlapping PENDING/APPROVED requests for the same employee.
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) {
      throw {
        statusCode: 409,
        message: 'You already have a leave request overlapping these dates',
      };
    }

    const year = start.getUTCFullYear();
    await ensureAllocations(employeeId, year);

    const allocation = await prisma.leaveAllocation.findUnique({
      where: { employeeId_year_leaveType: { employeeId, year, leaveType: input.leaveType } },
    });

    // Capacity check counts approved usage plus already-pending requests so
    // balances can never go negative once everything is approved.
    if (meta.annualQuota !== null && allocation) {
      const committed =
        allocation.used + (await pendingDaysForType(employeeId, year, input.leaveType));
      if (committed + requestedDays > (allocation.entitled ?? meta.annualQuota)) {
        const remaining = Math.max(0, (allocation.entitled ?? meta.annualQuota) - committed);
        throw {
          statusCode: 422,
          message: `Insufficient ${meta.name} balance: ${remaining} day(s) remaining, ${requestedDays} requested`,
        };
      }
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType: input.leaveType,
        startDate: start,
        endDate: end,
        requestedDays,
        remarks: input.remarks ?? null,
        attachment: input.attachment ?? null,
        status: LEAVE_STATUS.PENDING,
      },
    });

    await notificationService.notifyAdmins({
      type: 'LEAVE_SUBMITTED',
      title: `Leave request submitted by ${employee.firstName} ${employee.lastName}`,
      body: `${meta.name} from ${input.startDate} to ${input.endDate} (${requestedDays} day(s))`,
      meta: { leaveRequestId: request.id, employeeId },
    });

    return request;
  },

  async listMyLeaves(
    employeeId: string,
    options: { status?: string; year?: number; page?: number; limit?: number } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const where: any = { employeeId };
    if (options.status) where.status = options.status;
    if (options.year) {
      const start = new Date(Date.UTC(options.year, 0, 1));
      const end = new Date(Date.UTC(options.year + 1, 0, 1));
      where.startDate = { gte: start, lt: end };
    }
    const [total, records] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, page, limit, totalPages: Math.ceil(total / limit), records };
  },

  async getMyLeave(employeeId: string, requestId: string) {
    const record = await prisma.leaveRequest.findFirst({
      where: { id: requestId, employeeId },
    });
    if (!record) {
      throw { statusCode: 404, message: 'Leave request not found' };
    }
    return record;
  },

  async getMyAllocations(employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    await ensureAllocations(employeeId, targetYear);
    const allocations = await prisma.leaveAllocation.findMany({
      where: { employeeId, year: targetYear },
    });
    const result = [];
    for (const alloc of allocations) {
      const pending = await pendingDaysForType(employeeId, targetYear, alloc.leaveType);
      const entitled = alloc.entitled ?? LEAVE_TYPES[alloc.leaveType as LeaveTypeCode]?.annualQuota ?? null;
      const used = alloc.used;
      const remaining = entitled === null ? null : Math.max(0, entitled - used - pending);
      result.push({
        id: alloc.id,
        year: alloc.year,
        leaveType: alloc.leaveType,
        name: LEAVE_TYPES[alloc.leaveType as LeaveTypeCode]?.name ?? alloc.leaveType,
        isPaid: LEAVE_TYPES[alloc.leaveType as LeaveTypeCode]?.isPaid ?? false,
        entitled,
        used,
        pending,
        remaining,
      });
    }
    return { year: targetYear, allocations: result };
  },

  async adminListLeaves(
    options: {
      status?: string;
      leaveType?: string;
      employeeId?: string;
      department?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.leaveType) where.leaveType = options.leaveType;
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.department) where.employee = { department: options.department };
    if (options.from || options.to) {
      where.startDate = {};
      if (options.from) where.startDate.gte = parseDateOnly(options.from);
      if (options.to) where.startDate.lte = parseDateOnly(options.to);
    }
    const [total, records] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              loginId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              designation: true,
            },
          },
        },
      }),
    ]);
    return { total, page, limit, totalPages: Math.ceil(total / limit), records };
  },

  async adminGetLeave(requestId: string) {
    const record = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        decidedBy: { select: { id: true, email: true, role: true } },
      },
    });
    if (!record) {
      throw { statusCode: 404, message: 'Leave request not found' };
    }
    return record;
  },

  /**
   * Approve or reject a PENDING request.
   * Only PENDING -> APPROVED and PENDING -> REJECTED transitions are legal;
   * any other transition is rejected with 409. Approval of paid leave types
   * atomically commits days against the yearly allocation inside one
   * transaction, so balances can never go negative.
   */
  async decideLeave(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    adminUserId: string,
    comment?: string
  ) {
    const existing = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: { include: { user: true } } },
    });
    if (!existing) {
      throw { statusCode: 404, message: 'Leave request not found' };
    }
    if (existing.status !== LEAVE_STATUS.PENDING) {
      throw {
        statusCode: 409,
        message: `Invalid transition: request is already ${existing.status}. Only PENDING requests can be ${action.toLowerCase()}.`,
      };
    }

    const decidedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      // Guarded update: only succeeds while still PENDING (prevents double decisions).
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: requestId, status: LEAVE_STATUS.PENDING },
        data: {
          status: action,
          decidedById: adminUserId,
          decidedAt,
          adminComment: comment ?? null,
        },
      });
      if (claimed.count === 0) {
        throw { statusCode: 409, message: 'Request was already decided by another admin' };
      }

      if (action === LEAVE_STATUS.APPROVED && PAID_LEAVE_TYPES.includes(existing.leaveType)) {
        const year = existing.startDate.getUTCFullYear();
        await ensureAllocations(existing.employeeId, year);
        const allocation = await tx.leaveAllocation.findUnique({
          where: {
            employeeId_year_leaveType: {
              employeeId: existing.employeeId,
              year,
              leaveType: existing.leaveType,
            },
          },
        });
        if (allocation && allocation.entitled !== null) {
          if (allocation.used + existing.requestedDays > allocation.entitled) {
            throw {
              statusCode: 422,
              message: `Insufficient ${existing.leaveType} balance at approval time; cannot approve without negative allocation`,
            };
          }
          await tx.leaveAllocation.update({
            where: { id: allocation.id },
            data: { used: { increment: existing.requestedDays } },
          });
        }
      }

      return tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { decidedBy: { select: { id: true, email: true, role: true } } },
      });
    });

    const employeeUser = existing.employee.user;
    const label = LEAVE_TYPES[existing.leaveType as LeaveTypeCode]?.name ?? existing.leaveType;
    if (employeeUser) {
      await notificationService.notify({
        recipientUserId: employeeUser.id,
        type: action === LEAVE_STATUS.APPROVED ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        title:
          action === LEAVE_STATUS.APPROVED
            ? `Your ${label} request has been approved`
            : `Your ${label} request has been rejected`,
        body: comment
          ? `${label} (${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate
              .toISOString()
              .slice(0, 10)}): ${comment}`
          : undefined,
        meta: { leaveRequestId: requestId },
      });
    }

    return updated;
  },
};
