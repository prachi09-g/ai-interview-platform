import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

export interface EvaluationBreakdown {
  keywordMatch: { score: number; matchedKeywords: string[]; missedKeywords: string[] };
  semanticSimilarity: number; // 0-100
  grammarScore: number; // 0-100
  sentiment: 'positive' | 'neutral' | 'negative';
  feedback: string;
}

export interface EvaluationResult {
  score: number; // 0-100 overall, weighted combination of the sub-scores
  breakdown: EvaluationBreakdown;
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

interface AiJudgedFields {
  semanticSimilarity: number;
  grammarScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  feedback: string;
}

/**
 * Splits evaluation into what's genuinely mechanical (keyword matching —
 * deterministic word-boundary matching against the question's keyword
 * list, same technique as ResumeParserService's skill matching) versus
 * what benefits from language understanding (semantic similarity to the
 * model answer, grammar quality, tone) — the latter via a real LLM call
 * when configured, with a heuristic fallback so evaluation still works
 * without an API key, exactly like ResumeAiService's pattern.
 */
@Injectable()
export class AnswerEvaluatorService {
  private readonly logger = new Logger(AnswerEvaluatorService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async evaluate(
    questionText: string,
    modelAnswer: string,
    keywords: string[],
    transcript: string,
  ): Promise<EvaluationResult> {
    const keywordMatch = this.matchKeywords(transcript, keywords);
    const aiJudged = await this.getAiJudgedFields(questionText, modelAnswer, transcript);

    const score = Math.round(
      keywordMatch.score * 0.3 + aiJudged.semanticSimilarity * 0.5 + aiJudged.grammarScore * 0.2,
    );

    return {
      score,
      breakdown: { keywordMatch, ...aiJudged },
    };
  }

  private matchKeywords(transcript: string, keywords: string[]) {
    if (keywords.length === 0) {
      return { score: 100, matchedKeywords: [], missedKeywords: [] };
    }

    const matched: string[] = [];
    const missed: string[] = [];

    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Lookaround-based boundary, not \b: \b requires one side of the
      // match to be a word character, which fails for keywords ending in
      // non-word characters (e.g. "C++", "C#") — both the "+" and a
      // following space are non-word, so \b+$ never matches there.
      // Verified against this exact case before fixing (see Phase 13).
      const found = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(transcript);
      (found ? matched : missed).push(keyword);
    }

    return {
      score: Math.round((matched.length / keywords.length) * 100),
      matchedKeywords: matched,
      missedKeywords: missed,
    };
  }

  private async getAiJudgedFields(
    questionText: string,
    modelAnswer: string,
    transcript: string,
  ): Promise<AiJudgedFields> {
    const ai = this.configService.get('ai', { infer: true });
    const apiKey = ai.provider === 'openai' ? ai.openaiApiKey : ai.geminiApiKey;

    if (!apiKey) {
      this.logger.warn(
        `${ai.provider.toUpperCase()}_API_KEY is not configured — using the heuristic fallback for answer evaluation.`,
      );
      return this.heuristicFallback(modelAnswer, transcript);
    }

    if (ai.provider !== 'openai') {
      this.logger.warn('AI_PROVIDER=gemini answer evaluation is not yet wired — using the heuristic fallback.');
      return this.heuristicFallback(modelAnswer, transcript);
    }

    try {
      return await this.callOpenAi(apiKey, questionText, modelAnswer, transcript);
    } catch (error) {
      this.logger.error(
        'AI evaluation call failed — falling back to heuristic analysis',
        error instanceof Error ? error.stack : undefined,
      );
      return this.heuristicFallback(modelAnswer, transcript);
    }
  }

  private async callOpenAi(
    apiKey: string,
    questionText: string,
    modelAnswer: string,
    transcript: string,
  ): Promise<AiJudgedFields> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert interview coach grading a candidate\'s spoken/written answer. Respond ONLY with ' +
              'a JSON object: {"semanticSimilarity": number, "grammarScore": number, "sentiment": "positive"|' +
              '"neutral"|"negative", "feedback": string}. semanticSimilarity (0-100): how well the answer covers ' +
              'the same substance as the model answer, not exact wording. grammarScore (0-100): grammatical and ' +
              'structural clarity. sentiment: overall tone/confidence of the answer. feedback: 1-2 sentences of ' +
              'specific, actionable feedback for the candidate. No markdown, no prose outside the JSON.',
          },
          {
            role: 'user',
            content: [
              `Question: ${questionText}`,
              `Model answer (reference, not shown to candidate): ${modelAnswer}`,
              `Candidate's answer: ${transcript}`,
            ].join('\n\n'),
          },
        ],
      }),
    });

    const body = (await response.json()) as OpenAiChatResponse;
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${body.error?.message ?? response.statusText}`);
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI response contained no content');
    }

    const parsed = JSON.parse(content) as Partial<AiJudgedFields>;
    return {
      semanticSimilarity: this.clampScore(parsed.semanticSimilarity),
      grammarScore: this.clampScore(parsed.grammarScore),
      sentiment: parsed.sentiment ?? 'neutral',
      feedback: parsed.feedback ?? 'No specific feedback available.',
    };
  }

  private clampScore(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 50;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  /**
   * Deterministic, no-API-key-required fallback: word-overlap ratio
   * against the model answer as a crude semantic-similarity proxy, a
   * simple sentence-length/punctuation heuristic for grammar, and a tiny
   * lexicon for sentiment. Far less insightful than a real LLM judgment,
   * but always available and reproducible.
   */
  private heuristicFallback(modelAnswer: string, transcript: string): AiJudgedFields {
    const normalize = (text: string) =>
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3), // skip short stopword-ish tokens
      );

    const modelWords = normalize(modelAnswer);
    const answerWords = normalize(transcript);
    const overlap = [...modelWords].filter((w) => answerWords.has(w)).length;
    const semanticSimilarity =
      modelWords.size === 0 ? 50 : Math.round(Math.min(100, (overlap / modelWords.size) * 150));

    const wordCount = transcript.trim().split(/\s+/).length;
    let grammarScore = 70;
    if (wordCount < 10) grammarScore -= 20; // likely too terse to demonstrate grammatical structure
    if (!/[.!?]$/.test(transcript.trim())) grammarScore -= 10; // no terminal punctuation
    grammarScore = Math.max(0, Math.min(100, grammarScore));

    const positiveWords = ['confident', 'successfully', 'improved', 'achieved', 'led', 'solved'];
    const negativeWords = ['failed', 'unsure', 'confused', "don't know", 'struggled'];
    const lower = transcript.toLowerCase();
    const positiveHits = positiveWords.filter((w) => lower.includes(w)).length;
    const negativeHits = negativeWords.filter((w) => lower.includes(w)).length;
    const sentiment: AiJudgedFields['sentiment'] =
      positiveHits > negativeHits ? 'positive' : negativeHits > positiveHits ? 'negative' : 'neutral';

    return {
      semanticSimilarity,
      grammarScore,
      sentiment,
      feedback:
        wordCount < 20
          ? 'Try to elaborate further — a short answer often means missed opportunities to show depth.'
          : 'Answer covers reasonable ground — consider structuring it around a clear example for more impact.',
    };
  }
}
