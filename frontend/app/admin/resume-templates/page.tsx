'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { adminService } from '@/services/admin.service';
import { getApiErrorMessage } from '@/hooks/use-auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getTemplateFileUrl(fileUrl: string) {
  // S3/external URLs are already complete.
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  // Local uploads are served by the NestJS backend on port 4000.
  return `${BACKEND_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

export default function AdminResumeTemplatesPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin', 'resume-templates'],
    queryFn: () => adminService.listResumeTemplates(),
  });

  const create = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error('Choose a PDF file first');
      }

      return adminService.createResumeTemplate(
        name,
        description || undefined,
        file,
      );
    },

    onSuccess: () => {
      toast.success('Template uploaded');

      queryClient.invalidateQueries({
        queryKey: ['admin', 'resume-templates'],
      });

      setName('');
      setDescription('');
      setFile(null);
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, 'Could not upload template'),
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      adminService.deleteResumeTemplate(id),

    onSuccess: () => {
      toast.success('Template deleted');

      queryClient.invalidateQueries({
        queryKey: ['admin', 'resume-templates'],
      });
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, 'Could not delete template'),
      ),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name || !file) return;

    create.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>

        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Resume templates
        </h1>

        <p className="mt-1 text-muted-foreground">
          Curated starting-point templates students can download.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>

                <Input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Minimalist Two-Column"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Description (optional)
                </label>

                <Input
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Best for technical roles"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Template file (PDF, max 5MB)
              </label>

              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setFile(e.target.files?.[0] ?? null)
                }
              />
            </div>

            <Button
              type="submit"
              disabled={
                !name ||
                !file ||
                create.isPending
              }
            >
              <Plus className="mr-2 h-4 w-4" />

              {create.isPending
                ? 'Uploading…'
                : 'Upload template'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Skeleton className="h-48 w-full" />
      )}

      {!isLoading &&
        templates?.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Upload the first template above."
          />
        )}

      {!isLoading &&
        templates &&
        templates.length > 0 && (
          <div className="space-y-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">
                      {t.name}
                    </p>

                    {t.description && (
                      <p className="text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={getTemplateFileUrl(
                          t.fileUrl,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete "${t.name}"?`,
                          )
                        ) {
                          remove.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}