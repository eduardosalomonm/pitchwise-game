export function ReadThePlay({
  reading,
  compact = false,
}: {
  reading: { ball: string; pressure: string };
  compact?: boolean;
}) {
  return (
    <details className={`read-the-play${compact ? ' is-compact' : ''}`}>
      <summary>Read the play</summary>
      <div>
        <p>{reading.ball}</p>
        <p>{reading.pressure}</p>
      </div>
    </details>
  );
}
