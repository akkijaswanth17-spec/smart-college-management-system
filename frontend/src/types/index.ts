export type Role = "STUDENT" | "FACULTY" | "ADMIN" | "BRANCH";

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export interface Block {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  number: string;
  blockId: string;
  block?: Block;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  fullName: string;
  phone: string;
  departmentId: string;
  department?: Department;
  year: number;
  semester?: number | null;
  section: string;
  createdAt: string;
  user?: { id: string; email: string; isActive: boolean; avatarUrl?: string | null };
}

export interface FacultyProfile {
  id: string;
  userId: string;
  facultyId: string;
  fullName: string;
  title?: string | null;
  phone: string;
  departmentId: string;
  department?: Department;
  designation: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  user?: { id: string; email: string; isActive: boolean; avatarUrl?: string | null };
}

export interface AdminProfile {
  id: string;
  userId: string;
  fullName: string;
}

export interface BranchAdminProfile {
  id: string;
  userId: string;
  branchId: string;
  fullName: string;
  phone: string;
  departmentId: string;
  department?: Department;
  createdAt: string;
  user?: { id: string; email: string; isActive: boolean; avatarUrl?: string | null };
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  student?: StudentProfile | null;
  faculty?: FacultyProfile | null;
  admin?: AdminProfile | null;
  branchAdmin?: BranchAdminProfile | null;
}

export type NoticeCategory =
  | "GENERAL"
  | "ACADEMIC"
  | "EXAMINATION"
  | "EVENTS"
  | "HOLIDAY"
  | "PLACEMENT"
  | "EMERGENCY";
export type NoticePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  publishedDate: string | null;
  expiryDate: string | null;
  attachmentUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  /** Null = college-wide (Admin). Set = only that department can see it. */
  departmentId?: string | null;
  department?: { id: string; name: string; code: string } | null;
}

export type StudyMaterialType = "ASSIGNMENT" | "NOTES" | "QUESTION_BANK";

export interface StudyMaterial {
  id: string;
  title: string;
  type: StudyMaterialType;
  departmentId: string;
  department?: { id: string; name: string; code: string } | null;
  fileUrl: string;
  fileName: string;
  uploadedBy?: { id: string; email: string } | null;
  createdAt: string;
}

export type AcademicUpdateCategory =
  | "EXAM_SCHEDULE"
  | "ASSIGNMENT"
  | "INTERNAL_ASSESSMENT"
  | "ACADEMIC_CALENDAR"
  | "DEPARTMENT_ANNOUNCEMENT"
  | "IMPORTANT_DEADLINE";

export interface AcademicUpdate {
  id: string;
  title: string;
  description: string;
  departmentId: string | null;
  department?: Department | null;
  year: number | null;
  section: string | null;
  category: AcademicUpdateCategory;
  date: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export type LostFoundType = "LOST" | "FOUND";
export type LostFoundStatus = "LOST" | "FOUND" | "CLAIMED" | "RESOLVED";

export interface LostFoundItem {
  id: string;
  itemName: string;
  description: string;
  type: LostFoundType;
  location: string;
  date: string;
  contactInfo: string;
  imageUrl: string | null;
  status: LostFoundStatus;
  createdById: string;
  createdAt: string;
}

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface TimetableEntry {
  id: string;
  facultyId: string;
  faculty?: FacultyProfile & { user?: { email: string } };
  subjectId: string;
  subject?: Subject;
  departmentId: string;
  department?: Department;
  year: number;
  section: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  roomId: string;
  room?: Room;
  blockId: string;
  block?: Block;
  academicYear: string;
  isActive: boolean;
}

export type NotificationType = "CLASS_REMINDER" | "NOTICE" | "ACADEMIC_UPDATE" | "WHATSAPP_REQUEST" | "SYSTEM";
export type NotificationStatus = "UNREAD" | "READ";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  subject: string;
  department: string | null;
  year: number | null;
  section: string | null;
  isActive: boolean;
  inviteLink?: string;
}

export type WhatsAppRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WhatsAppRequest {
  id: string;
  studentId: string;
  student?: { fullName: string; studentId: string };
  department: string;
  year: number;
  section: string;
  phone: string;
  groupId: string;
  group?: { name: string; subject: string };
  reason: string;
  status: WhatsAppRequestStatus;
  inviteLink?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user?: { email: string; role: Role } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount?: number;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiItemResponse<T> {
  success: true;
  data: T;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportSummary {
  batchId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: ImportRowError[];
  /** Marks sheet import only — which subject columns were actually found and used. */
  matchedSubjects?: string[];
  /** Marks sheet import only — file columns that didn't match any subject for this class, ignored. */
  skippedColumns?: string[];
}

export interface MyMark {
  id: string;
  academicYear: string;
  mid1: number | null;
  mid2: number | null;
  semester: number | null;
  subject: { name: string; code: string };
}

export interface AdminMark extends MyMark {
  student: { studentId: string; fullName: string; year: number; section: string };
}

export type ExamType = "mid1" | "mid2" | "semester";

export interface MarksSheetSubject {
  id: string;
  name: string;
  code: string;
}

export interface MarksSheetRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  scores: Record<string, number | null>;
}

export interface MarksSheet {
  academicYear: string;
  subjects: MarksSheetSubject[];
  students: MarksSheetRow[];
}

export interface StudentDetailsReportData {
  studentId: string;
  fullName: string;
  department: string;
  departmentCode: string;
  year: number;
  semester: number | null;
  section: string;
  email: string;
  phone: string;
  accountActive: boolean;
}

export interface StudentMarksReportSubject {
  subject: string;
  code: string;
  mid1: number | null;
  mid2: number | null;
  semester: number | null;
  academicYear: string;
}

export interface MarksColumns {
  mid1: boolean;
  mid2: boolean;
  semester: boolean;
}

export interface StudentMarksReportData {
  studentId: string;
  fullName: string;
  department: string;
  departmentCode: string;
  year: number;
  semester: number | null;
  section: string;
  subjects: StudentMarksReportSubject[];
}

export interface FacultyDetailsReportData {
  facultyId: string;
  fullName: string;
  title: string | null;
  department: string;
  departmentCode: string;
  designation: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  addedToSystemAt: string;
  assignedSubjects: string[];
  assignedSections: string[];
  assignedRooms: string[];
  assignedBlocks: string[];
  timetable: {
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    room: string;
    block: string;
    section: string;
    year: number;
  }[];
}

// ============================================================
// FACULTY FEEDBACK
// ============================================================

export interface FeedbackQuestion {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackTarget {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  submitted: boolean;
}

export interface FeedbackTargetsResponse {
  academicYear: string;
  pendingCount: number;
  targets: FeedbackTarget[];
}

export interface FeedbackClassReportRow {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  percentage: number | null;
}

export interface FeedbackFacultyListRow {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
}

export type FeedbackQuestionCounts = Record<"1" | "2" | "3" | "4" | "5", number>;

export interface FeedbackQuestionDetail {
  id: string;
  text: string;
  counts: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface FeedbackFacultyDetail {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  departmentName: string;
  departmentCode: string;
  year: number;
  section: string;
  academicYear: string;
  submissionCount: number;
  percentage: number;
  questions: FeedbackQuestionDetail[];
}

export interface FeedbackPublishStatus {
  published: boolean;
  publishedAt: string | null;
}
