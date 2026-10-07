import type { ReactNode } from 'react';
import { WaveformPulse } from '@/components/shared/waveform';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const readouts = [
  { label: 'Interview domains', value: '06' },
  { label: 'Avg. mock session', value: '10 MIN' },
  { label: 'Answers AI-scored', value: '100%' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Signature hero panel — kept to this one screen per the design plan */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />
        </div>

        <div className="relative z-10 font-display text-lg font-semibold tracking-tight">
          AI Interview<span className="text-primary">.</span>Prep
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <h1 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight">
            Practice the interview,
            <br />
            not just the answers.
          </h1>
          <p className="text-white/70">
            Mock technical, HR, and coding interviews — scored on what actually gets you hired:
            clarity, confidence, and pacing, not just what you said.
          </p>

          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-white/50">
                Live answer readout
              </span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            </div>
            <WaveformPulse bars={32} className="h-12" />
          </div>

          <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {readouts.map((r) => (
              <div key={r.label}>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-white/50">{r.label}</dt>
                <dd className="mt-1 font-mono text-xl font-medium text-primary">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative z-10 font-mono text-[11px] text-white/40">
          Final Year Major Project — AI Interview Preparation &amp; Evaluation Platform
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex justify-between p-6 lg:justify-end">
          <span className="font-display text-lg font-semibold tracking-tight lg:hidden">
            AI Interview<span className="text-primary">.</span>Prep
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
