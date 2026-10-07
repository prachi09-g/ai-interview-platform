import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnswerEvaluatorService } from './answer-evaluator.service';

describe('AnswerEvaluatorService', () => {
  let service: AnswerEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswerEvaluatorService,
        {
          provide: ConfigService,
          // No AI provider key configured — every test in this suite
          // exercises the heuristic fallback path deterministically,
          // without needing a real OpenAI call.
          useValue: { get: () => ({ provider: 'openai', openaiApiKey: undefined, geminiApiKey: undefined }) },
        },
      ],
    }).compile();

    service = module.get(AnswerEvaluatorService);
  });

  describe('keyword matching (deterministic, no AI involved)', () => {
    it('scores 100 when all keywords are present', async () => {
      const result = await service.evaluate(
        'What is REST?',
        'REST uses HTTP verbs and stateless endpoints.',
        ['REST', 'HTTP', 'stateless'],
        'REST relies on HTTP verbs and is stateless by design.',
      );
      expect(result.breakdown.keywordMatch.score).toBe(100);
      expect(result.breakdown.keywordMatch.missedKeywords).toEqual([]);
    });

    it('scores partial credit and lists missed keywords', async () => {
      const result = await service.evaluate(
        'Explain databases',
        'SQL databases are relational and support ACID transactions.',
        ['SQL', 'ACID', 'NoSQL'],
        'SQL databases are relational.',
      );
      expect(result.breakdown.keywordMatch.score).toBe(33); // 1/3 rounded
      expect(result.breakdown.keywordMatch.matchedKeywords).toEqual(['SQL']);
      expect(result.breakdown.keywordMatch.missedKeywords).toEqual(['ACID', 'NoSQL']);
    });

    it('does not false-positive on a keyword that is a substring of another word', async () => {
      const result = await service.evaluate('q', 'model', ['REST'], 'This is a RESTful API design.');
      // "RESTful" should not satisfy the "REST" keyword — word-boundary matching.
      expect(result.breakdown.keywordMatch.matchedKeywords).toEqual([]);
    });

    it('correctly matches keywords ending in non-word characters (e.g. "C++")', async () => {
      // Regression test: a plain \b-based regex fails here because \b requires
      // a word-char/non-word-char transition, and "+" followed by a space is
      // a non-word/non-word pair — \b never matches there. See the fix in
      // matchKeywords (Phase 13).
      const result = await service.evaluate('q', 'model', ['C++'], 'I write C++ for embedded systems.');
      expect(result.breakdown.keywordMatch.matchedKeywords).toEqual(['C++']);
    });

    it('gives full credit when the question has no keywords to check', async () => {
      const result = await service.evaluate('q', 'model', [], 'anything at all');
      expect(result.breakdown.keywordMatch.score).toBe(100);
    });
  });

  describe('heuristic fallback (semantic similarity / grammar / sentiment)', () => {
    it('rewards answers that share vocabulary with the model answer', async () => {
      const result = await service.evaluate(
        'q',
        'Distributed systems require consensus algorithms like Raft or Paxos for consistency.',
        [],
        'Distributed systems need consensus algorithms such as Raft for consistency.',
      );
      expect(result.breakdown.semanticSimilarity).toBeGreaterThan(50);
    });

    it('penalizes very short answers on grammar score', async () => {
      const result = await service.evaluate('q', 'A long model answer here.', [], 'idk');
      expect(result.breakdown.grammarScore).toBeLessThan(70);
    });

    it('detects positive sentiment from confidence-signaling language', async () => {
      const result = await service.evaluate(
        'q',
        'model',
        [],
        'I successfully led the project and we achieved our goals.',
      );
      expect(result.breakdown.sentiment).toBe('positive');
    });

    it('detects negative sentiment from uncertainty-signaling language', async () => {
      const result = await service.evaluate('q', 'model', [], "I'm unsure, I think I struggled with this one.");
      expect(result.breakdown.sentiment).toBe('negative');
    });

    it('produces an overall score between 0 and 100', async () => {
      const result = await service.evaluate(
        'q',
        'A reasonably detailed model answer with several key points.',
        ['keyword'],
        'A reasonably detailed answer covering the keyword and more.',
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
