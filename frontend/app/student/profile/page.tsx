'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/shared/tag-input';
import { usersService } from '@/services/users.service';
import { getApiErrorMessage, useLogout } from '@/hooks/use-auth';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(100),
  targetRole: z.string().max(100).optional(),
  experienceLevel: z.string().max(50).optional(),
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string()).max(50),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const logout = useLogout();

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersService.getMe(),
  });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', targetRole: '', experienceLevel: '', bio: '', skills: [] },
  });

  useEffect(() => {
    if (user?.profile) {
      form.reset({
        fullName: user.profile.fullName,
        targetRole: user.profile.targetRole ?? '',
        experienceLevel: user.profile.experienceLevel ?? '',
        bio: user.profile.bio ?? '',
        skills: user.profile.skills.map((s) => s.name),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateProfile = useMutation({
    mutationFn: (values: ProfileValues) => usersService.updateProfile(values),
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update profile')),
  });

  const deactivateAccount = useMutation({
    mutationFn: () => usersService.deleteAccount(),
    onSuccess: () => {
      toast.success('Account deactivated');
      logout.mutate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not deactivate account')),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Profile</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Used to personalize question difficulty and resume suggestions.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => updateProfile.mutate(v))}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target role</FormLabel>
                      <FormControl>
                        <Input placeholder="Backend Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience level</FormLabel>
                      <FormControl>
                        <Input placeholder="0-1 years" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
                        placeholder="A short summary a recruiter (or the AI interviewer) would find useful."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Controller
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Type a skill and press Enter"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Press Enter or comma to add a skill, backspace to remove the last one.
                    </p>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Deactivating your account signs you out everywhere immediately.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={deactivateAccount.isPending}
            onClick={() => {
              if (confirm('Deactivate your account? You can contact support to reactivate it later.')) {
                deactivateAccount.mutate();
              }
            }}
          >
            {deactivateAccount.isPending ? 'Deactivating…' : 'Deactivate account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
