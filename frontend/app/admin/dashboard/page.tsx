'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Code2, FileQuestion, ListChecks, Mic, Tags, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { adminService } from '@/services/admin.service';
import { useCurrentUser } from '@/hooks/use-auth';

export default function AdminDashboardPage() {
  const user = useCurrentUser();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminService.getOverview(),
    enabled: !!user,
  });

  const stats = overview
    ? [
        { label: 'Total users', value: overview.totalUsers, icon: Users },
        { label: 'Active users', value: overview.activeUsers, icon: Users },
        { label: 'Categories', value: overview.totalCategories, icon: Tags },
        { label: 'Questions', value: overview.totalQuestions, icon: FileQuestion },
        { label: 'Coding questions', value: overview.totalCodingQuestions, icon: Code2 },
        { label: 'Interviews run', value: overview.totalInterviews, icon: Mic },
        { label: 'Open feedback', value: overview.openFeedbackCount, icon: AlertCircle },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-muted-foreground">
          Live content and activity counts. Trend charts and deeper analytics land in Phase 12.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 font-mono text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <ListChecks className="h-5 w-5 shrink-0" />
          Use the sidebar to manage users, interview domains, questions, coding problems, the skills
          taxonomy, and student feedback. Recent request activity is under Logs.
        </CardContent>
      </Card>
    </div>
  );
}
