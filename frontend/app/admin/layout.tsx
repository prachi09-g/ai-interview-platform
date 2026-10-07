'use client';

import type { ReactNode } from 'react';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  ScrollText,
  Tags,
  Terminal,
  Users,
  Wrench,
} from 'lucide-react';
import { RoleGuard } from '@/components/guards/role-guard';
import { Sidebar, type NavItem } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

// Mirrors the (admin) route group planned in the Phase 1 folder structure.
// Full CRUD screens for Users, Categories, Questions, Coding Questions,
// Skills, Feedback, Logs (Phase 7), and Resume Templates (Phase 8, once
// the Resume module existed to need a ResumeTemplate table) are all built.
// Analytics stays a nav link without a page until Phase 12.
const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Categories', href: '/admin/categories', icon: Tags },
  { label: 'Questions', href: '/admin/questions', icon: ListChecks },
  { label: 'Coding Questions', href: '/admin/coding-questions', icon: ScrollText },
  { label: 'Skills', href: '/admin/skills', icon: Wrench },
  { label: 'Resume Templates', href: '/admin/resume-templates', icon: FileText },
  { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { label: 'Logs', href: '/admin/logs', icon: Terminal },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="ADMIN">
      <div className="flex min-h-screen">
        <Sidebar title="Admin" items={adminNavItems} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-muted/30 p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
