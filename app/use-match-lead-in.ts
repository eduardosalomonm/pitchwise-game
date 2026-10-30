'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LEAD_IN_END_MS } from '@/lib/match-lead-ins';

/** Presentation only: never records a decision or changes a match run. */
export function useMatchLeadIn(
  key: string,
  enabled: boolean,
  reducedMotion: boolean,
) {
  const [state, setState] = useState({
    key,
    replay: 0,
    done: false,
    still: false,
  });
  const current = state.key === key;
  const previewing =
    enabled &&
    (reducedMotion ? current && state.still : !current || !state.done);
  const playing = previewing && !reducedMotion;
  const blocked = useRef(previewing);
  const isBlocked = useCallback(() => blocked.current, []);
  useLayoutEffect(() => { blocked.current = previewing; }, [previewing]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      blocked.current = false;
      setState({ key, replay: state.replay, done: true, still: false });
    }, LEAD_IN_END_MS);
    return () => window.clearTimeout(timer);
  }, [key, playing, state.replay]);

  const finish = () => {
    blocked.current = false;
    setState((previous) => ({ ...previous, key, done: true, still: false }));
  };
  const replay = () => {
    blocked.current = true;
    setState((previous) => ({
      key,
      replay: previous.replay + 1,
      done: false,
      still: reducedMotion,
    }));
  };
  const reset = useCallback(() => {
    setState((previous) => ({
      key: '',
      replay: previous.replay + 1,
      done: false,
      still: false,
    }));
  }, []);
  return {
    previewing,
    playing,
    isBlocked,
    replayKey: state.replay,
    finish,
    replay,
    reset,
  };
}
