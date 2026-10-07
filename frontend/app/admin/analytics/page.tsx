'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsService } from '@/services/analytics.service';

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'admin-overview'],
    queryFn: () => analyticsService.getAdminOverview(),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const signupsChartData = data.signupsOverTime.map((d) => ({
    date: d.date.slice(5), // MM-DD
    signups: d.count,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Platform analytics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Total users" value={data.kpis.totalUsers} />
        <Kpi label="Signups today" value={data.kpis.signupsToday} />
        <Kpi label="Interviews today" value={data.kpis.interviewsToday} />
        <Kpi label="Avg platform score" value={data.kpis.avgPlatformScore} suffix="%" />
        <Kpi label="Total interviews" value={data.kpis.totalInterviews} />
        <Kpi label="Completed interviews" value={data.kpis.completedInterviews} />
        <Kpi label="Resumes uploaded" value={data.kpis.totalResumesUploaded} />
        <Kpi label="Coding pass rate" value={data.kpis.codingPassRate} suffix="%" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups, last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupsChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domain popularity</CardTitle>
          <CardDescription>Total interviews started per domain, all time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.domainPopularity.map((d) => (
            <div key={d.categoryId} className="flex items-center justify-between text-sm">
              <span>{d.categoryName}</span>
              <span className="font-mono text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold">{value === null ? '—' : `${value}${suffix}`}</p>
      </CardContent>
    </Card>
  );
}
