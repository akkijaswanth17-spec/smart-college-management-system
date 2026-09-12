import { prisma } from "../config/prisma";

export type AuditAction =
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_IMPORTED"
  | "FACULTY_CREATED"
  | "FACULTY_UPDATED"
  | "FACULTY_DEACTIVATED"
  | "FACULTY_ACTIVATED"
  | "FACULTY_PASSWORD_RESET"
  | "FACULTY_IMPORTED"
  | "TIMETABLE_CREATED"
  | "TIMETABLE_UPDATED"
  | "TIMETABLE_DELETED"
  | "TIMETABLE_IMPORTED"
  | "MARKS_IMPORTED"
  | "MARKS_ENTERED"
  | "MARK_DELETED"
  | "BRANCH_ADMIN_CREATED"
  | "BRANCH_ADMIN_UPDATED"
  | "BRANCH_ADMIN_DEACTIVATED"
  | "BRANCH_ADMIN_PASSWORD_RESET"
  | "REPORT_STUDENT_DETAILS_GENERATED"
  | "REPORT_STUDENT_MARKS_GENERATED"
  | "REPORT_FACULTY_DETAILS_GENERATED"
  | "NOTICE_CREATED"
  | "NOTICE_UPDATED"
  | "NOTICE_DELETED"
  | "ACADEMIC_UPDATE_CREATED"
  | "ACADEMIC_UPDATE_UPDATED"
  | "ACADEMIC_UPDATE_DELETED"
  | "LOST_FOUND_MODERATED"
  | "LOST_FOUND_DELETED"
  | "WHATSAPP_GROUP_CREATED"
  | "WHATSAPP_REQUEST_APPROVED"
  | "WHATSAPP_REQUEST_REJECTED"
  | "USER_DEACTIVATED"
  | "USER_ACTIVATED"
  | "SETTING_UPDATED";

interface AuditParams {
  userId?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit({ userId, action, targetType, targetId, metadata }: AuditParams) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
