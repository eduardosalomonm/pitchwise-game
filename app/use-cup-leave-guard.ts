'use client';

import { useEffect } from 'react';
import { setLeaveGuard } from '@/lib/navigation-guard';

// Both cups share navigation behavior, but retain their own scoring/persistence engines.
export function useCupLeaveGuard({ active, canSaveResult, saveResult, message }: {
  active: boolean;
  canSaveResult: () => boolean;
  saveResult: () => void;
  message: string;
}) {
  // Refresh the registered closure after every render, as the original guards did.
  useEffect(() => {
    setLeaveGuard(() => {
      if (canSaveResult()) {
        saveResult();
        return null;
      }
      return active ? message : null;
    });
    return () => setLeaveGuard(null);
  });

  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!canSaveResult()) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
}
