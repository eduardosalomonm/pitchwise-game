export type RevealBeat = 'cue' | 'movement' | 'space';
export const REVEAL_TIMING = { movement: 1400, space: 3300, loop: 5700 } as const;

// Cancellation also guards already-queued callbacks: rapid replays cannot finish an older run.
export function startRevealPlayback({ onBeat, schedule, clear, reducedMotion, onLoop }: {
  onBeat: (beat: RevealBeat) => void;
  schedule: (callback: () => void, delay: number) => number;
  clear: (id: number) => void;
  reducedMotion: boolean;
  onLoop?: () => void;
}) {
  let cancelled = false;
  const timers: number[] = [];
  onBeat('cue');
  if (!reducedMotion) {
    for (const beat of ['movement', 'space'] as const) {
      timers.push(schedule(() => { if (!cancelled) onBeat(beat); }, REVEAL_TIMING[beat]));
    }
    if (onLoop) timers.push(schedule(() => { if (!cancelled) onLoop(); }, REVEAL_TIMING.loop));
  }
  return () => { cancelled = true; timers.forEach(clear); };
}

export const responsibilityBadges: Record<string, string> = {
  'build-up-width': 'Passing angle spotted', 'overlap-decoy': 'Decoy run spotted',
  'recovery-inside': 'Recovery route spotted', 'far-side-tuck': 'Back-post danger spotted',
  'cover-centre-back': 'Cover spotted', 'six-cover-shadow': 'Passing lane spotted',
  'six-half-turn': 'Open side spotted', 'six-rest-defence': 'Counter protection spotted',
  'six-screen-ten': 'Dangerous pass spotted', 'six-delay-counter': 'Time to delay spotted',
  'cb-split': 'Build-up angle spotted', 'cb-carry': 'Space to carry spotted',
  'cb-cover': 'Partner’s cover spotted', 'cb-drop': 'Depth danger spotted',
  'cb-cross': 'Blind-side runner spotted',
};

export function getResponsibilityBadge(id: string, fallback: string) {
  const roleBadges:Record<string,string[]>={
    goalkeeper:['Free side','Sweeping chance','Set position','Cross to claim','Spare passing option'],
    'right-back':['Outside angle','Overlap decoy','Inside recovery','Far-post runner','Covering run'],
    'right-centre-back':['Split passing angle','Space to carry','Partner’s cover','Depth danger','Crossing threat'],
    'left-midfielder':['Support angle','Late arrival','Third-player run','Inside escape','Vacated channel'],
    'right-midfielder':['Receiving pocket','Far-side switch','Space-making run','Pivot screen','Second-ball danger'],
    'left-winger':['Wide outlet','Run behind','Inside rotation','Pressing curve','Overlapping runner'],
    'right-winger':['Weak-side space','Far-post arrival','Inside connection','Central escape','Recovery runner'],
    striker:['Defenders to pin','One-touch link','Blind-side run','Curved press','Rebound chance'],
  };
  const role=id.replace(/-\d+$/,'');
  const label=roleBadges[role]?.[Number(id.split('-').at(-1))-1];
  return responsibilityBadges[id] ?? `${label??fallback} spotted`;
}
