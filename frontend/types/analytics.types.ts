export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  totalInterviews: number;
  averageScore: number;
  trend: number[];
}

export interface StudentProgress {
  byCategory: CategoryProgress[];
  overallAverageScore: number | null;
  totalInterviews: number;
  resume: {
    latestAtsScore: number | null;
    averageAtsScore: number | null;
    totalUploaded: number;
  };
  coding: {
    totalSubmissions: number;
    passed: number;
    passRate: number | null;
  };
  achievementsEarned: number;
}

export interface AdminOverview {
  kpis: {
    totalUsers: number;
    signupsToday: number;
    interviewsToday: number;
    totalInterviews: number;
    completedInterviews: number;
    avgPlatformScore: number | null;
    totalResumesUploaded: number;
    codingPassRate: number | null;
  };
  signupsOverTime: { date: string; count: number }[];
  domainPopularity: { categoryId: string; categoryName: string; count: number }[];
}

export interface DomainAnalytics {
  category: { id: string; name: string; description: string | null };
  totalCompletedInterviews: number;
  averageScore: number | null;
  mostMissedKeywords: { keyword: string; count: number }[];
  codingQuestions: { id: string; title: string; totalSubmissions: number; passRate: number | null }[];
  topPerformers: { rank: number; score: number; fullName: string }[];
}
