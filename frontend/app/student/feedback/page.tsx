'use client';

import { useState, type FormEvent } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

import {
  feedbackService,
} from '@/services/feedback.service';
import { getApiErrorMessage } from '@/hooks/use-auth';

export default function StudentFeedbackPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const queryClient = useQueryClient();

  const {
    data: feedback,
    isLoading,
  } = useQuery({
    queryKey: ['student', 'feedback'],
    queryFn: () => feedbackService.mine(),
  });

  const createFeedback = useMutation({
    mutationFn: () =>
      feedbackService.create({
        subject: subject.trim(),
        message: message.trim(),
      }),

    onSuccess: () => {
      toast.success('Feedback submitted');

      setSubject('');
      setMessage('');

      queryClient.invalidateQueries({
        queryKey: ['student', 'feedback'],
      });
    },

    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Could not submit feedback',
        ),
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanSubject.length < 2) {
      toast.error(
        'Subject must contain at least 2 characters.',
      );
      return;
    }

    if (cleanMessage.length < 2) {
      toast.error(
        'Message must contain at least 2 characters.',
      );
      return;
    }

    createFeedback.mutate();
  }

  function formatStatus(status: string) {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Feedback
        </p>

        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Send feedback
        </h1>

        <p className="mt-1 text-muted-foreground">
          Report a problem or send a suggestion to the
          platform administrator.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Subject
              </label>

              <Input
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                maxLength={150}
                placeholder="Example: Problem with mock interview"
              />

              <p className="text-xs text-muted-foreground">
                {subject.length}/150
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message
              </label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                maxLength={2000}
                rows={7}
                placeholder="Describe the problem or suggestion..."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />

              <p className="text-xs text-muted-foreground">
                {message.length}/2000
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                createFeedback.isPending ||
                subject.trim().length < 2 ||
                message.trim().length < 2
              }
            >
              <Send className="mr-2 h-4 w-4" />

              {createFeedback.isPending
                ? 'Submitting…'
                : 'Submit feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-xl font-semibold">
          Your submissions
        </h2>

        {isLoading && (
          <Skeleton className="h-32 w-full" />
        )}

        {!isLoading &&
          (!feedback || feedback.length === 0) && (
            <EmptyState
              icon={MessageSquare}
              title="No feedback submitted"
              description="Your feedback submissions will appear here."
            />
          )}

        {!isLoading &&
          feedback &&
          feedback.length > 0 && (
            <div className="space-y-3">
              {feedback.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {item.subject}
                        </p>

                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {item.message}
                        </p>

                        <p className="pt-2 text-xs text-muted-foreground">
                          {new Date(
                            item.createdAt,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium">
                        {formatStatus(item.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}