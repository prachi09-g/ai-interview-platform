import { Test, TestingModule } from '@nestjs/testing';
import { AtsScorerService } from './ats-scorer.service';
import type { ParsedResume } from './resume-parser.service';

function makeParsed(overrides: Partial<ParsedResume> = {}): ParsedResume {
  return {
    rawText: 'x'.repeat(500),
    wordCount: 500,
    sections: {
      hasContactInfo: true,
      hasSummary: true,
      hasEducation: true,
      hasExperience: true,
      hasSkillsSection: true,
      hasProjects: true,
    },
    emails: ['jane@example.com'],
    phones: ['555-1234'],
    matchedSkillNames: ['TypeScript', 'React', 'PostgreSQL', 'Docker'],
    ...overrides,
  };
}

describe('AtsScorerService', () => {
  let service: AtsScorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AtsScorerService],
    }).compile();
    service = module.get(AtsScorerService);
  });

  it('gives a well-formed resume a high score across all sections', () => {
    const result = service.score(makeParsed(), 10);
    expect(result.sectionScores.formatting).toBe(100);
    expect(result.sectionScores.structure).toBe(100); // all 6 sections present
    expect(result.atsScore).toBeGreaterThan(80);
  });

  it('penalizes a resume with no extractable email or phone', () => {
    const result = service.score(makeParsed({ emails: [], phones: [] }), 10);
    // 100 - 30 (no email) - 15 (no phone) = 55
    expect(result.sectionScores.formatting).toBe(55);
  });

  it('penalizes a resume that is too short to have real content', () => {
    const result = service.score(makeParsed({ wordCount: 50 }), 10);
    expect(result.sectionScores.formatting).toBe(70); // 100 - 30
  });

  it('penalizes an overly long resume less severely than a too-short one', () => {
    const tooShort = service.score(makeParsed({ wordCount: 50 }), 10);
    const tooLong = service.score(makeParsed({ wordCount: 1500 }), 10);
    expect(tooLong.sectionScores.formatting).toBeGreaterThan(tooShort.sectionScores.formatting);
  });

  it('scores structure proportionally to how many sections were detected', () => {
    const oneSection = service.score(
      makeParsed({
        sections: {
          hasContactInfo: true,
          hasSummary: false,
          hasEducation: false,
          hasExperience: false,
          hasSkillsSection: false,
          hasProjects: false,
        },
      }),
      10,
    );
    // 1/6 sections -> round(100/6) = 17
    expect(oneSection.sectionScores.structure).toBe(17);
  });

  it('returns a neutral keyword score when there is no skill taxonomy to compare against', () => {
    const result = service.score(makeParsed(), 0);
    expect(result.sectionScores.keywords).toBe(50);
  });

  it('gives full keyword credit once coverage reaches the 40% saturation point', () => {
    // 4 matched skills out of 10 target = 40% coverage = the saturation point
    const result = service.score(makeParsed({ matchedSkillNames: ['a', 'b', 'c', 'd'] }), 10);
    expect(result.sectionScores.keywords).toBe(100);
  });

  it('gives zero keyword credit when nothing matched', () => {
    const result = service.score(makeParsed({ matchedSkillNames: [] }), 10);
    expect(result.sectionScores.keywords).toBe(0);
  });

  it('never produces a score outside 0-100 regardless of extreme inputs', () => {
    const worst = service.score(
      makeParsed({
        emails: [],
        phones: [],
        wordCount: 10,
        sections: {
          hasContactInfo: false,
          hasSummary: false,
          hasEducation: false,
          hasExperience: false,
          hasSkillsSection: false,
          hasProjects: false,
        },
        matchedSkillNames: [],
      }),
      10,
    );
    expect(worst.atsScore).toBeGreaterThanOrEqual(0);
    expect(worst.atsScore).toBeLessThanOrEqual(100);
  });
});
