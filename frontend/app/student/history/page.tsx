'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, History as HistoryIcon, Mic } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { interviewService } from '@/services/interview.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import type { InterviewStatus } from '@/types/dashboard.types';

const statusVariant: Record<InterviewStatus, 'default' | 'success' | 'secondary'> = {
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  ABANDONED: 'secondary',
};

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', 'history', page],
    queryFn: () => interviewService.listHistory({ page, limit: 10 }),
  });

  const toggleBookmark = useMutation({
    mutationFn: (id: string) => interviewService.toggleBookmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews', 'history'] }),
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update bookmark')),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">History</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Interview history</h1>
        <p className="mt-1 text-muted-foreground">Every mock interview you&apos;ve attempted, in one place.</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title="No interviews yet"
          description="Every session you complete will show up here with its score and a link to full feedback."
          action={
            <Button asChild>
              <Link href="/student/interview/setup">
                <Mic className="mr-2 h-4 w-4" />
                Start a mock interview
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((interview) => (
            <Card key={interview.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{interview.category.name}</span>
                    <Badge variant={statusVariant[interview.status]}>{interview.status}</Badge>
                    <Badge variant="outline">{interview.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(interview.startedAt).toLocaleDateString()} · {interview.difficulty}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold">
                    {interview.overallScore ?? '—'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={interview.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    onClick={() => toggleBookmark.mutate(interview.id)}
                  >
                    <Bookmark className={interview.isBookmarked ? 'fill-primary text-primary' : ''} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                Page {page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
