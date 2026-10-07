'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { getApiErrorMessage } from '@/hooks/use-auth';

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

type OtpValues = z.infer<typeof otpSchema>;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resendCooldown, setResendCooldown] = useState(false);

  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  const verify = useMutation({
    mutationFn: (values: OtpValues) => authService.verifyOtp(email, values.code),
    onSuccess: () => {
      toast.success('Email verified — you can log in now');
      router.push('/login');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Invalid or expired code')),
  });

  const resend = useMutation({
    mutationFn: () => authService.resendOtp(email, 'VERIFY_EMAIL'),
    onSuccess: () => {
      toast.success('New code sent — check your email');
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 30_000);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not resend code')),
  });

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            'Enter the 6-digit code sent to your email'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => verify.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="482913"
                      className="font-mono text-lg tracking-[0.5em]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={verify.isPending}>
              {verify.isPending ? 'Verifying…' : 'Verify email'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={resend.isPending || resendCooldown || !email}
            onClick={() => resend.mutate()}
          >
            {resendCooldown ? 'Code sent — try again shortly' : "Didn't get a code? Resend"}
          </Button>
          <Link href="/login" className="hover:text-primary">
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
