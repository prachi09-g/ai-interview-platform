import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import pdfParse from 'pdf-parse';

export interface ParsedResume {
  rawText: string;
  wordCount: number;
  sections: {
    hasContactInfo: boolean;
    hasSummary: boolean;
    hasEducation: boolean;
    hasExperience: boolean;
    hasSkillsSection: boolean;
    hasProjects: boolean;
  };
  emails: string[];
  phones: string[];
  /** Skill names (from the shared taxonomy) that were found mentioned in the resume text. */
  matchedSkillNames: string[];
}

const SECTION_PATTERNS: Record<keyof ParsedResume['sections'], RegExp> = {
  hasContactInfo: /email|phone|linkedin|github/i,
  hasSummary: /\b(summary|objective|profile)\b/i,
  hasEducation: /\b(education|university|college|bachelor|master|b\.?tech|b\.?sc|degree)\b/i,
  hasExperience: /\b(experience|employment|work history|internship)\b/i,
  hasSkillsSection: /\b(skills|technologies|technical skills|tech stack)\b/i,
  hasProjects: /\b(projects?|portfolio)\b/i,
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  async parse(buffer: Buffer, knownSkillNames: string[]): Promise<ParsedResume> {
    let rawText: string;
    try {
      const result = await pdfParse(buffer);
      rawText = result.text as string;
    } catch (error) {
      this.logger.error('Failed to parse PDF', error instanceof Error ? error.stack : undefined);
      throw new BadRequestException('Could not read this PDF. Please upload a valid, non-encrypted PDF file.');
    }

    if (!rawText || rawText.trim().length < 20) {
      throw new BadRequestException(
        'This PDF appears to have no extractable text (it may be a scanned image). ' +
          'Please upload a text-based PDF resume.',
      );
    }

    const sections = Object.fromEntries(
      Object.entries(SECTION_PATTERNS).map(([key, pattern]) => [key, pattern.test(rawText)]),
    ) as ParsedResume['sections'];

    const matchedSkillNames = knownSkillNames.filter((skill) => {
      // Word-boundary match, case-insensitive; escape regex special chars
      // in skill names like "C++" or "C#" so they don't break the pattern.
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(rawText);
    });

    return {
      rawText,
      wordCount: rawText.trim().split(/\s+/).length,
      sections,
      emails: [...new Set(rawText.match(EMAIL_REGEX) ?? [])],
      phones: [...new Set(rawText.match(PHONE_REGEX) ?? [])],
      matchedSkillNames,
    };
  }
}
