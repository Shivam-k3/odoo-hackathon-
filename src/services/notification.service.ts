import { prisma } from '../models/prisma';

export interface NotificationInput {
  recipientUserId: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'PAYSLIP_AVAILABLE';
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
}

/**
 * Email delivery abstraction.
 * No SMTP provider is configured for this project yet, so the default
 * provider records the intent and reports `delivered: false` honestly
 * instead of pretending an email was sent. Swap in an SMTP/SES/SendGrid
 * implementation later without touching calling code.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  reason?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

export class LoggingEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    console.log(
      `[notification] email not delivered (no provider configured) -> ${message.to}: ${message.subject}`
    );
    return { delivered: false, reason: 'email_provider_not_configured' };
  }
}

const emailProvider: EmailProvider = new LoggingEmailProvider();

export const notificationService = {
  /**
   * Persists an in-app notification and attempts email delivery through
   * the configured provider. In-app delivery is always real; email is only
   * reported as sent when a provider actually delivers it.
   */
  async notify(input: NotificationInput): Promise<void> {
    await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });

    try {
      const user = await prisma.user.findUnique({
        where: { id: input.recipientUserId },
        select: { email: true },
      });
      if (user) {
        await emailProvider.send({ to: user.email, subject: input.title, text: input.body ?? '' });
      }
    } catch (err) {
      console.error('[notification] email dispatch failed:', err);
    }
  },

  /** Fan-out helper: notify every active ADMIN_HR user (e.g. leave submitted). */
  async notifyAdmins(input: Omit<NotificationInput, 'recipientUserId'>): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN_HR', status: 'ACTIVE' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notify({ ...input, recipientUserId: admin.id })
      )
    );
  },

  listForUser(userId: string, options: { unreadOnly?: boolean; page?: number; limit?: number } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    return prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  },

  async markRead(userId: string, notificationId: string): Promise<void> {
    const row = await prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (!row) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
    if (!row.readAt) {
      await prisma.notification.update({ where: { id: row.id }, data: { readAt: new Date() } });
    }
  },
};
