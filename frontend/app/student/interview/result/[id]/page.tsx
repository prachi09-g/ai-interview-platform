'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Award, ChevronDown, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { interviewService } from '@/services/interview.service';
import { cn } from '@/lib/utils';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-primary';
  return 'text-destructive';
}

export default function InterviewResultPage() {
  const params = useParams<{ id: string }>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interviews', params.id],
    queryFn: () => interviewService.getOne(params.id),
  });

  if (isLoading || !interview) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card className="overflow-hidden border-none bg-ink text-white">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              {interview.category.name} · {interview.type}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Interview complete</h1>
            <p className="mt-1 text-sm text-white/70">
              {interview.responses.length} question{interview.responses.length === 1 ? '' : 's'} answered
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-5xl font-bold text-primary">{interview.overallScore}</p>
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">/ 100</p>
          </div>
        </CardContent>
      </Card>

      {interview.overallScore !== null && interview.overallScore >= 80 && (
        <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 p-4">
          <Trophy className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm">
            Strong performance! Check your{' '}
            <Link href="/student/achievements" className="font-medium text-success underline">
              achievements
            </Link>{' '}
            — this may have unlocked a new badge.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Question breakdown</h2>
        {interview.responses.map((response, index) => {
          const isOpen = expandedId === response.id;
          return (
            <Card key={response.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setExpandedId(isOpen ? null : response.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">Q{index + 1}</span>
                  <p className="text-sm font-medium">{response.question?.questionText}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('font-mono text-lg font-semibold', scoreColor(response.score ?? 0))}>
                    {response.score ?? '—'}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                </div>
              </button>
              {isOpen && (
                <CardContent className="space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Your answer</p>
                    <p className="mt-1 text-sm">{response.transcript}</p>
                  </div>
                  {response.evaluationBreakdown && (
                    <>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-md bg-secondary p-2">
                          <p className="font-mono text-lg font-semibold">
                            {response.evaluationBreakdown.keywordMatch.score}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">Keywords</p>
                        </div>
                        <div className="rounded-md bg-secondary p-2">
                          <p className="font-mono text-lg font-semibold">
                            {response.evaluationBreakdown.semanticSimilarity}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">Relevance</p>
                        </div>
                        <div className="rounded-md bg-secondary p-2">
                          <p className="font-mono text-lg font-semibold">
                            {response.evaluationBreakdown.grammarScore}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">Grammar</p>
                        </div>
                      </div>
                      {response.evaluationBreakdown.keywordMatch.missedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Missed:</span>
                          {response.evaluationBreakdown.keywordMatch.missedKeywords.map((k) => (
                            <Badge key={k} variant="outline">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="rounded-md bg-primary/5 p-3 text-sm">
                        <Award className="mr-1 inline h-3 w-3 text-primary" />
                        {response.evaluationBreakdown.feedback}
                      </p>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/student/history">View history</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/student/interview/setup">Practice again</Link>
        </Button>
      </div>
    </div>
  );
}
