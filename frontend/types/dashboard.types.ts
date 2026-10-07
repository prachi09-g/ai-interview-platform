export interface InterviewCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type InterviewType = 'TECHNICAL' | 'HR' | 'BEHAVIORAL' | 'CODING' | 'VOICE';

export interface MockInterviewSummary {
  id: string;
  type: InterviewType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: InterviewStatus;
  overallScore: number | null;
  isBookmarked: boolean;
  startedAt: string;
  completedAt: string | null;
  category: InterviewCategory;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface Certificate {
  id: string;
  fileUrl: string;
  issuedAt: string;
  category: InterviewCategory;
}

export type LeaderboardPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export interface LeaderboardEntry {
  rank: number;
  score: number;
  category: string;
  fullName: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: { rank: number; score: number; category: string } | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse extends PaginatedResult<AppNotification> {
  meta: PaginatedResult<AppNotification>['meta'] & { unreadCount: number };
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface Profile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  targetRole: string | null;
  experienceLevel: string | null;
  bio: string | null;
  skills: Skill[];
}

export interface UserWithProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  role: 'STUDENT' | 'ADMIN';
  profile: Profile | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
  targetRole?: string;
  experienceLevel?: string;
  bio?: string;
  skills?: string[];
}
