import { Injectable } from '@nestjs/common';
import type { ParsedResume } from './resume-parser.service';

export interface AtsSectionScores {
  formatting: number; // 0-100: structural/parseability signals
  keywords: number; // 0-100: skill-keyword density relative to a healthy target
  structure: number; // 0-100: presence of expected resume sections
}

export interface AtsResult {
  atsScore: number; // 0-100 overall, weighted average of the three sections
  sectionScores: AtsSectionScores;
}

const SECTION_WEIGHT = 100 / 6; // 6 tracked sections in ResumeParserService

/**
 * A deliberately deterministic, explainable scorer — real ATS software
 * (Workday, Greenhouse, Taleo) scores structurally too: can it extract
 * contact info, does it recognize section headers, is keyword density
 * reasonable. This does NOT call an LLM, unlike ResumeAiService's
 * suggestions/missing-skills — a resume's ATS-parseability is a mechanical
 * property, not something that benefits from AI "judgment", and keeping it
 * deterministic means the score is reproducible and explainable to the
 * student without depending on an API key being configured.
 */
@Injectable()
export class AtsScorerService {
  score(parsed: ParsedResume, targetSkillCount: number): AtsResult {
    const formatting = this.scoreFormatting(parsed);
    const structure = this.scoreStructure(parsed);
    const keywords = this.scoreKeywords(parsed, targetSkillCount);

    const atsScore = Math.round(formatting * 0.3 + structure * 0.4 + keywords * 0.3);

    return {
      atsScore,
      sectionScores: { formatting, keywords, structure },
    };
  }

  private scoreFormatting(parsed: ParsedResume): number {
    let score = 100;

    // A resume with no extractable email/phone likely has its contact info
    // in an image, header/footer, or unusual layout that ATS parsers choke on.
    if (parsed.emails.length === 0) score -= 30;
    if (parsed.phones.length === 0) score -= 15;

    // Extremely short text usually means most content was in graphics/tables
    // that didn't extract cleanly. Extremely long usually means multi-page
    // bloat that recruiters/ATS systems penalize.
    if (parsed.wordCount < 150) score -= 30;
    else if (parsed.wordCount > 1200) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private scoreStructure(parsed: ParsedResume): number {
    const sectionsPresent = Object.values(parsed.sections).filter(Boolean).length;
    return Math.round(sectionsPresent * SECTION_WEIGHT);
  }

  private scoreKeywords(parsed: ParsedResume, targetSkillCount: number): number {
    if (targetSkillCount === 0) return 50; // no taxonomy to compare against — neutral score

    // A resume mentioning ~40% of a reasonably broad skills taxonomy is a
    // strong signal; scaling saturates at 100 rather than requiring 100%
    // coverage of an arbitrary, possibly-irrelevant-to-this-resume list.
    const coverage = parsed.matchedSkillNames.length / targetSkillCount;
    return Math.round(Math.min(100, (coverage / 0.4) * 100));
  }
}
