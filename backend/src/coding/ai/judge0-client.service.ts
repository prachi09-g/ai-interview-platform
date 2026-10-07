import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { AppConfig } from '../../config/configuration';

const execFileAsync = promisify(execFile);

const LANGUAGE_ID_MAP: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  'c++': 54,
  c: 50,
};

export interface Judge0TestCaseResult {
  statusId: number;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  timeSeconds: number | null;
  memoryKb: number | null;
}

interface Judge0BatchSubmitResponseItem {
  token: string;
}

interface Judge0SubmissionResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

@Injectable()
export class Judge0ClientService {
  private readonly logger = new Logger(Judge0ClientService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  isConfigured(): boolean {
    const judge = this.configService.get('judge', {
      infer: true,
    });

    const app = this.configService.get('app', {
      infer: true,
    });

    /*
     * Judge0 is available in every environment when configured.
     *
     * The local JavaScript/Python runner is available only
     * outside production.
     */
    return !!judge.apiUrl || app.env !== 'production';
  }

  resolveLanguageId(language: string): number | null {
    return LANGUAGE_ID_MAP[language.toLowerCase()] ?? null;
  }

  private buildHeaders(): Record<string, string> {
    const judge = this.configService.get('judge', {
      infer: true,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!judge.apiKey) {
      return headers;
    }

    if (judge.apiUrl?.includes('rapidapi.com')) {
      headers['X-RapidAPI-Key'] = judge.apiKey;
      headers['X-RapidAPI-Host'] = new URL(
        judge.apiUrl,
      ).host;
    } else {
      headers['X-Auth-Token'] = judge.apiKey;
    }

    return headers;
  }

  async runTestCases(
    sourceCode: string,
    languageId: number,
    testCases: {
      input: string;
      expectedOutput: string;
    }[],
  ): Promise<Judge0TestCaseResult[]> {
    const judge = this.configService.get('judge', {
      infer: true,
    });

    const app = this.configService.get('app', {
      infer: true,
    });

    /*
     * Production:
     * Use Judge0 only.
     *
     * Development:
     * Use Judge0 when configured, otherwise use the
     * local JavaScript/Python development runner.
     */

    if (judge.apiUrl) {
      return this.runWithJudge0(
        judge.apiUrl,
        sourceCode,
        languageId,
        testCases,
      );
    }

    if (app.env === 'production') {
      this.logger.error(
        'JUDGE_API_URL is not configured. ' +
          'Local code execution is disabled in production.',
      );

      throw new ServiceUnavailableException(
        'Code execution is temporarily unavailable.',
      );
    }

    this.logger.warn(
      'JUDGE_API_URL is not configured. ' +
        'Using LOCAL DEVELOPMENT code runner.',
    );

    return this.runLocally(
      sourceCode,
      languageId,
      testCases,
    );
  }

  private async runLocally(
    sourceCode: string,
    languageId: number,
    testCases: {
      input: string;
      expectedOutput: string;
    }[],
  ): Promise<Judge0TestCaseResult[]> {
    if (languageId !== 63 && languageId !== 71) {
      throw new ServiceUnavailableException(
        'Local development runner currently supports only JavaScript and Python.',
      );
    }

    const results: Judge0TestCaseResult[] = [];

    for (const testCase of testCases) {
      const result =
        languageId === 63
          ? await this.runJavaScriptLocally(
              sourceCode,
              testCase.input,
              testCase.expectedOutput,
            )
          : await this.runPythonLocally(
              sourceCode,
              testCase.input,
              testCase.expectedOutput,
            );

      results.push(result);
    }

    return results;
  }

  private async runJavaScriptLocally(
    sourceCode: string,
    input: string,
    expectedOutput: string,
  ): Promise<Judge0TestCaseResult> {
    const directory = await mkdtemp(
      join(tmpdir(), 'ai-interview-js-'),
    );

    const filePath = join(
      directory,
      'solution.js',
    );

    /*
     * Student JavaScript solutions define:
     *
     * function solve(input) {
     *   ...
     * }
     *
     * This harness calls solve() and prints
     * the returned value.
     */
    const executableCode = `
${sourceCode}

(async () => {
  try {
    if (typeof solve !== 'function') {
      throw new Error(
        'Your solution must define a function named solve(input).'
      );
    }

    const input = ${JSON.stringify(input)};
    const result = await solve(input);

    if (result !== undefined && result !== null) {
      process.stdout.write(String(result));
    }
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.stack
        : String(error)
    );

    process.exit(1);
  }
})();
`;

    try {
      await writeFile(
        filePath,
        executableCode,
        'utf8',
      );

      const startedAt = Date.now();

      try {
        const { stdout, stderr } =
          await execFileAsync(
            process.execPath,
            [filePath],
            {
              cwd: directory,
              timeout: 5000,
              windowsHide: true,
              maxBuffer: 1024 * 1024,
            },
          );

        const runtimeSeconds =
          (Date.now() - startedAt) / 1000;

        const actual =
          this.normalizeOutput(stdout);

        const expected =
          this.normalizeOutput(expectedOutput);

        const passed =
          actual === expected;

        return {
          statusId: passed ? 3 : 4,

          statusDescription: passed
            ? 'Accepted'
            : 'Wrong Answer',

          stdout: stdout || null,
          stderr: stderr || null,
          compileOutput: null,
          timeSeconds: runtimeSeconds,
          memoryKb: null,
        };
      } catch (error) {
        const runtimeSeconds =
          (Date.now() - startedAt) / 1000;

        const executionError = error as {
          stdout?: string;
          stderr?: string;
          killed?: boolean;
          signal?: string;
          message?: string;
        };

        const timedOut =
          executionError.killed === true ||
          executionError.signal === 'SIGTERM';

        return {
          statusId: timedOut ? 5 : 11,

          statusDescription: timedOut
            ? 'Time Limit Exceeded'
            : 'Runtime Error',

          stdout:
            executionError.stdout || null,

          stderr:
            executionError.stderr ||
            executionError.message ||
            null,

          compileOutput: null,
          timeSeconds: runtimeSeconds,
          memoryKb: null,
        };
      }
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }

  private async runPythonLocally(
    sourceCode: string,
    input: string,
    expectedOutput: string,
  ): Promise<Judge0TestCaseResult> {
    const directory = await mkdtemp(
      join(tmpdir(), 'ai-interview-python-'),
    );

    const filePath = join(
      directory,
      'solution.py',
    );

    /*
     * Student Python solutions define:
     *
     * def solve(input):
     *     ...
     *
     * This harness calls solve() and prints
     * the returned value.
     */
    const executableCode = `
${sourceCode}

if __name__ == "__main__":
    try:
        if "solve" not in globals():
            raise Exception(
                "Your solution must define a function named solve(input)."
            )

        input_data = ${JSON.stringify(input)}
        result = solve(input_data)

        if result is not None:
            print(result, end="")
    except Exception:
        import traceback
        traceback.print_exc()
        raise
`;

    try {
      await writeFile(
        filePath,
        executableCode,
        'utf8',
      );

      const startedAt = Date.now();

      try {
        let executionResult;

        try {
          executionResult =
            await execFileAsync(
              'python',
              [filePath],
              {
                cwd: directory,
                timeout: 5000,
                windowsHide: true,
                maxBuffer: 1024 * 1024,
              },
            );
        } catch (firstError) {
          const typedError =
            firstError as {
              code?: string;
            };

          if (typedError.code !== 'ENOENT') {
            throw firstError;
          }

          executionResult =
            await execFileAsync(
              'py',
              [filePath],
              {
                cwd: directory,
                timeout: 5000,
                windowsHide: true,
                maxBuffer: 1024 * 1024,
              },
            );
        }

        const runtimeSeconds =
          (Date.now() - startedAt) / 1000;

        const actual =
          this.normalizeOutput(
            executionResult.stdout,
          );

        const expected =
          this.normalizeOutput(
            expectedOutput,
          );

        const passed =
          actual === expected;

        return {
          statusId: passed ? 3 : 4,

          statusDescription: passed
            ? 'Accepted'
            : 'Wrong Answer',

          stdout:
            executionResult.stdout || null,

          stderr:
            executionResult.stderr || null,

          compileOutput: null,
          timeSeconds: runtimeSeconds,
          memoryKb: null,
        };
      } catch (error) {
        const runtimeSeconds =
          (Date.now() - startedAt) / 1000;

        const executionError = error as {
          stdout?: string;
          stderr?: string;
          killed?: boolean;
          signal?: string;
          message?: string;
        };

        const timedOut =
          executionError.killed === true ||
          executionError.signal === 'SIGTERM';

        return {
          statusId: timedOut ? 5 : 11,

          statusDescription: timedOut
            ? 'Time Limit Exceeded'
            : 'Runtime Error',

          stdout:
            executionError.stdout || null,

          stderr:
            executionError.stderr ||
            executionError.message ||
            null,

          compileOutput: null,
          timeSeconds: runtimeSeconds,
          memoryKb: null,
        };
      }
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }

  private normalizeOutput(
    value: string,
  ): string {
    return value
      .replace(/\r\n/g, '\n')
      .trim();
  }

  private async runWithJudge0(
    apiUrl: string,
    sourceCode: string,
    languageId: number,
    testCases: {
      input: string;
      expectedOutput: string;
    }[],
  ): Promise<Judge0TestCaseResult[]> {
    const encode = (value: string) =>
      Buffer.from(value).toString(
        'base64',
      );

    const submissions =
      testCases.map((testCase) => ({
        source_code:
          encode(sourceCode),

        language_id:
          languageId,

        stdin:
          encode(testCase.input),

        expected_output:
          encode(
            testCase.expectedOutput,
          ),
      }));

    const batchResponse =
      await fetch(
        `${apiUrl}/submissions/batch?base64_encoded=true`,
        {
          method: 'POST',

          headers:
            this.buildHeaders(),

          body: JSON.stringify({
            submissions,
          }),
        },
      );

    if (!batchResponse.ok) {
      const body =
        await batchResponse.text();

      this.logger.error(
        `Judge0 batch submit failed: ${batchResponse.status} ${body}`,
      );

      throw new ServiceUnavailableException(
        'Code execution service rejected the submission.',
      );
    }

    const created =
      (await batchResponse.json()) as
        Judge0BatchSubmitResponseItem[];

    const tokens = created
      .map((item) => item.token)
      .join(',');

    return this.pollBatchUntilDone(
      apiUrl,
      tokens,
      testCases.length,
    );
  }

  private async pollBatchUntilDone(
    baseUrl: string,
    tokens: string,
    expectedCount: number,
    maxAttempts = 15,
    delayMs = 1500,
  ): Promise<Judge0TestCaseResult[]> {
    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {
      const response =
        await fetch(
          `${baseUrl}/submissions/batch?tokens=${tokens}&base64_encoded=true&fields=token,status,stdout,stderr,compile_output,time,memory`,
          {
            headers:
              this.buildHeaders(),
          },
        );

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Code execution service became unreachable while polling.',
        );
      }

      const body =
        (await response.json()) as {
          submissions:
            Judge0SubmissionResult[];
        };

      const results =
        body.submissions;

      const stillRunning =
        results.some(
          (result) =>
            result.status.id === 1 ||
            result.status.id === 2,
        );

      if (
        !stillRunning &&
        results.length === expectedCount
      ) {
        return results.map(
          (result) => ({
            statusId:
              result.status.id,

            statusDescription:
              result.status.description,

            stdout:
              result.stdout
                ? Buffer.from(
                    result.stdout,
                    'base64',
                  ).toString('utf8')
                : null,

            stderr:
              result.stderr
                ? Buffer.from(
                    result.stderr,
                    'base64',
                  ).toString('utf8')
                : null,

            compileOutput:
              result.compile_output
                ? Buffer.from(
                    result.compile_output,
                    'base64',
                  ).toString('utf8')
                : null,

            timeSeconds:
              result.time
                ? parseFloat(
                    result.time,
                  )
                : null,

            memoryKb:
              result.memory,
          }),
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delayMs,
          ),
      );
    }

    throw new ServiceUnavailableException(
      'Code execution timed out waiting for results.',
    );
  }
}