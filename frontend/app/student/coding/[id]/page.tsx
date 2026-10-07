'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Play, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WaveformPulse } from '@/components/shared/waveform';
import { codingService } from '@/services/coding.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import type { Difficulty, SubmissionStatus } from '@/types/coding.types';
import { cn } from '@/lib/utils';

const difficultyVariant: Record<Difficulty, 'success' | 'secondary' | 'destructive'> = {
  EASY: 'success',
  MEDIUM: 'secondary',
  HARD: 'destructive',
};

const STARTER_SNIPPETS: Record<string, string> = {
  javascript: '// Write your solution here\nfunction solve(input) {\n  \n}\n',
  typescript: '// Write your solution here\nfunction solve(input: string): string {\n  \n}\n',
  python: '# Write your solution here\ndef solve(input):\n    pass\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

export default function CodingQuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const questionId = params.id;
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  const { data: question, isLoading } = useQuery({
    queryKey: ['coding', 'questions', questionId],
    queryFn: () => codingService.getQuestion(questionId),
  });

  useEffect(() => {
    if (question && !language) {
      const firstLang = question.supportedLanguages[0];
      setLanguage(firstLang);
      setCode(STARTER_SNIPPETS[firstLang] ?? '// Write your solution here\n');
    }
  }, [question, language]);

  const { data: submissionsResult } = useQuery({
    queryKey: ['coding', 'submissions', questionId],
    queryFn: () => codingService.listSubmissions({ questionId, limit: 5 }),
  });

  const { data: activeSubmission } = useQuery({
    queryKey: ['coding', 'submission', activeSubmissionId],
    queryFn: () => codingService.getSubmission(activeSubmissionId!),
    enabled: !!activeSubmissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'RUNNING' ? POLL_INTERVAL_MS : false;
    },
  });

  useEffect(() => {
    if (!activeSubmission) return;
    if (activeSubmission.status === 'PENDING' || activeSubmission.status === 'RUNNING') {
      setPollAttempts((n) => n + 1);
    } else {
      queryClient.invalidateQueries({ queryKey: ['coding', 'submissions', questionId] });
    }
  }, [activeSubmission, queryClient, questionId]);

  const submit = useMutation({
    mutationFn: () => codingService.submit(questionId, language!, code),
    onSuccess: (submission) => {
      setActiveSubmissionId(submission.id);
      setPollAttempts(0);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not submit your code')),
  });

  if (isLoading || !question) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isRunning = activeSubmission?.status === 'PENDING' || activeSubmission?.status === 'RUNNING';
  const timedOut = isRunning && pollAttempts >= MAX_POLL_ATTEMPTS;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{question.title}</h1>
          <Badge variant={difficultyVariant[question.difficulty]}>{question.difficulty}</Badge>
          <Badge variant="outline">{question.category.name}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {question.description}
            </CardContent>
          </Card>

          {question.visibleTestCase && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Input: </span>
                  {question.visibleTestCase.input}
                </div>
                <div>
                  <span className="text-muted-foreground">Output: </span>
                  {question.visibleTestCase.expectedOutput}
                </div>
                {question.hiddenTestCaseCount > 0 && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    +{question.hiddenTestCaseCount} hidden test case(s) used for grading.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {submissionsResult && submissionsResult.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your submissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submissionsResult.items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground">{s.language}</span>
                    <SubmissionStatusBadge status={s.status} score={s.score} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Solution</CardTitle>
              <div className="flex gap-1">
                {question.supportedLanguages.map((lang) => (
                  <Button
                    key={lang}
                    size="sm"
                    variant={language === lang ? 'default' : 'ghost'}
                    onClick={() => {
                      setLanguage(lang);
                      setCode(STARTER_SNIPPETS[lang] ?? '// Write your solution here\n');
                    }}
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    setCode(code.slice(0, start) + '  ' + code.slice(end));
                    requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
                  }
                }}
                spellCheck={false}
                rows={16}
                className="w-full rounded-md border border-input bg-ink px-3 py-2 font-mono text-sm text-white/90 shadow-sm"
              />

              {isRunning ? (
                <div className="flex items-center justify-center gap-3 rounded-md border border-dashed py-4">
                  <WaveformPulse bars={12} className="h-6" />
                  <span className="text-sm text-muted-foreground">
                    {timedOut ? 'Still running — this is taking longer than usual…' : 'Running your code…'}
                  </span>
                </div>
              ) : (
                <Button className="w-full" disabled={submit.isPending || !language} onClick={() => submit.mutate()}>
                  <Play className="mr-2 h-4 w-4" />
                  {submit.isPending ? 'Submitting…' : 'Run & submit'}
                </Button>
              )}

              {activeSubmission && !isRunning && (
                <div
                  className={cn(
                    'rounded-md border p-4',
                    activeSubmission.status === 'PASSED' && 'border-success/40 bg-success/5',
                    activeSubmission.status === 'FAILED' && 'border-destructive/40 bg-destructive/5',
                    activeSubmission.status === 'ERROR' && 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <SubmissionStatusBadge status={activeSubmission.status} score={activeSubmission.score} />
                    {activeSubmission.runtimeMs !== null && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {activeSubmission.runtimeMs}ms
                      </span>
                    )}
                  </div>
                  {activeSubmission.status === 'ERROR' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Something went wrong running your code — check for compile errors and try again.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubmissionStatusBadge({ status, score }: { status: SubmissionStatus; score: number | null }) {
  if (status === 'PASSED') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Passed {score !== null && `(${score}%)`}
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed {score !== null && `(${score}%)`}
      </Badge>
    );
  }
  if (status === 'ERROR') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      {status === 'RUNNING' ? 'Running' : 'Pending'}
    </Badge>
  );
}
