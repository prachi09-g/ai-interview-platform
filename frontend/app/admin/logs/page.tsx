'use client';

import { useQuery } from '@tanstack/react-query';
import { Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { adminService } from '@/services/admin.service';
import { cn } from '@/lib/utils';

function statusVariant(status: number): 'success' | 'secondary' | 'destructive' {
  if (status >= 500) return 'destructive';
  if (status >= 400) return 'secondary';
  return 'success';
}

export default function AdminLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () => adminService.listLogs(150),
    refetchInterval: 10_000,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">System logs</h1>
        <p className="mt-1 text-muted-foreground">
          The most recent 200 requests to this backend instance. Refreshes every 10s. Resets on server restart.
        </p>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}

      {!isLoading && data?.length === 0 && (
        <EmptyState icon={Terminal} title="No requests logged yet" description="Activity will appear here as the API is used." />
      )}

      {!isLoading && data && data.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0 font-mono text-xs">
            {data.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <span className="w-20 shrink-0 text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <Badge variant={statusVariant(entry.statusCode)} className="w-14 shrink-0 justify-center">
                  {entry.statusCode}
                </Badge>
                <span className="w-14 shrink-0 font-semibold">{entry.method}</span>
                <span className="flex-1 truncate">{entry.path}</span>
                <span className={cn('shrink-0 text-muted-foreground', entry.durationMs > 1000 && 'text-destructive')}>
                  {entry.durationMs}ms
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
