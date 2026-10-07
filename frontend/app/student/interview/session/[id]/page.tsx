'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Keyboard, Mic, Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WaveformPulse } from '@/components/shared/waveform';

import { interviewService } from '@/services/interview.service';
import { speechService } from '@/services/speech.service';

import { getApiErrorMessage } from '@/hooks/use-auth';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

import type {
  EvaluationStatus,
  SessionQuestion,
} from '@/types/interview.types';

import type { SpeechAnalysisResult } from '@/types/speech.types';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 20;

export default function InterviewSessionPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();

  const [answer, setAnswer] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'record'>('type');

  const [activeResponseId, setActiveResponseId] =
    useState<string | null>(null);

  const [evaluationStatus, setEvaluationStatus] =
    useState<EvaluationStatus | null>(null);

  const [feedback, setFeedback] = useState<{
    score: number;
    text: string;
  } | null>(null);

  const [pollAttempts, setPollAttempts] = useState(0);

  const [speechAnalysis, setSpeechAnalysis] =
    useState<SpeechAnalysisResult | null>(null);

  const recorder = useAudioRecorder();

  const {
    data: questions,
    isLoading,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ['interviews', interviewId, 'questions'],
    queryFn: () => interviewService.getQuestions(interviewId),
  });

  const currentQuestion: SessionQuestion | undefined =
    questions?.find((q) => !q.isAnswered);

  const answeredCount =
    questions?.filter((q) => q.isAnswered).length ?? 0;

  const totalCount = questions?.length ?? 0;

  // ---------------------------------------------------------
  // Typed answer
  // ---------------------------------------------------------

  const submit = useMutation({
    mutationFn: () =>
      interviewService.submitResponse(
        interviewId,
        currentQuestion!.questionId,
        answer,
      ),

    onSuccess: (response) => {
      setActiveResponseId(response.id);
      setEvaluationStatus('evaluating');
      setPollAttempts(0);
    },

    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Could not submit your answer',
        ),
      ),
  });

  // ---------------------------------------------------------
  // Voice answer
  //
  // recorder.stop() now returns:
  //
  // {
  //   blob,
  //   durationSeconds,
  //   transcript
  // }
  //
  // If browser speech recognition produced a transcript,
  // we send it to the backend as clientTranscript.
  //
  // The backend will then SKIP Whisper and use this transcript.
  // ---------------------------------------------------------

  const submitVoice = useMutation({
    mutationFn: async () => {
      const recording = await recorder.stop();

      if (!recording) {
        throw new Error('No recording captured');
      }

      if (!recording.transcript) {
        console.warn(
          'Browser speech recognition did not produce a transcript. ' +
            'Backend may try Whisper if configured.',
        );
      } else {
        console.log(
          'Browser speech transcript:',
          recording.transcript,
        );
      }

      return speechService.transcribe(
        currentQuestion!.responseId,
        recording.blob,
        recording.durationSeconds,

        // IMPORTANT:
        // Free browser-generated transcript.
        recording.transcript,
      );
    },

    onSuccess: (result) => {
      setActiveResponseId(result.responseId);
      setEvaluationStatus('evaluating');
      setPollAttempts(0);

      recorder.reset();
    },

    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Could not upload your recording',
        ),
      );

      recorder.reset();
    },
  });

  // ---------------------------------------------------------
  // Poll interview response until evaluation finishes
  // ---------------------------------------------------------

  useEffect(() => {
    if (
      !activeResponseId ||
      evaluationStatus !== 'evaluating'
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response =
          await interviewService.getResponse(
            interviewId,
            activeResponseId,
          );

        if (
          response.evaluationStatus === 'evaluated'
        ) {
          setEvaluationStatus('evaluated');

          setFeedback({
            score: response.score ?? 0,
            text:
              response.evaluationBreakdown?.feedback ??
              'No feedback available.',
          });

          queryClient.invalidateQueries({
            queryKey: [
              'interviews',
              interviewId,
              'questions',
            ],
          });

          // Voice answers should have speech analysis.
          // Typed answers normally return not_started.
          speechService
            .getAnalysis(activeResponseId)
            .then((result) => {
              if (result.status === 'ready') {
                setSpeechAnalysis(result.analysis);
              }
            })
            .catch(() => undefined);
        } else if (
          pollAttempts >= MAX_POLL_ATTEMPTS
        ) {
          toast.info(
            'Evaluation is taking longer than usual — you can continue and check back in History later.',
          );

          // Stop blocking the UI.
          // Backend processing may still finish later.
          setEvaluationStatus('evaluated');
        } else {
          setPollAttempts((n) => n + 1);
        }
      } catch {
        toast.error(
          'Lost connection while checking your evaluation status',
        );
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [
    activeResponseId,
    evaluationStatus,
    pollAttempts,
    interviewId,
    queryClient,
  ]);

  // ---------------------------------------------------------
  // Complete interview
  // ---------------------------------------------------------

  const complete = useMutation({
    mutationFn: () =>
      interviewService.complete(interviewId),

    onSuccess: () =>
      router.push(
        `/student/interview/result/${interviewId}`,
      ),

    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          'Could not finalize the interview',
        ),
      ),
  });

  // ---------------------------------------------------------
  // Next question
  // ---------------------------------------------------------

  async function handleNext() {
    await refetchQuestions();

    setAnswer('');
    setActiveResponseId(null);
    setEvaluationStatus(null);
    setFeedback(null);
    setSpeechAnalysis(null);
    setInputMode('type');
  }

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ---------------------------------------------------------
  // All questions answered
  // ---------------------------------------------------------

  if (!currentQuestion) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />

        <h1 className="font-display text-2xl font-semibold">
          All questions answered
        </h1>

        <p className="text-muted-foreground">
          Ready to see your overall score and feedback?
        </p>

        <Button
          size="lg"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          {complete.isPending
            ? 'Finalizing…'
            : 'Finish & see results'}
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          Question {answeredCount + 1} of {totalCount}
        </Badge>

        <Badge variant="secondary">
          {currentQuestion.difficulty}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {currentQuestion.type}
          </p>

          <p className="text-lg font-medium leading-snug">
            {currentQuestion.questionText}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {!feedback ? (
            <>
              {/* Type / Record selector */}

              <div className="flex justify-end gap-1 rounded-md border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    inputMode === 'type'
                      ? 'default'
                      : 'ghost'
                  }
                  disabled={
                    submit.isPending ||
                    submitVoice.isPending ||
                    evaluationStatus === 'evaluating'
                  }
                  onClick={() =>
                    setInputMode('type')
                  }
                >
                  <Keyboard className="mr-1.5 h-3.5 w-3.5" />
                  Type
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    inputMode === 'record'
                      ? 'default'
                      : 'ghost'
                  }
                  disabled={
                    submit.isPending ||
                    submitVoice.isPending ||
                    evaluationStatus === 'evaluating'
                  }
                  onClick={() =>
                    setInputMode('record')
                  }
                >
                  <Mic className="mr-1.5 h-3.5 w-3.5" />
                  Record
                </Button>
              </div>

              {/* Typed answer */}

              {inputMode === 'type' ? (
                <textarea
                  value={answer}
                  onChange={(e) =>
                    setAnswer(e.target.value)
                  }
                  disabled={
                    submit.isPending ||
                    evaluationStatus === 'evaluating'
                  }
                  rows={8}
                  placeholder="Type your answer here…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground disabled:opacity-60"
                />
              ) : (
                // Voice answer
                <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-10">
                  {recorder.status ===
                    'unsupported' && (
                    <p className="max-w-xs text-center text-sm text-muted-foreground">
                      Voice recording isn&apos;t
                      supported in this browser —
                      switch to Type instead.
                    </p>
                  )}

                  {recorder.status ===
                    'permission-denied' && (
                    <p className="max-w-xs text-center text-sm text-destructive">
                      Microphone access was denied.
                      Allow it in your browser
                      settings, or switch to Type.
                    </p>
                  )}

                  {(recorder.status === 'idle' ||
                    recorder.status ===
                      'stopped') && (
                    <Button
                      type="button"
                      size="lg"
                      onClick={() =>
                        recorder.start()
                      }
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Start recording
                    </Button>
                  )}

                  {recorder.status ===
                    'recording' && (
                    <>
                      <WaveformPulse
                        bars={20}
                        className="h-10"
                      />

                      <p className="text-sm text-muted-foreground">
                        Speak clearly. Your browser
                        will create a transcript
                        while recording.
                      </p>

                      <Button
                        type="button"
                        size="lg"
                        variant="destructive"
                        disabled={
                          submitVoice.isPending
                        }
                        onClick={() =>
                          submitVoice.mutate()
                        }
                      >
                        <Square className="mr-2 h-4 w-4" />

                        {submitVoice.isPending
                          ? 'Uploading…'
                          : 'Stop & submit'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Evaluation loading */}

              {evaluationStatus ===
              'evaluating' ? (
                <div className="flex items-center justify-center gap-3 rounded-md border border-dashed py-6">
                  <WaveformPulse
                    bars={12}
                    className="h-6"
                  />

                  <span className="text-sm text-muted-foreground">
                    {inputMode === 'record'
                      ? 'Transcribing & evaluating your answer…'
                      : 'Evaluating your answer…'}
                  </span>
                </div>
              ) : (
                inputMode === 'type' && (
                  <Button
                    className="w-full"
                    disabled={
                      answer.trim().length ===
                        0 || submit.isPending
                    }
                    onClick={() =>
                      submit.mutate()
                    }
                  >
                    <Send className="mr-2 h-4 w-4" />

                    {submit.isPending
                      ? 'Submitting…'
                      : 'Submit answer'}
                  </Button>
                )
              )}
            </>
          ) : (
            // -------------------------------------------------
            // Evaluation result
            // -------------------------------------------------

            <div className="space-y-4">
              <div className="rounded-md border bg-secondary/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Score for this answer
                  </span>

                  <span className="font-mono text-2xl font-semibold text-primary">
                    {feedback.score}
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {feedback.text}
                </p>
              </div>

              {/* Speech metrics */}

              {speechAnalysis && (
                <div className="grid grid-cols-3 gap-3 rounded-md border p-4 sm:grid-cols-5">
                  <SpeechMetric
                    label="Fluency"
                    value={
                      speechAnalysis.fluencyScore
                    }
                  />

                  <SpeechMetric
                    label="Confidence"
                    value={
                      speechAnalysis.confidenceScore
                    }
                  />

                  <SpeechMetric
                    label="Pronunciation"
                    value={
                      speechAnalysis.pronunciationScore
                    }
                    unavailableHint="Needs Whisper"
                  />

                  <SpeechMetric
                    label="Pace"
                    value={
                      speechAnalysis.speakingSpeedWpm
                    }
                    suffix=" wpm"
                    plain
                  />

                  <SpeechMetric
                    label="Fillers"
                    value={
                      speechAnalysis.fillerWordCount
                    }
                    plain
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleNext}
              >
                Next question
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------
// Speech metric display
// -----------------------------------------------------------

function SpeechMetric({
  label,
  value,
  suffix = '',
  plain = false,
  unavailableHint,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  plain?: boolean;
  unavailableHint?: string;
}) {
  return (
    <div className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      {value === null ? (
        <p
          className="mt-1 text-xs text-muted-foreground"
          title={unavailableHint}
        >
          —
        </p>
      ) : (
        <p className="mt-1 font-mono text-lg font-semibold">
          {value}

          {!plain && !suffix && '%'}

          {suffix}
        </p>
      )}
    </div>
  );
}