/**
 * Central registry of BullMQ queue names used across the platform.
 *  - RESUME_ANALYSIS_QUEUE      -> registered but deliberately unused —
 *    Phase 8 kept resume analysis synchronous (see the trade-off comment
 *    in resume.service.ts); kept registered here in case a future phase
 *    revisits that decision under real load.
 *  - INTERVIEW_EVALUATION_QUEUE -> Phase 9  (AI Interview Module) — used
 *  - SPEECH_ANALYSIS_QUEUE      -> Phase 10 (Speech Analysis)
 *  - CODING_EXECUTION_QUEUE     -> Phase 11 (Coding Assessment) — Judge0's
 *    own docs explicitly discourage wait=true "because it does not scale
 *    well"; submitting a batch of test cases and polling is exactly the
 *    external-latency case this queue infrastructure exists for.
 *  - NOTIFICATION_QUEUE         -> Phase 6/7 (email/in-app notifications)
 */
export const QUEUE_NAMES = {
  RESUME_ANALYSIS: 'resume-analysis-queue',
  INTERVIEW_EVALUATION: 'interview-evaluation-queue',
  SPEECH_ANALYSIS: 'speech-analysis-queue',
  CODING_EXECUTION: 'coding-execution-queue',
  NOTIFICATION: 'notification-queue',
} as const;
