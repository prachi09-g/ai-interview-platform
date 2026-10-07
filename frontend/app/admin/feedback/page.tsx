'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { adminService } from '@/services/admin.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import type { FeedbackStatus } from '@/types/admin.types';
import { cn } from '@/lib/utils';

const statusFilters: { label: string; value: FeedbackStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'In review', value: 'IN_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
];

const statusVariant: Record<FeedbackStatus, 'default' | 'secondary' | 'success'> = {
  OPEN: 'default',
  IN_REVIEW: 'secondary',
  RESOLVED: 'success',
};

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feedback', statusFilter],
    queryFn: () => adminService.listFeedback({ limit: 50 }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      adminService.updateFeedbackStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update status')),
  });

  const items = statusFilter ? data?.items.filter((f) => f.status === statusFilter) : data?.items;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Feedback</h1>
        <p className="mt-1 text-muted-foreground">Bug reports and suggestions submitted by students.</p>
      </div>

      <div className="flex gap-1 rounded-md border p-1">
        {statusFilters.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={statusFilter === f.value ? 'default' : 'ghost'}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && items?.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No feedback here"
          description="Submissions from the student-facing feedback form will show up here."
        />
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id} className={cn(f.status === 'RESOLVED' && 'opacity-60')}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{f.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.user.email} · {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusVariant[f.status]}>{f.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{f.message}</p>
                <div className="flex gap-2 pt-1">
                  {(['OPEN', 'IN_REVIEW', 'RESOLVED'] as const)
                    .filter((s) => s !== f.status)
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: f.id, status: s })}
                      >
                        Mark {s.toLowerCase().replace('_', ' ')}
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
