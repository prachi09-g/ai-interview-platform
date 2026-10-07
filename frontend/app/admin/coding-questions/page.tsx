'use client';

import { useState } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Code2, Plus, Search, Trash2 } from 'lucide-react';
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

const codingQuestionSchema = z.object({
  categoryId: z.string().uuid('Select a category'),
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(4000),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  testCases: z
    .array(z.object({ input: z.string().min(1), expectedOutput: z.string().min(1) }))
    .min(1, 'At least one test case is required'),
  supportedLanguages: z.array(z.string()).min(1, 'At least one language is required'),
});
type CodingQuestionValues = z.infer<typeof codingQuestionSchema>;

export default function AdminCodingQuestionsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['interviews', 'categories'],
    queryFn: () => interviewService.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'coding-questions', search],
    queryFn: () => adminService.listCodingQuestions({ search: search || undefined, limit: 20 }),
  });

  const form = useForm<CodingQuestionValues>({
    resolver: zodResolver(codingQuestionSchema),
    defaultValues: {
      categoryId: '',
      title: '',
      description: '',
      difficulty: 'MEDIUM',
      testCases: [{ input: '', expectedOutput: '' }],
      supportedLanguages: ['javascript', 'python'],
    },
  });

  const testCaseFields = useFieldArray({ control: form.control, name: 'testCases' });

  const create = useMutation({
    mutationFn: (values: CodingQuestionValues) => adminService.createCodingQuestion(values),
    onSuccess: () => {
      toast.success('Coding question created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coding-questions'] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create coding question')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteCodingQuestion(id),
    onSuccess: () => {
      toast.success('Coding question deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coding-questions'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not delete coding question')),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Coding questions</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New coding question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New coding question</DialogTitle>
              <DialogDescription>
                Test cases are used by the code execution sandbox (Phase 11) to score submissions.
              </DialogDescription>
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Two Sum" {...field} />
                        </FormControl>
                        <FormMessage />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
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

                <div className="space-y-2">
                  <FormLabel>Test cases</FormLabel>
                  {testCaseFields.fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <Input
                        placeholder="Input, e.g. [2,7,11,15], 9"
                        {...form.register(`testCases.${index}.input`)}
                      />
                      <Input
                        placeholder="Expected output, e.g. [0,1]"
                        {...form.register(`testCases.${index}.expectedOutput`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={testCaseFields.fields.length === 1}
                        onClick={() => testCaseFields.remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testCaseFields.append({ input: '', expectedOutput: '' })}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add test case
                  </Button>
                  {form.formState.errors.testCases?.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.testCases.message}</p>
                  )}
                </div>

                <Controller
                  control={form.control}
                  name="supportedLanguages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supported languages</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="Add a language" />
                      </FormControl>
                      {form.formState.errors.supportedLanguages?.message && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.supportedLanguages.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? 'Creating…' : 'Create coding question'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState icon={Code2} title="No coding questions found" description="Create one above to get started." />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="mb-1 flex gap-2">
                    <Badge variant="outline">{q.category.name}</Badge>
                    <Badge variant="secondary">{q.difficulty}</Badge>
                    {q.supportedLanguages.map((lang) => (
                      <Badge key={lang} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                  <p className="font-medium">{q.title}</p>
                  <p className="text-sm text-muted-foreground">{q.testCases.length} test case(s)</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm('Delete this coding question?')) remove.mutate(q.id);
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
