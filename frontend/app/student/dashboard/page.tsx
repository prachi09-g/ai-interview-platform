'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, Code2, FileText, Mic, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usersService } from '@/services/users.service';
import { interviewService } from '@/services/interview.service';
import { achievementsService } from '@/services/achievements.service';
import { notificationsService } from '@/services/notifications.service';
import { useCurrentUser } from '@/hooks/use-auth';
import { getBadgeIcon } from '@/lib/icon-map';

export default function StudentDashboardPage() {
  const user = useCurrentUser();

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersService.getMe(),
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ['interviews', 'history', 'preview'],
    queryFn: () => interviewService.listHistory({ limit: 3 }),
    enabled: !!user,
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsService.list(),
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => notificationsService.list({ limit: 3 }),
    enabled: !!user,
  });

  const earnedCount = achievements?.filter((a) => a.earned).length ?? 0;
  const completedCount = history?.meta.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Welcome back{me?.profile?.fullName ? `, ${me.profile.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {me?.emailVerified
            ? 'Ready for your next practice session.'
            : 'Verify your email to unlock mock interviews.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Interviews</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Badges earned</p>
            <p className="mt-1 font-mono text-3xl font-semibold">
              {earnedCount}
              <span className="text-base font-normal text-muted-foreground">/{achievements?.length ?? 0}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Unread</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{notifications?.meta.unreadCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <Mic className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Start a mock interview</CardTitle>
            <CardDescription>AI-generated questions, scored on delivery and content.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/student/interview/setup">Start a session</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Analyze your resume</CardTitle>
            <CardDescription>Get an ATS score and targeted improvement suggestions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/student/resume">Upload &amp; analyze</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Practice coding</CardTitle>
            <CardDescription>Timed problems with automated test-case scoring.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/student/coding">Browse problems</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent badges</CardTitle>
            <Link href="/student/achievements" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {!achievements && <Skeleton className="h-12 w-full" />}
            {achievements && earnedCount === 0 && (
              <p className="text-sm text-muted-foreground">No badges earned yet — start practicing to unlock some.</p>
            )}
            {achievements
              ?.filter((a) => a.earned)
              .slice(0, 3)
              .map((badge) => {
                const Icon = getBadgeIcon(badge.icon);
                return (
                  <div key={badge.code} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Link href="/student/notifications" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {!notifications && <Skeleton className="h-12 w-full" />}
            {notifications?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
            )}
            {notifications?.items.map((n) => (
              <div key={n.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {n.title} {!n.isRead && <Badge className="ml-1 align-middle">New</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {completedCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 p-5">
            <Trophy className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Your interview history is empty</p>
              <p className="text-sm text-muted-foreground">
                <Link href="/student/interview/setup" className="text-primary hover:underline">
                  Start your first mock interview
                </Link>{' '}
                — completed sessions and scores will show up here and on the{' '}
                <Link href="/student/leaderboard" className="text-primary hover:underline">
                  leaderboard
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
