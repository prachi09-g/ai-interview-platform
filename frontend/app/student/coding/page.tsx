'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Code2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { codingService } from '@/services/coding.service';
import { interviewService } from '@/services/interview.service';
import type { Difficulty } from '@/types/coding.types';
import { cn } from '@/lib/utils';

const difficultyVariant: Record<Difficulty, 'success' | 'secondary' | 'destructive'> = {
  EASY: 'success',
  MEDIUM: 'secondary',
  HARD: 'destructive',
};

export default function CodingQuestionsPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(undefined);

  const { data: categories } = useQuery({
    queryKey: ['interviews', 'categories'],
    queryFn: () => interviewService.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['coding', 'questions', search, categoryId, difficulty],
    queryFn: () => codingService.listQuestions({ search: search || undefined, categoryId, difficulty, limit: 30 }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Coding</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Practice problems</h1>
        <p className="mt-1 text-muted-foreground">Timed problems, automated test-case scoring.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant={!difficulty ? 'secondary' : 'ghost'} onClick={() => setDifficulty(undefined)}>
            All
          </Button>
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
            <Button key={d} size="sm" variant={difficulty === d ? 'secondary' : 'ghost'} onClick={() => setDifficulty(d)}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </Button>
          ))}
          <span className="mx-1 w-px bg-border" />
          <Button size="sm" variant={!categoryId ? 'secondary' : 'ghost'} onClick={() => setCategoryId(undefined)}>
            All domains
          </Button>
          {categories?.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={categoryId === c.id ? 'secondary' : 'ghost'}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          icon={Code2}
          title="No coding questions yet"
          description="An admin hasn't added any coding questions matching these filters — check back soon or try a different filter."
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((q) => (
            <Link key={q.id} href={`/student/coding/${q.id}`}>
              <Card className={cn('transition-colors hover:border-primary/40')}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{q.category.name}</Badge>
                      {q.supportedLanguages.map((lang) => (
                        <Badge key={lang} variant="secondary">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant={difficultyVariant[q.difficulty]}>{q.difficulty}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
