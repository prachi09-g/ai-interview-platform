'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, Code2, Mic, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { interviewService } from '@/services/interview.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import type { Difficulty, QuestionType } from '@/types/interview.types';

const typeOptions: { value: QuestionType; label: string; description: string; icon: typeof Code2 }[] = [
  { value: 'TECHNICAL', label: 'Technical', description: 'DSA, system design, language fundamentals', icon: Code2 },
  { value: 'HR', label: 'HR', description: 'Motivation, culture fit, career goals', icon: Briefcase },
  { value: 'BEHAVIORAL', label: 'Behavioral', description: 'STAR-format situational questions', icon: Users },
];

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

export default function InterviewSetupPage() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [type, setType] = useState<QuestionType>('TECHNICAL');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['interviews', 'categories'],
    queryFn: () => interviewService.listCategories(),
  });

  const create = useMutation({
    mutationFn: () => interviewService.create({ categoryId: categoryId!, type, difficulty }),
    onSuccess: (interview) => {
      toast.success('Interview session started');
      router.push(`/student/interview/session/${interview.id}`);
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Could not start the session — the question bank may be empty for this combination',
        ),
      ),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Mock Interview</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Set up your session</h1>
        <p className="mt-1 text-muted-foreground">
          Pick a domain, interview type, and difficulty. Coding and voice interviews live under their own
          dedicated flows.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Domain</p>
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {categories && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  categoryId === c.id ? 'border-primary bg-primary/5' : 'hover:bg-secondary'
                }`}
              >
                <p className="font-medium">{c.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Interview type</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Card
                key={opt.value}
                role="button"
                onClick={() => setType(opt.value)}
                className={`cursor-pointer transition-colors ${type === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-secondary'}`}
              >
                <CardHeader>
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{opt.label}</CardTitle>
                  <CardDescription>{opt.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Difficulty</p>
        <div className="flex gap-2">
          {difficultyOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={difficulty === opt.value ? 'default' : 'outline'}
              onClick={() => setDifficulty(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Mic className="h-4 w-4 shrink-0" />
          Answers are typed for now — speech recording and pronunciation/fluency scoring are added in Phase 10.
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" disabled={!categoryId || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Starting…' : 'Start interview'}
      </Button>
    </div>
  );
}
