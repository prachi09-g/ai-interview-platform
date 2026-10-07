'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Wrench, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { adminService } from '@/services/admin.service';
import { getApiErrorMessage } from '@/hooks/use-auth';

export default function AdminSkillsPage() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const queryClient = useQueryClient();

  const { data: skillsResult, isLoading } = useQuery({
    queryKey: ['admin', 'skills'],
    queryFn: () => adminService.listSkills({ limit: 100 }),
  });
  const skills = skillsResult?.items;

  const create = useMutation({
    mutationFn: () => adminService.createSkill({ name, category: category || undefined }),
    onSuccess: () => {
      toast.success('Skill added');
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      setName('');
      setCategory('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not add skill')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteSkill(id),
    onSuccess: () => {
      toast.success('Skill removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not remove skill')),
  });

  const grouped = skills?.reduce<Record<string, typeof skills>>((acc, skill) => {
    const key = skill.category ?? 'Uncategorized';
    (acc[key] ??= []).push(skill);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Skills taxonomy</h1>
        <p className="mt-1 text-muted-foreground">
          Used for resume ATS keyword matching and profile tagging.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Skill name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kubernetes" />
          </div>
          <div className="w-40 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category (optional)</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="DevOps" />
          </div>
          <Button disabled={!name || create.isPending} onClick={() => create.mutate()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && skills?.length === 0 && (
        <EmptyState icon={Wrench} title="No skills yet" description="Add the first skill to the taxonomy above." />
      )}

      {!isLoading && grouped && Object.keys(grouped).length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([categoryName, categorySkills]) => (
            <div key={categoryName}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{categoryName}</h3>
              <div className="flex flex-wrap gap-2">
                {categorySkills?.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="gap-1 py-1.5 pr-1">
                    {skill.name}
                    <button
                      onClick={() => remove.mutate(skill.id)}
                      className="rounded-full p-0.5 hover:bg-background"
                      aria-label={`Remove ${skill.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
