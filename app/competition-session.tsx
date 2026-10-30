'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// Keep the saved state and its in-flight journal under one browser-wide lock.
export function CompetitionSession({ storageKey, onBack, children }: {
  storageKey: string; onBack: () => void; children: ReactNode;
}) {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'busy' | 'unsupported'>('waiting');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!navigator.locks) {
      queueMicrotask(() => { if (active) setStatus('unsupported'); });
      return () => { active = false; };
    }
    let release: (() => void) | undefined;
    void navigator.locks.request(`pitchwise/${storageKey}`, { ifAvailable: true }, async (lock) => {
      if (!active) return;
      if (!lock) { setStatus('busy'); return; }
      setStatus('ready');
      await new Promise<void>((resolve) => { release = resolve; });
    }).catch(() => { if (active) setStatus('unsupported'); });
    const suspend = () => { active = false; setStatus('waiting'); release?.(); };
    const resume = (event: PageTransitionEvent) => { if (event.persisted) setAttempt((n) => n + 1); };
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storageKey) return;
      active = false;
      setStatus('busy');
      release?.();
    };
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', resume);
    window.addEventListener('storage', changed);
    return () => {
      active = false; release?.();
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('storage', changed);
    };
  }, [storageKey, attempt]);
  if (status === 'ready') return children;
  return <section className="mx-auto max-w-xl px-5 py-8" aria-label="Competition save protection">
    {status === 'waiting' ? <output>Opening your competition…</output> : <>
      <h1 className="text-2xl font-bold">{status === 'busy' ? 'Your competition is open elsewhere.' : 'A newer browser is needed.'}</h1>
      <p className="my-4">{status === 'busy' ? 'Close it in the other tab, then try again here. We’ll load your latest saved results.' : 'Open this competition in an up-to-date browser so your results can be saved safely across tabs.'}</p>
      <div className="flex flex-wrap gap-3">
        {status === 'busy' && <Button className="min-h-11" onClick={() => { setStatus('waiting'); setAttempt((n) => n + 1); }}>Try again</Button>}
        <Button className="min-h-11" variant="outline" onClick={onBack}>Back to competitions</Button>
      </div>
    </>}
  </section>;
}
