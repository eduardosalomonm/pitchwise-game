// One place that decides whether leaving the current screen would lose unsaved play.
// Screens with unsaved work register a guard; global navigation (logo, Back, hash links)
// asks before leaving. A confirmed leave is remembered briefly, because the browser can
// report one Back press as both popstate and hashchange.
type Guard = () => string | null;
let guard: Guard | null = null;
let confirmedUntil = 0;

export function setLeaveGuard(next: Guard | null) {
  if (next !== guard) confirmedUntil = 0;
  guard = next;
}

export function confirmLeave(confirm: (message: string) => boolean = (m) => window.confirm(m)): boolean {
  if (Date.now() < confirmedUntil) return true;
  const message = guard?.();
  if (!message) return true;
  if (!confirm(message)) return false;
  confirmedUntil = Date.now() + 1000;
  return true;
}
