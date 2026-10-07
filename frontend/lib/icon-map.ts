import { Award, Code2, FileText, type LucideIcon, Mic, Repeat, Sparkles, Target, Trophy } from 'lucide-react';

// Mirrors the icon names used in backend/src/achievements/badge-catalog.ts.
// Falls back to Award for any future badge code added on the backend
// before its icon is wired in here.
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Mic,
  Repeat,
  FileText,
  Target,
  Code2,
  Trophy,
};

export function getBadgeIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Award;
}
