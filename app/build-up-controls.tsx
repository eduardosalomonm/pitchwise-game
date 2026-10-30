'use client';

import { RotateCcw, SkipForward } from 'lucide-react';
import type { MatchLeadIn } from '@/lib/match-lead-ins';
import type { useMatchLeadIn } from '@/app/use-match-lead-in';

export function BuildUpControls({
  clip,
  playback,
  reducedMotion,
  onReplay,
  onFinish,
}: {
  clip: MatchLeadIn;
  playback: ReturnType<typeof useMatchLeadIn>;
  reducedMotion: boolean;
  onReplay: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="build-up-controls" aria-label="Build-up playback">
      <output aria-live="polite">
        {playback.playing
          ? 'Watch the build-up…'
          : playback.previewing
            ? 'Before the play'
            : 'Paused · your move'}
      </output>
      <button
        type="button"
        aria-label={reducedMotion ? 'View before the play' : 'Replay build-up'}
        title={reducedMotion ? 'View before the play' : 'Replay build-up'}
        onClick={onReplay}
      >
        <RotateCcw aria-hidden="true" />{' '}
        <span className="build-up-label">
          {reducedMotion ? 'Before' : 'Replay'}
        </span>
      </button>
      {playback.previewing && (
        <button
          type="button"
          aria-label={reducedMotion ? 'Return to decision' : 'Skip build-up'}
          onClick={onFinish}
        >
          <SkipForward aria-hidden="true" />
        </button>
      )}
      <span className="sr-only">
        {clip.description} Playback stops before your decision.
      </span>
    </div>
  );
}
