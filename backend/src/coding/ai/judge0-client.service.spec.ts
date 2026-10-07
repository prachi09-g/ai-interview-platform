import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Judge0ClientService } from './judge0-client.service';

describe('Judge0ClientService', () => {
  async function build(judgeConfig: { apiUrl?: string; apiKey?: string }) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Judge0ClientService,
        { provide: ConfigService, useValue: { get: () => judgeConfig } },
      ],
    }).compile();
    return module.get(Judge0ClientService);
  }

  describe('isConfigured', () => {
    it('returns false when JUDGE_API_URL is not set', async () => {
      const service = await build({});
      expect(service.isConfigured()).toBe(false);
    });

    it('returns true when JUDGE_API_URL is set', async () => {
      const service = await build({ apiUrl: 'https://judge0.example.com' });
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('resolveLanguageId', () => {
    it('resolves known languages case-insensitively', async () => {
      const service = await build({});
      expect(service.resolveLanguageId('javascript')).toBe(63);
      expect(service.resolveLanguageId('JavaScript')).toBe(63);
      expect(service.resolveLanguageId('PYTHON')).toBe(71);
    });

    it('resolves "c++" and "cpp" to the same language ID', async () => {
      const service = await build({});
      expect(service.resolveLanguageId('cpp')).toBe(service.resolveLanguageId('c++'));
    });

    it('returns null for an unmapped language', async () => {
      const service = await build({});
      expect(service.resolveLanguageId('cobol')).toBeNull();
    });
  });
});
