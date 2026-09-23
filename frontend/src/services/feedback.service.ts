import { api } from "./api";
import {
  FeedbackQuestion,
  FeedbackTargetsResponse,
  FeedbackClassReportRow,
  FeedbackFacultyListRow,
  FeedbackFacultyDetail,
  FeedbackPublishStatus,
  FeedbackSubmissionStatus,
} from "../types";

export interface FeedbackReportParams {
  departmentId: string;
  year: number;
  section: string;
  academicYear: string;
}

export const feedbackService = {
  // Module on/off switch
  async getEnabled() {
    const res = await api.get<{ data: { enabled: boolean } }>("/feedback/enabled");
    return res.data.data.enabled;
  },
  async setEnabled(enabled: boolean) {
    const res = await api.put<{ data: { enabled: boolean } }>("/feedback/enabled", { enabled });
    return res.data.data.enabled;
  },

  // Admin — question bank
  async listQuestions() {
    const res = await api.get<{ data: FeedbackQuestion[] }>("/feedback/questions");
    return res.data.data;
  },
  async listActiveQuestions() {
    const res = await api.get<{ data: FeedbackQuestion[] }>("/feedback/questions/active");
    return res.data.data;
  },
  async createQuestion(payload: { text: string; order?: number }) {
    const res = await api.post<{ data: FeedbackQuestion }>("/feedback/questions", payload);
    return res.data.data;
  },
  async updateQuestion(id: string, payload: { text?: string; order?: number; isActive?: boolean }) {
    const res = await api.put<{ data: FeedbackQuestion }>(`/feedback/questions/${id}`, payload);
    return res.data.data;
  },
  async deleteQuestion(id: string) {
    await api.delete(`/feedback/questions/${id}`);
  },
  async reorderQuestions(orderedIds: string[]) {
    const res = await api.post<{ data: FeedbackQuestion[] }>("/feedback/questions/reorder", { orderedIds });
    return res.data.data;
  },

  // Student
  async myTargets() {
    const res = await api.get<{ data: FeedbackTargetsResponse }>("/feedback/my-targets");
    return res.data.data;
  },
  async submit(payload: {
    facultyId: string;
    subjectId: string;
    answers: { questionId: string; rating: number }[];
    comment?: string;
  }) {
    const res = await api.post<{ message: string }>("/feedback/submit", payload);
    return res.data.message;
  },

  // Admin — reports + publish
  async classReport(params: FeedbackReportParams) {
    const res = await api.get<{ data: FeedbackClassReportRow[] }>("/feedback/class-report", { params });
    return res.data.data;
  },
  async facultyList(params: FeedbackReportParams) {
    const res = await api.get<{ data: FeedbackFacultyListRow[] }>("/feedback/faculty-list", { params });
    return res.data.data;
  },
  async facultyDetail(params: FeedbackReportParams & { facultyId: string; subjectId: string }) {
    const res = await api.get<{ data: FeedbackFacultyDetail }>("/feedback/faculty-detail", { params });
    return res.data.data;
  },
  async publishStatus(params: FeedbackReportParams) {
    const res = await api.get<{ data: FeedbackPublishStatus }>("/feedback/publish-status", { params });
    return res.data.data;
  },
  async submissionStatus(params: FeedbackReportParams) {
    const res = await api.get<{ data: FeedbackSubmissionStatus }>("/feedback/submission-status", { params });
    return res.data.data;
  },
  async publish(params: FeedbackReportParams) {
    const res = await api.post<{ message: string }>("/feedback/publish", params);
    return res.data.message;
  },

  // Faculty — own published feedback
  async myFeedback() {
    const res = await api.get<{ data: FeedbackFacultyDetail[] }>("/feedback/my-feedback");
    return res.data.data;
  },
};
