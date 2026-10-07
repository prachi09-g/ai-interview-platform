export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name, rendered by the frontend
}

/**
 * The full set of badges the platform can award. Achievement.badgeCode
 * (Phase 3 schema) references entries here by `code`. Awarding a badge is
 * one line — `prisma.achievement.create({ data: { userId, badgeCode } })`
 * guarded by `@@unique([userId, badgeCode])` so it's safe to call
 * unconditionally — but *when* to award each one belongs to the module
 * that owns that milestone:
 *   - EARLY_ADOPTER          -> Phase 4 (Auth) on successful registration
 *   - FIRST_INTERVIEW        -> Phase 9 (AI Interview) on first completed interview
 *   - FIVE_INTERVIEWS        -> Phase 9 (AI Interview)
 *   - RESUME_UPLOADED        -> Phase 8 (Resume Analyzer)
 *   - HIGH_ATS_SCORE         -> Phase 8 (Resume Analyzer), ATS score >= 80
 *   - CODING_FIRST_SOLVE     -> Phase 11 (Coding Assessment)
 *   - PERFECT_INTERVIEW      -> Phase 9 (AI Interview), overallScore == 100
 * This phase (6) builds the catalog + read API only, and awards
 * EARLY_ADOPTER itself since account creation is the one milestone already
 * implemented (Phase 4).
 */
export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    code: 'EARLY_ADOPTER',
    name: 'Early Adopter',
    description: 'Created your AI Interview Prep account.',
    icon: 'Sparkles',
  },
  {
    code: 'FIRST_INTERVIEW',
    name: 'First Mock Interview',
    description: 'Completed your first AI-scored mock interview.',
    icon: 'Mic',
  },
  {
    code: 'FIVE_INTERVIEWS',
    name: 'Consistent Practicer',
    description: 'Completed 5 mock interviews.',
    icon: 'Repeat',
  },
  {
    code: 'RESUME_UPLOADED',
    name: 'Resume Ready',
    description: 'Uploaded your first resume for ATS analysis.',
    icon: 'FileText',
  },
  {
    code: 'HIGH_ATS_SCORE',
    name: 'ATS Optimized',
    description: 'Scored 80+ on a resume ATS report.',
    icon: 'Target',
  },
  {
    code: 'CODING_FIRST_SOLVE',
    name: 'First Solve',
    description: 'Passed all test cases on a coding question.',
    icon: 'Code2',
  },
  {
    code: 'PERFECT_INTERVIEW',
    name: 'Perfect Score',
    description: 'Scored 100 on a mock interview.',
    icon: 'Trophy',
  },
];

export function findBadge(code: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.code === code);
}
