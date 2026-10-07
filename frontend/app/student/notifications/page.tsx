'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { notificationsService } from '@/services/notifications.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => notificationsService.list({ unreadOnly, limit: 50 }),
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not mark as read')),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notifications</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Inbox
            {!!data?.meta.unreadCount && (
              <Badge className="ml-3 align-middle" variant="default">
                {data.meta.unreadCount} unread
              </Badge>
            )}
          </h1>
        </div>
        <Button variant={unreadOnly ? 'secondary' : 'outline'} size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          {unreadOnly ? 'Showing unread' : 'Show unread only'}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? "You're all caught up" : 'No notifications yet'}
          description={
            unreadOnly
              ? 'No unread notifications right now.'
              : "We'll let you know about interview results, achievements, and platform updates here."
          }
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((n) => (
            <Card key={n.id} className={cn(!n.isRead && 'border-primary/40 bg-primary/5')}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mark as read"
                    disabled={markAsRead.isPending}
                    onClick={() => markAsRead.mutate(n.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
