'use client';

import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, Code2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { analyticsService } from '@/services/analytics.service';

export default function StudentAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'progress'],
    queryFn: () => analyticsService.getProgress(),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Analytics</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Your progress</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Avg. interview score" value={data.overallAverageScore} suffix="%" />
        <StatCard label="Interviews completed" value={data.totalInterviews} plain />
        <StatCard label="Coding pass rate" value={data.coding.passRate} suffix="%" />
        <StatCard label="Latest ATS score" value={data.resume.latestAtsScore} suffix="%" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score trend by domain</CardTitle>
          <CardDescription>Your last 20 interview scores per domain, most recent on the right.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.byCategory.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No interviews yet"
              description="Complete a mock interview to start seeing your score trend here."
            />
          ) : (
            <div className="space-y-8">
              {data.byCategory.map((cat) => (
                <div key={cat.categoryId}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{cat.categoryName}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      avg {cat.averageScore}% · {cat.totalInterviews} interview(s)
                    </p>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cat.trend.map((score, i) => ({ index: i, score }))}>
                        <XAxis dataKey="index" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, 'Score']}
                          labelFormatter={() => ''}
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-sm text-muted-foreground">
            <div>Uploaded: {data.resume.totalUploaded}</div>
            <div>Avg ATS score: {data.resume.averageAtsScore ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Coding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-sm text-muted-foreground">
            <div>Submissions: {data.coding.totalSubmissions}</div>
            <div>Passed: {data.coding.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Achievements</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm text-muted-foreground">
            {data.achievementsEarned} badge(s) earned
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix = '', plain = false }: { label: string; value: number | null; suffix?: string; plain?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold">
          {value === null ? '—' : plain ? value : `${value}${suffix}`}
        </p>
      </CardContent>
    </Card>
  );
}
