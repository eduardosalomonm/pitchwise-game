import type { Player, Point } from '@/lib/scenarios';
import { playerFacing } from '@/lib/pitch-cues';
import { routePoints, routeStyle } from '@/lib/pitch-motion';

// Shared by lesson and Match Day diagrams. Coordinates are pitch percentages on a 1000×700 viewBox.
export function PitchSurface() {
  return (
    <>
      <rect className="pitch-bg" height="700" rx="34" width="1000" />
      <g className="pitch-lines">
        <rect height="620" rx="3" width="920" x="40" y="40" />
        <line x1="500" x2="500" y1="40" y2="660" />
        <circle cx="500" cy="350" r="92" />
        <circle cx="500" cy="350" fill="currentColor" r="5" />
        <rect height="310" width="150" x="40" y="195" />
        <rect height="310" width="150" x="810" y="195" />
        <rect height="145" width="58" x="40" y="278" />
        <rect height="145" width="58" x="902" y="278" />
      </g>
      {[false, true].map((right) => (
        <g
          key={String(right)}
          className="pitch-goal"
          data-goal={right ? 'rival' : 'ours'}
          aria-hidden="true"
        >
          <rect
            className="goal-net"
            x={right ? 960 : 6}
            y="310"
            width="34"
            height="80"
          />
          {[326, 342, 358, 374].map((y) => (
            <line
              key={y}
              className="goal-mesh"
              x1={right ? 960 : 6}
              x2={right ? 994 : 40}
              y1={y}
              y2={y}
            />
          ))}
          <line
            className="goal-mesh"
            x1={right ? 977 : 23}
            x2={right ? 977 : 23}
            y1="310"
            y2="390"
          />
          <path
            className="goal-frame"
            d={right ? 'M960 310H994V390H960' : 'M40 310H6V390H40'}
          />
          <path
            className="goal-posts"
            d={right ? 'M960 304V316M960 384V396' : 'M40 304V316M40 384V396'}
          />
        </g>
      ))}
    </>
  );
}

export function ActivePlayerCue({
  player,
  context,
  ball,
  revealed = false,
}: {
  player: Player;
  context: string;
  ball?: Point;
  revealed?: boolean;
}) {
  const facing = !revealed ? playerFacing(player, context, ball) : undefined;
  const x = player.x * 10,
    y = player.y * 7;
  const labelY = y + (player.y > 78 ? -53 : 53);
  const angle = facing
    ? (Math.atan2((facing.y - player.y) * 7, (facing.x - player.x) * 10) *
        180) /
      Math.PI
    : 0;
  return (
    <g className="active-player-cue" aria-hidden="true">
      <circle className="active-halo" cx={x} cy={y} r="35" />
      {facing && (
        <path
          className="player-facing"
          data-facing="true"
          transform={`translate(${x} ${y}) rotate(${angle})`}
          d="M42 -14L62 0L42 14Z"
        />
      )}
      <rect
        className="you-badge"
        x={x - 31}
        y={labelY - 13}
        width="62"
        height="26"
        rx="8"
      />
      <text className="you-label" x={x} y={labelY + 7} textAnchor="middle">
        YOU
      </text>
    </g>
  );
}

export function PitchOrientation({ facing = false }: { facing?: boolean }) {
  return (
    <>
      <div
        className="match-pitch-orientation"
        aria-label="Our goal on the left. We attack the rival goal on the right."
      >
        <span>Our goal</span>
        <span className="attack-direction" aria-hidden="true">
          Attack →
        </span>
        <span>Rival goal</span>
      </div>
      {facing && (
        <small className="facing-key">
          Triangle = facing direction, not a run
        </small>
      )}
    </>
  );
}

export function PossessionNotice({ text }: { text?: string | null }) {
  return text ? (
    <output className="possession-notice">
      <span aria-hidden="true">↔</span>
      {text}
    </output>
  ) : null;
}

export function BallMarker({
  ball,
  path,
  steady = false,
  duration,
  delay,
  trail = true,
}: {
  ball: Point;
  path?: Point[];
  steady?: boolean;
  duration?: number;
  delay?: number;
  trail?: boolean;
}) {
  const x = ball.x * 10;
  const y = ball.y * 7;
  const moving = Boolean(path?.length);
  return (
    <>
      {moving && trail && (
        <polyline className="ball-trail" points={routePoints(ball, path!)} />
      )}
      <g
        className={`ball-marker ${moving ? 'has-route' : ''} ${moving && steady ? 'ball-route' : ''}`}
        style={
          moving
            ? routeStyle(
                ball,
                path!,
                duration === undefined ? undefined : { start: 0, end: 1 },
                duration,
                delay,
              )
            : undefined
        }
      >
        <circle cx={x} cy={y} r="12" />
        <path d={`M${x - 5},${y} l5,-6 5,6 -5,6z`} />
      </g>
    </>
  );
}
