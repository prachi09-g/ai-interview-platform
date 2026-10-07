import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import type { ParsedResume } from './resume-parser.service';

export interface ResumeAiResult {
  missingSkills: string[];
  suggestions: string[];
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

@Injectable()
export class ResumeAiService {
  private readonly logger = new Logger(ResumeAiService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async generateSuggestions(
    parsed: ParsedResume,
    targetJobRole: string | undefined,
    allSkillNames: string[],
  ): Promise<ResumeAiResult> {
    const ai = this.configService.get('ai', { infer: true });
    const apiKey = ai.provider === 'openai' ? ai.openaiApiKey : ai.geminiApiKey;

    if (!apiKey) {
      this.logger.warn(
        `${ai.provider.toUpperCase()}_API_KEY is not configured — using the heuristic fallback for resume ` +
          'suggestions instead of a real LLM call. Configure backend/.env for AI-generated suggestions.',
      );
      return this.heuristicFallback(parsed, allSkillNames);
    }

    try {
      if (ai.provider === 'openai') {
        return await this.callOpenAi(apiKey, parsed, targetJobRole, allSkillNames);
      }
      // Gemini support: same JSON-mode prompt contract, different endpoint —
      // left as a follow-up since OPENAI_API_KEY is the primary configured
      // path (AI_PROVIDER defaults to "openai" in .env.example). Falling
      // back rather than silently no-op-ing keeps the feature working.
      this.logger.warn('AI_PROVIDER=gemini is not yet wired to a live call — using the heuristic fallback.');
      return this.heuristicFallback(parsed, allSkillNames);
    } catch (error) {
      this.logger.error(
        'AI suggestion call failed — falling back to heuristic analysis',
        error instanceof Error ? error.stack : undefined,
      );
      return this.heuristicFallback(parsed, allSkillNames);
    }
  }

  private async callOpenAi(
    apiKey: string,
    parsed: ParsedResume,
    targetJobRole: string | undefined,
    allSkillNames: string[],
  ): Promise<ResumeAiResult> {
    const prompt = this.buildPrompt(parsed, targetJobRole, allSkillNames);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert technical resume reviewer and ATS specialist. ' +
              'Respond ONLY with a JSON object matching: {"missingSkills": string[], "suggestions": string[]}. ' +
              'missingSkills: 3-8 relevant skills for the target role not evidenced in the resume. ' +
              'suggestions: 3-6 concise, specific, actionable improvement suggestions (e.g. "Quantify the impact ' +
              'of Project X with metrics", "Add a Certifications section"). No markdown, no prose outside the JSON.',
          },
          { role: 'user', content: prompt },
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

    const parsedResult = JSON.parse(content) as Partial<ResumeAiResult>;
    return {
      missingSkills: Array.isArray(parsedResult.missingSkills) ? parsedResult.missingSkills : [],
      suggestions: Array.isArray(parsedResult.suggestions) ? parsedResult.suggestions : [],
    };
  }

  private buildPrompt(parsed: ParsedResume, targetJobRole: string | undefined, allSkillNames: string[]): string {
    return [
      `Target job role: ${targetJobRole ?? 'Not specified — infer from resume content'}`,
      `Skills already evidenced in the resume: ${parsed.matchedSkillNames.join(', ') || 'none detected'}`,
      `Skills taxonomy to consider for gaps (only suggest ones NOT already evidenced): ${allSkillNames.join(', ')}`,
      `Resume sections detected: ${Object.entries(parsed.sections)
        .filter(([, present]) => present)
        .map(([name]) => name)
        .join(', ')}`,
      '',
      'Resume text:',
      parsed.rawText.slice(0, 6000), // keep the prompt bounded regardless of resume length
    ].join('\n');
  }

  /**
   * Deterministic, no-API-key-required fallback: recommends skills from the
   * shared taxonomy the resume doesn't mention, and generates suggestions
   * from the section-presence gaps the parser already detected. Not as
   * insightful as a real LLM call, but genuinely useful and always available.
   */
  private heuristicFallback(parsed: ParsedResume, allSkillNames: string[]): ResumeAiResult {
    const matched = new Set(parsed.matchedSkillNames.map((s) => s.toLowerCase()));
    const missingSkills = allSkillNames.filter((skill) => !matched.has(skill.toLowerCase())).slice(0, 8);

    const suggestions: string[] = [];
    if (!parsed.sections.hasSummary) {
      suggestions.push('Add a brief summary/objective at the top stating your target role and top strengths.');
    }
    if (!parsed.sections.hasSkillsSection) {
      suggestions.push('Add a dedicated Skills section listing your technical skills — this is a common ATS keyword-matching target.');
    }
    if (!parsed.sections.hasProjects) {
      suggestions.push('Add a Projects section — concrete projects are strong signal for early-career candidates.');
    }
    if (parsed.emails.length === 0 || parsed.phones.length === 0) {
      suggestions.push('Make sure your email and phone number are in plain text, not inside an image or text box.');
    }
    if (parsed.wordCount > 1200) {
      suggestions.push('Your resume is quite long — aim for one page (two for senior roles) by cutting older/less relevant experience.');
    }
    if (parsed.wordCount < 150) {
      suggestions.push('Your resume looks very short — add more detail to your experience and projects (quantified achievements, technologies used).');
    }
    if (missingSkills.length > 0) {
      suggestions.push(`Consider adding evidence of: ${missingSkills.slice(0, 3).join(', ')} if you have relevant experience.`);
    }
    if (suggestions.length === 0) {
      suggestions.push('Your resume covers the key structural sections well — focus on quantifying achievements with metrics.');
    }

    return { missingSkills, suggestions };
  }
}
