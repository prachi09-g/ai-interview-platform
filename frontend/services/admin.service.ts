import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { PaginatedResult } from '@/types/dashboard.types';
import type { ResumeTemplate } from '@/types/resume.types';
import type {
  AdminCategory,
  AdminCodingQuestion,
  AdminFeedback,
  AdminOverview,
  AdminQuestion,
  AdminSkill,
  AdminUser,
  FeedbackStatus,
  LogEntry,
} from '@/types/admin.types';

type ListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

export const adminService = {
  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async getOverview(): Promise<AdminOverview> {
    const res =
      await apiClient.get<ApiEnvelope<AdminOverview>>(
        '/admin/overview',
      );

    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  async listUsers(
    params: ListParams = {},
  ): Promise<PaginatedResult<AdminUser>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedResult<AdminUser>>
    >('/admin/users', {
      params,
    });

    return res.data.data;
  },

  async updateUser(
    id: string,
    payload: {
      isActive?: boolean;
      emailVerified?: boolean;
    },
  ): Promise<AdminUser> {
    const res =
      await apiClient.patch<ApiEnvelope<AdminUser>>(
        `/admin/users/${id}`,
        payload,
      );

    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<AdminCategory[]> {
    const res =
      await apiClient.get<ApiEnvelope<AdminCategory[]>>(
        '/admin/categories',
      );

    return res.data.data;
  },

  async createCategory(
    payload: Partial<AdminCategory>,
  ): Promise<AdminCategory> {
    const res =
      await apiClient.post<ApiEnvelope<AdminCategory>>(
        '/admin/categories',
        payload,
      );

    return res.data.data;
  },

  async updateCategory(
    id: string,
    payload: Partial<AdminCategory>,
  ): Promise<AdminCategory> {
    const res =
      await apiClient.patch<ApiEnvelope<AdminCategory>>(
        `/admin/categories/${id}`,
        payload,
      );

    return res.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/admin/categories/${id}`);
  },

  // ---------------------------------------------------------------------------
  // Interview Questions
  // ---------------------------------------------------------------------------

  async listQuestions(
    params: ListParams = {},
  ): Promise<PaginatedResult<AdminQuestion>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedResult<AdminQuestion>>
    >('/admin/questions', {
      params,
    });

    return res.data.data;
  },

  async createQuestion(
    payload: Record<string, unknown>,
  ): Promise<AdminQuestion> {
    const res =
      await apiClient.post<ApiEnvelope<AdminQuestion>>(
        '/admin/questions',
        payload,
      );

    return res.data.data;
  },

  async deleteQuestion(id: string): Promise<void> {
    await apiClient.delete(`/admin/questions/${id}`);
  },

  // ---------------------------------------------------------------------------
  // Coding Questions
  // ---------------------------------------------------------------------------

  async listCodingQuestions(
    params: ListParams = {},
  ): Promise<PaginatedResult<AdminCodingQuestion>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedResult<AdminCodingQuestion>>
    >('/admin/coding-questions', {
      params,
    });

    return res.data.data;
  },

  async createCodingQuestion(
    payload: Record<string, unknown>,
  ): Promise<AdminCodingQuestion> {
    const res =
      await apiClient.post<ApiEnvelope<AdminCodingQuestion>>(
        '/admin/coding-questions',
        payload,
      );

    return res.data.data;
  },

  async deleteCodingQuestion(id: string): Promise<void> {
    await apiClient.delete(
      `/admin/coding-questions/${id}`,
    );
  },

  // ---------------------------------------------------------------------------
  // Skills
  // ---------------------------------------------------------------------------

  async listSkills(
    params: ListParams = {},
  ): Promise<PaginatedResult<AdminSkill>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedResult<AdminSkill>>
    >('/admin/skills', {
      params,
    });

    return res.data.data;
  },

  async createSkill(
    payload: Partial<AdminSkill>,
  ): Promise<AdminSkill> {
    const res =
      await apiClient.post<ApiEnvelope<AdminSkill>>(
        '/admin/skills',
        payload,
      );

    return res.data.data;
  },

  async deleteSkill(id: string): Promise<void> {
    await apiClient.delete(`/admin/skills/${id}`);
  },

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  async listFeedback(
    params: ListParams = {},
  ): Promise<PaginatedResult<AdminFeedback>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedResult<AdminFeedback>>
    >('/admin/feedback', {
      params,
    });

    return res.data.data;
  },

  async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
  ): Promise<AdminFeedback> {
    const res =
      await apiClient.patch<ApiEnvelope<AdminFeedback>>(
        `/admin/feedback/${id}`,
        {
          status,
        },
      );

    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  async listLogs(limit = 100): Promise<LogEntry[]> {
    const res =
      await apiClient.get<ApiEnvelope<LogEntry[]>>(
        '/admin/logs',
        {
          params: {
            limit,
          },
        },
      );

    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  async broadcastNotification(payload: {
    title: string;
    message: string;
  }): Promise<{ message: string }> {
    const res = await apiClient.post<
      ApiEnvelope<{ message: string }>
    >('/admin/notifications/broadcast', payload);

    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Resume Templates
  // ---------------------------------------------------------------------------

  async listResumeTemplates(): Promise<
    ResumeTemplate[]
  > {
    const res = await apiClient.get<
      ApiEnvelope<ResumeTemplate[]>
    >('/admin/resume-templates');

    return res.data.data;
  },

  async createResumeTemplate(
    name: string,
    description: string | undefined,
    file: File,
  ): Promise<ResumeTemplate> {
    const formData = new FormData();

    formData.append('name', name);

    if (description) {
      formData.append('description', description);
    }

    formData.append('file', file);

    /*
     * IMPORTANT:
     *
     * apiClient has application/json as its default
     * Content-Type.
     *
     * This request contains FormData, so we remove that
     * default header and allow the browser/Axios to generate:
     *
     * multipart/form-data; boundary=...
     */
    const res = await apiClient.post<
      ApiEnvelope<ResumeTemplate>
    >(
      '/admin/resume-templates',
      formData,
      {
        headers: {
          'Content-Type': undefined,
        },
      },
    );

    return res.data.data;
  },

  async deleteResumeTemplate(
    id: string,
  ): Promise<void> {
    await apiClient.delete(
      `/admin/resume-templates/${id}`,
    );
  },
};