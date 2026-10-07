'use client';

import { Award, Download } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { achievementsService } from '@/services/achievements.service';
import { certificatesService } from '@/services/certificates.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import { getBadgeIcon } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsService.list(),
  });

  const { data: certificates, isLoading: certificatesLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesService.list(),
  });

  const download = useMutation({
    mutationFn: (id: string) => certificatesService.getDownloadUrl(id),
    onSuccess: (data) => window.open(data.url, '_blank'),
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not get download link')),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Achievements</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Badges &amp; certificates</h1>
        <p className="mt-1 text-muted-foreground">Milestones you&apos;ve unlocked along the way.</p>
      </div>

      <section className="space-y-4">
        {achievementsLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {!achievementsLoading && achievements && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((badge) => {
              const Icon = getBadgeIcon(badge.icon);
              return (
                <Card
                  key={badge.code}
                  className={cn('text-center', !badge.earned && 'opacity-50 grayscale')}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-5">
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full',
                        badge.earned ? 'bg-primary/10' : 'bg-secondary',
                      )}
                    >
                      <Icon className={cn('h-6 w-6', badge.earned ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <p className="text-sm font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    {badge.earned && badge.earnedAt && (
                      <Badge variant="success" className="mt-1">
                        {new Date(badge.earnedAt).toLocaleDateString()}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Certificates</h2>
          <p className="text-sm text-muted-foreground">Awarded automatically when you master a domain.</p>
        </div>

        {certificatesLoading && <Skeleton className="h-24 w-full" />}

        {!certificatesLoading && certificates?.length === 0 && (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Certificates are issued once your progress in a domain (computed in Phase 12) crosses the mastery threshold."
          />
        )}

        {!certificatesLoading && certificates && certificates.length > 0 && (
          <div className="space-y-3">
            {certificates.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{cert.category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Issued {new Date(cert.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={download.isPending}
                    onClick={() => download.mutate(cert.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
