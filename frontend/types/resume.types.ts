export interface Resume {
  id: string;
  fileUrl: string;
  originalName: string;
  uploadedAt: string;
}

export interface AtsReport {
  id: string;
  atsScore: number;
  sectionScores: {
    formatting: number;
    keywords: number;
    structure: number;
  };
  createdAt: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  missingSkills: string[];
  suggestions: string[];
  targetJobRole: string | null;
  atsReport: AtsReport | null;
  createdAt: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  category: string | null;
  createdAt: string;
}
