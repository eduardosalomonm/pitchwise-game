import type { CSSProperties } from 'react';
import type { Movement, Point } from './scenarios';

export type MovementWindow = {
  start: number;
  end: number;
  stops?: { progress: number; time: number }[];
};
const same = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;

// The ball travels at constant speed in SVG coordinates. These fractions are
// shared by the renderer and pass-time checks, not separate animation guesses.
export function contactTimeline(from: Point, route: Point[]): number[] {
  const distances = route.map((to, i) => {
    const previous = i ? route[i - 1] : from;
    return Math.hypot((to.x - previous.x) * 10, (to.y - previous.y) * 7);
  });
  const total = distances.reduce((sum, d) => sum + d, 0);
  let travelled = 0;
  return distances.map((d) => {
    travelled += d;
    return total ? travelled / total : 1;
  });
}

export function movementWindow(
  from: Point,
  movement: Movement,
  ball: Point,
  path: Point[],
): MovementWindow {
  const contacts = contactTimeline(ball, path);
  if (movement.arriveAtBallContact !== undefined) {
    return { start: 0, end: contacts[movement.arriveAtBallContact] ?? 1 };
  }
  if (movement.via?.length) {
    const route = [...movement.via, movement.to];
    let previous = -1;
    const indices = route.map((point) => {
      const index = path.findIndex(
        (contact, i) => i > previous && same(contact, point),
      );
      previous = index;
      return index;
    });
    if (indices.every((index) => index >= 0)) {
      const start = indices[0] ? contacts[indices[0] - 1] : 0;
      const end = contacts[indices.at(-1)!];
      const progress = contactTimeline(from, route);
      return {
        start,
        end,
        stops: indices.map((index, i) => ({
          progress: progress[i],
          time: contacts[index],
        })),
      };
    }
  }
  const contact = path.findIndex((p) => same(p, movement.to));
  if (contact < 0) return { start: 0, end: 1 };
  // Receiving runs start after the preceding touch, even for a give-and-go
  // by the original owner. A check-back before release is explicitly authored.
  return { start: contact ? contacts[contact - 1] : 0, end: contacts[contact] };
}

export function routeStyle(
  from: Point,
  route: Point[],
  window?: MovementWindow,
  duration = 2.3,
  delay = 0.35,
): CSSProperties {
  const path = [
    'M 0 0',
    ...route.map((p) => `L ${(p.x - from.x) * 10} ${(p.y - from.y) * 7}`),
  ].join(' ');
  return {
    offsetPath: `path('${path}')`,
    offsetDistance: '100%',
    offsetRotate: '0deg',
    offsetAnchor: '0px 0px',
    ...(window
      ? {
          animationDelay: `${delay + duration * window.start}s`,
          animationDuration: `${Math.max(0.001, duration * (window.end - window.start))}s`,
          animationTimingFunction:
            window.stops && window.end > window.start
              ? `linear(0, ${window.stops.map((stop) => `${stop.progress} ${((stop.time - window.start) / (window.end - window.start)) * 100}%`).join(', ')})`
              : 'linear',
        }
      : {}),
  };
}
export function routePoints(from: Point, route: Point[]) {
  return [from, ...route].map((p) => `${p.x * 10},${p.y * 7}`).join(' ');
}
