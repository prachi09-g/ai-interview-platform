'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileQuestion, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TagInput } from '@/components/shared/tag-input';
import { adminService } from '@/services/admin.service';
import { interviewService } from '@/services/interview.service';
import { getApiErrorMessage } from '@/hooks/use-auth';

const questionSchema = z.object({
  categoryId: z.string().uuid('Select a category'),
  type: z.enum(['TECHNICAL', 'HR', 'BEHAVIORAL']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  questionText: z.string().min(10).max(2000),
  modelAnswer: z.string().min(10).max(4000),
  keywords: z.array(z.string()),
});
type QuestionValues = z.infer<typeof questionSchema>;

export default function AdminQuestionsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['interviews', 'categories'],
    queryFn: () => interviewService.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'questions', search],
    queryFn: () => adminService.listQuestions({ search: search || undefined, limit: 20 }),
  });

  const form = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      categoryId: '',
      type: 'TECHNICAL',
      difficulty: 'MEDIUM',
      questionText: '',
      modelAnswer: '',
      keywords: [],
    },
  });

  const create = useMutation({
    mutationFn: (values: QuestionValues) => adminService.createQuestion(values),
    onSuccess: () => {
      toast.success('Question created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create question')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteQuestion(id),
    onSuccess: () => {
      toast.success('Question deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not delete question')),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Interview questions</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New interview question</DialogTitle>
              <DialogDescription>Used by the AI interview engine (Phase 9) as a question bank fallback.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select a category</option>
                          {categories?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="TECHNICAL">Technical</option>
                            <option value="HR">HR</option>
                            <option value="BEHAVIORAL">Behavioral</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <FormControl>
                          <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={2}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model answer</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Controller
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords (for semantic matching)</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="Add a keyword" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? 'Creating…' : 'Create question'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search question text…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState icon={FileQuestion} title="No questions found" description="Create one above to get started." />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="mb-1 flex gap-2">
                    <Badge variant="outline">{q.category.name}</Badge>
                    <Badge variant="secondary">{q.type}</Badge>
                    <Badge variant="secondary">{q.difficulty}</Badge>
                  </div>
                  <p className="font-medium">{q.questionText}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm('Delete this question?')) remove.mutate(q.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
