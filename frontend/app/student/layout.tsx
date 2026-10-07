'use client';

import type { ReactNode } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  Code2,
  FileText,
  History,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Trophy,
  User,
} from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Sidebar, type NavItem } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

const studentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Profile', href: '/student/profile', icon: User },
  { label: 'Resume', href: '/student/resume', icon: FileText },
  { label: 'Mock Interview', href: '/student/interview/setup', icon: Mic },
  { label: 'Coding', href: '/student/coding', icon: Code2 },
  { label: 'History', href: '/student/history', icon: History },
  { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy },
  { label: 'Achievements', href: '/student/achievements', icon: Award },
  { label: 'Analytics', href: '/student/analytics', icon: BarChart3 },
  { label: 'Notifications', href: '/student/notifications', icon: Bell },
  { label: 'Feedback', href: '/student/feedback', icon: MessageSquare },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar title="Student" items={studentNavItems} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-muted/30 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}