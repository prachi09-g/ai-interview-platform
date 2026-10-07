import { cn } from '@/lib/utils';

interface WaveformPulseProps {
  bars?: number;
  className?: string;
}

/**
 * A row of bars pulsing at staggered delays/durations, suggesting a live
 * audio waveform. This is the one signature visual element of the
 * platform's design (see design plan in Phase 5) — used once, on the auth
 * hero panel, and kept out of everywhere else so it stays memorable
 * instead of decorative wallpaper.
 */
export function WaveformPulse({ bars = 24, className }: WaveformPulseProps) {
  return (
    <div className={cn('flex items-end gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const heightPct = 30 + ((i * 37) % 70); // deterministic pseudo-random heights, no hydration mismatch
        const duration = 0.9 + ((i * 13) % 10) / 10;
        const delay = ((i * 7) % 12) / 10;
        return (
          <span
            key={i}
            className="w-1 rounded-full bg-primary/80 animate-pulse-bar origin-bottom"
            style={{
              height: `${heightPct}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
