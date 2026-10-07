'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { leaderboardService } from '@/services/leaderboard.service';
import { interviewService } from '@/services/interview.service';
import { cn } from '@/lib/utils';
import type { LeaderboardPeriod } from '@/types/dashboard.types';

const periods: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'All time', value: 'ALL_TIME' },
  { label: 'This month', value: 'MONTHLY' },
  { label: 'This week', value: 'WEEKLY' },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const { data: categories } = useQuery({
    queryKey: ['interviews', 'categories'],
    queryFn: () => interviewService.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period, categoryId],
    queryFn: () => leaderboardService.get({ period, categoryId }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Leaderboard</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Top performers</h1>
        <p className="mt-1 text-muted-foreground">Ranked by average interview score.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-md border p-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? 'default' : 'ghost'}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant={!categoryId ? 'secondary' : 'ghost'} onClick={() => setCategoryId(undefined)}>
              All domains
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={categoryId === c.id ? 'secondary' : 'ghost'}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.entries.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="The leaderboard is empty"
          description="Rankings populate once students start completing scored mock interviews."
        />
      )}

      {!isLoading && data && data.entries.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {data.entries.map((entry) => (
              <div
                key={`${entry.rank}-${entry.fullName}`}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  entry.isCurrentUser && 'bg-primary/5',
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold',
                      entry.rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    {entry.rank}
                  </span>
                  <div>
                    <p className="font-medium">
                      {entry.fullName} {entry.isCurrentUser && <Badge variant="outline">You</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.category}</p>
                  </div>
                </div>
                <span className="font-mono text-lg font-semibold">{entry.score}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && data?.myRank && (
        <p className="text-center text-sm text-muted-foreground">
          Your rank: <span className="font-medium text-foreground">#{data.myRank.rank}</span> in{' '}
          {data.myRank.category}
        </p>
      )}
    </div>
  );
}
