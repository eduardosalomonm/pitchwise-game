import { KitSwatch } from '@/app/team-kit';
import { KIT_PRESETS, makeCustomTeam } from '@/lib/teams';

/** Keep the selected identity visible; expand only when changing it. */
export function ClubKitPicker({ name, kitId, onChange, group }: {
  name: string; kitId: string; onChange: (id: string) => void; group: string;
}) {
  return (
    <details className="club-kit-picker">
      <summary>
        <KitSwatch team={makeCustomTeam(name || 'Your Club', kitId)} />
        <span>{KIT_PRESETS.find((kit) => kit.id === kitId)?.name}</span>
        <strong>Change kit</strong>
      </summary>
      <fieldset className="my-kits">
        <legend>Choose your kit</legend>
        {KIT_PRESETS.map((kit) => (
          <label key={kit.id} className={kit.id === kitId ? 'is-selected' : ''}>
            <input type="radio" name={group} value={kit.id} checked={kitId === kit.id} onChange={() => onChange(kit.id)} />
            <KitSwatch team={makeCustomTeam(name || 'Your Club', kit.id)} />
            <span>{kit.name}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
