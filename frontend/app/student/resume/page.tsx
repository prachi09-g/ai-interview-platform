'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileText, RefreshCw, Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

import { resumeService } from '@/services/resume.service';
import { getApiErrorMessage } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getTemplateFileUrl(fileUrl: string) {
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://')
  ) {
    return fileUrl;
  }

  return `${BACKEND_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const offset =
    circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? 'text-success'
      : score >= 50
        ? 'text-primary'
        : 'text-destructive';

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg
        className="h-32 w-32 -rotate-90"
        viewBox="0 0 96 96"
      >
        <circle
          cx="48"
          cy="48"
          r="42"
          strokeWidth="8"
          className="fill-none stroke-muted"
        />

        <circle
          cx="48"
          cy="48"
          r="42"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'fill-none transition-all duration-700',
            color,
          )}
          stroke="currentColor"
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-bold">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

function SectionBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
        </span>

        <span className="font-mono font-medium">
          {value}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedResumeId, setSelectedResumeId] =
    useState<string | null>(null);

  const [targetJobRole, setTargetJobRole] =
    useState('');

  const queryClient = useQueryClient();

  const {
    data: resumes,
    isLoading: resumesLoading,
  } = useQuery({
    queryKey: ['resume', 'list'],
    queryFn: () => resumeService.list(),
  });

  useEffect(() => {
    if (
      !selectedResumeId &&
      resumes &&
      resumes.length > 0
    ) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useQuery({
    queryKey: [
      'resume',
      'analysis',
      selectedResumeId,
    ],
    queryFn: () =>
      resumeService.getAnalysis(
        selectedResumeId!,
      ),
    enabled: !!selectedResumeId,
  });

  const { data: templates } = useQuery({
    queryKey: ['resume', 'templates'],
    queryFn: () =>
      resumeService.listTemplates(),
  });

  const upload = useMutation({
    mutationFn: (file: File) =>
      resumeService.upload(file),

    onSuccess: (resume) => {
      toast.success('Resume uploaded');

      queryClient.invalidateQueries({
        queryKey: ['resume', 'list'],
      });

      setSelectedResumeId(resume.id);
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Upload failed',
        ),
      ),
  });

  const analyze = useMutation({
    mutationFn: () =>
      resumeService.analyze(
        selectedResumeId!,
        targetJobRole || undefined,
      ),

    onSuccess: () => {
      toast.success('Analysis complete');

      queryClient.invalidateQueries({
        queryKey: [
          'resume',
          'analysis',
          selectedResumeId,
        ],
      });
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Analysis failed',
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      resumeService.remove(id),

    onSuccess: () => {
      toast.success('Resume deleted');

      queryClient.invalidateQueries({
        queryKey: ['resume', 'list'],
      });

      setSelectedResumeId(null);
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Could not delete resume',
        ),
      ),
  });

  function handleFileChange(
    e: ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (file) {
      upload.mutate(file);
    }

    e.target.value = '';
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Resume
          </p>

          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Resume analyzer
          </h1>

          <p className="mt-1 text-muted-foreground">
            Upload a PDF resume to get an ATS
            score and AI suggestions.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={upload.isPending}
        >
          <Upload className="mr-2 h-4 w-4" />

          {upload.isPending
            ? 'Uploading…'
            : 'Upload resume'}
        </Button>
      </div>

      {resumesLoading && (
        <Skeleton className="h-16 w-full" />
      )}

      {!resumesLoading &&
        resumes?.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No resumes uploaded yet"
            description="Upload a PDF resume to get an ATS score, missing-skills detection, and improvement suggestions."
          />
        )}

      {!resumesLoading &&
        resumes &&
        resumes.length > 0 && (
          <>
            {resumes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {resumes.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={
                      selectedResumeId === r.id
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() =>
                      setSelectedResumeId(r.id)
                    }
                  >
                    {r.originalName}
                  </Button>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />

                  <div>
                    <p className="font-medium">
                      {
                        resumes.find(
                          (r) =>
                            r.id ===
                            selectedResumeId,
                        )?.originalName
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Uploaded{' '}

                      {resumes.find(
                        (r) =>
                          r.id ===
                          selectedResumeId,
                      )?.uploadedAt &&
                        new Date(
                          resumes.find(
                            (r) =>
                              r.id ===
                              selectedResumeId,
                          )!.uploadedAt,
                        ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  disabled={
                    remove.isPending ||
                    !selectedResumeId
                  }
                  onClick={() => {
                    if (
                      selectedResumeId &&
                      confirm(
                        'Delete this resume?',
                      )
                    ) {
                      remove.mutate(
                        selectedResumeId,
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  ATS analysis
                </CardTitle>

                <CardDescription>
                  Optionally tailor suggestions
                  toward a specific role.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Target job role (optional)
                    </label>

                    <Input
                      value={targetJobRole}
                      onChange={(e) =>
                        setTargetJobRole(
                          e.target.value,
                        )
                      }
                      placeholder="Backend Engineer"
                    />
                  </div>

                  <Button
                    onClick={() =>
                      analyze.mutate()
                    }
                    disabled={
                      analyze.isPending ||
                      !selectedResumeId
                    }
                  >
                    <RefreshCw
                      className={cn(
                        'mr-2 h-4 w-4',
                        analyze.isPending &&
                          'animate-spin',
                      )}
                    />

                    {analyze.isPending
                      ? 'Analyzing…'
                      : analysis
                        ? 'Re-analyze'
                        : 'Analyze resume'}
                  </Button>
                </div>

                {(analysisLoading ||
                  analyze.isPending) && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}

                {!analysisLoading &&
                  !analyze.isPending &&
                  !analysis && (
                    <p className="text-sm text-muted-foreground">
                      No analysis yet — click
                      &quot;Analyze resume&quot; to
                      get your ATS score and
                      suggestions.
                    </p>
                  )}

                {!analysisLoading &&
                  !analyze.isPending &&
                  analysis?.atsReport && (
                    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                      <div className="flex justify-center">
                        <ScoreRing
                          score={
                            analysis.atsReport
                              .atsScore
                          }
                        />
                      </div>

                      <div className="flex flex-col justify-center gap-3">
                        <SectionBar
                          label="Formatting"
                          value={
                            analysis.atsReport
                              .sectionScores
                              .formatting
                          }
                        />

                        <SectionBar
                          label="Structure"
                          value={
                            analysis.atsReport
                              .sectionScores
                              .structure
                          }
                        />

                        <SectionBar
                          label="Keywords"
                          value={
                            analysis.atsReport
                              .sectionScores
                              .keywords
                          }
                        />
                      </div>

                      {analysis.missingSkills
                        .length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="mb-2 text-sm font-medium">
                            Missing skills
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {analysis.missingSkills.map(
                              (skill) => (
                                <Badge
                                  key={skill}
                                  variant="secondary"
                                >
                                  {skill}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {analysis.suggestions
                        .length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="mb-2 text-sm font-medium">
                            Suggestions
                          </p>

                          <ul className="space-y-2">
                            {analysis.suggestions.map(
                              (s, i) => (
                                <li
                                  key={i}
                                  className="flex gap-2 text-sm text-muted-foreground"
                                >
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                  {s}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          </>
        )}

      {templates && templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Resume templates
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {t.name}
                    </p>

                    {t.description && (
                      <p className="text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={getTemplateFileUrl(
                        t.fileUrl,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Get
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}