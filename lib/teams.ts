export type KitPattern = 'solid' | 'stripes' | 'hoops' | 'sash' | 'halves';
export type TeamKit = {
  primary: string;
  secondary: string;
  pattern: KitPattern;
};
export type TeamIdentity = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  legacy: string;
  kit: TeamKit;
};
const team = (
  id: string,
  name: string,
  shortName: string,
  code: string,
  legacy: string,
  primary: string,
  secondary: string,
  pattern: KitPattern,
): TeamIdentity => ({
  id,
  name,
  shortName,
  code,
  legacy,
  kit: { primary, secondary, pattern },
});

// Original fictional clubs. IDs and competition results stay independent of kit colours.
export const teams: TeamIdentity[] = [
  team(
    'pitchwise',
    'Pitchwise FC',
    'Pitchwise',
    'PWF',
    'Our XI',
    '#f6eedb',
    '#e86a32',
    'sash',
  ),
  team(
    'harbour',
    'Port Meridian',
    'Meridian',
    'PMR',
    'Harbour XI',
    '#172d57',
    '#ec6971',
    'hoops',
  ),
  team(
    'runners',
    'Flecha Norte',
    'Flecha',
    'FLN',
    'Runners XI',
    '#174c39',
    '#ebcc66',
    'sash',
  ),
  team(
    'bait',
    'Bruma Sporting',
    'Bruma',
    'BRU',
    'Bait XI',
    '#492c73',
    '#b2dfd0',
    'halves',
  ),
  team(
    'cedar',
    'Eastgate Rovers',
    'Eastgate',
    'EGR',
    'Cedar XI',
    '#2855a1',
    '#eff1f2',
    'stripes',
  ),
  team(
    'atlas',
    'Stonebridge Athletic',
    'Stonebridge',
    'SBA',
    'Atlas XI',
    '#6e2843',
    '#f0d7b8',
    'solid',
  ),
  team(
    'vale',
    'Ironvale United',
    'Ironvale',
    'IVU',
    'Vale XI',
    '#303c45',
    '#d98f66',
    'hoops',
  ),
  team(
    'orion',
    'Orion Vale',
    'Orion',
    'ORV',
    'Orion XI',
    '#173a57',
    '#e4c55f',
    'sash',
  ),
  team(
    'narrow',
    'Costa Azul',
    'Costa Azul',
    'CAZ',
    'Narrow XI',
    '#205fb5',
    '#a8d4e7',
    'halves',
  ),
  team(
    'copper',
    'Cobre Union',
    'Cobre',
    'COB',
    'Copper XI',
    '#703536',
    '#e8b467',
    'stripes',
  ),
  team(
    'dune',
    'Dune Wanderers',
    'Dune',
    'DNW',
    'Dune XI',
    '#d99c41',
    '#28343d',
    'sash',
  ),
  team(
    'birch',
    'Bosque Athletic',
    'Bosque',
    'BQA',
    'Birch XI',
    '#255241',
    '#f0e6d3',
    'hoops',
  ),
  team(
    'weavers',
    'Loombridge City',
    'Loombridge',
    'LBC',
    'Weavers XI',
    '#862e4e',
    '#cbe7ea',
    'halves',
  ),
  team(
    'summit',
    'Altura Rovers',
    'Altura',
    'ATR',
    'Summit XI',
    '#423b7c',
    '#bdd7b5',
    'stripes',
  ),
  team(
    'brook',
    'Brookside Town',
    'Brookside',
    'BST',
    'Brook XI',
    '#228a90',
    '#182e45',
    'solid',
  ),
  team(
    'comet',
    'Cometa Sporting',
    'Cometa',
    'COM',
    'Comet XI',
    '#6c398c',
    '#e8e0ee',
    'sash',
  ),
  team(
    'arrow',
    'Halcyon Rangers',
    'Halcyon',
    'HCR',
    'Arrow XI',
    '#bc3c45',
    '#28343e',
    'hoops',
  ),
  team(
    'flint',
    'Flint Borough',
    'Flint',
    'FLB',
    'Flint XI',
    '#556675',
    '#ebd26f',
    'sash',
  ),
  team(
    'tide',
    'Maré Azul',
    'Maré',
    'MAZ',
    'Tide XI',
    '#246d91',
    '#e5d3ad',
    'hoops',
  ),
  team(
    'grove',
    'Arboleda FC',
    'Arboleda',
    'ARB',
    'Grove XI',
    '#357152',
    '#ece0c5',
    'halves',
  ),
  team(
    'towers',
    'Highmoor Athletic',
    'Highmoor',
    'HMA',
    'Towers XI',
    '#692d42',
    '#c7a667',
    'hoops',
  ),
  team(
    'ember',
    'Emberfield FC',
    'Emberfield',
    'EMB',
    'Ember XI',
    '#27343f',
    '#df5a55',
    'halves',
  ),
  team(
    'cove',
    'Bahía Sporting',
    'Bahía',
    'BAH',
    'Cove XI',
    '#3eabc0',
    '#18304c',
    'stripes',
  ),
  team(
    'pine',
    'Pinar United',
    'Pinar',
    'PNU',
    'Pine XI',
    '#efe5cd',
    '#28523b',
    'sash',
  ),
  team(
    'banks',
    'Bancroft Town',
    'Bancroft',
    'BCT',
    'Banks XI',
    '#a2344a',
    '#f1e4cd',
    'sash',
  ),
  team(
    'quartz',
    'Quartz City',
    'Quartz',
    'QZC',
    'Quartz XI',
    '#472f64',
    '#bda7d4',
    'solid',
  ),
  team(
    'reed',
    'Reedbank Athletic',
    'Reedbank',
    'RBA',
    'Reed XI',
    '#9bab76',
    '#2b4938',
    'stripes',
  ),
  team(
    'aurora',
    'Aurora Sporting',
    'Aurora',
    'AUR',
    'Aurora XI',
    '#78b4d3',
    '#21365e',
    'sash',
  ),
  team(
    'compass',
    'Astral Club',
    'Astral',
    'AST',
    'Compass XI',
    '#242947',
    '#c4a866',
    'halves',
  ),
  team(
    'breakers',
    'Breakwater United',
    'Breakwater',
    'BKU',
    'Breakers XI',
    '#1c537b',
    '#57bdc3',
    'hoops',
  ),
  team(
    'slate',
    'Slateford Rovers',
    'Slateford',
    'SLR',
    'Slate XI',
    '#354553',
    '#a5c7df',
    'stripes',
  ),
  team(
    'meadow',
    'Meadow Park',
    'Meadow',
    'MDP',
    'Meadow XI',
    '#a0b976',
    '#66304c',
    'halves',
  ),
];
export const HOME_TEAM = teams[0];
const lookup = new Map(
  teams.flatMap((t) =>
    [t.id, t.name, t.shortName, t.legacy, t.code].map(
      (key) => [key, t] as const,
    ),
  ),
);
export function getTeam(key: string): TeamIdentity {
  const identity = lookup.get(key);
  if (!identity) throw new Error(`Unknown team: ${key}`);
  return identity;
}
export const fixtureTeamIds: Record<string, string> = {
  original: 'cedar',
  'low-block': 'atlas',
  'second-ball': 'vale',
  'high-pressure': 'summit',
  'changing-picture': 'aurora',
  'harbour-outlets': 'harbour',
  'narrow-width': 'narrow',
  'arrow-middle': 'arrow',
  'runners-tracking': 'runners',
  'weavers-press': 'weavers',
  'towers-rebounds': 'towers',
  'banks-block': 'banks',
  'bait-traps': 'bait',
  'breakers-transition': 'breakers',
  'compass-rhythm': 'compass',
};
export function fixtureTeam(fixtureId: string): TeamIdentity {
  return getTeam(fixtureTeamIds[fixtureId]);
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Rough perceptual distance between two shirt colours (0 = identical). */
export function colourDistance(a: string, b: string) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const mean = (r1 + r2) / 2;
  return Math.sqrt((2 + mean / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - mean) / 256) * (b1 - b2) ** 2);
}
const CLASH = 115;
const CHANGE_STRIP: TeamKit = { primary: '#2b2f36', secondary: '#f4f1e8', pattern: 'solid' };
export function matchKits(opponent: TeamIdentity, home: TeamIdentity = HOME_TEAM) {
  // An opponent whose shirt is close to ours wears its colours reversed, or a
  // charcoal change strip if that still clashes.
  const reversed = { ...opponent.kit, primary: opponent.kit.secondary, secondary: opponent.kit.primary };
  const away =
    colourDistance(opponent.kit.primary, home.kit.primary) >= CLASH
      ? opponent.kit
      : colourDistance(reversed.primary, home.kit.primary) >= CLASH
        ? reversed
        : CHANGE_STRIP;
  return {
    home: home.kit,
    away,
    homeKeeper: {
      primary: '#305c53',
      secondary: '#c7e0b0',
      pattern: 'solid',
    } as TeamKit,
    awayKeeper: {
      primary: '#673948',
      secondary: '#f1d3e1',
      pattern: 'solid',
    } as TeamKit,
  };
}
export function kitDescription(kit: TeamKit): string {
  return kit.pattern === 'solid'
    ? 'Plain shirt with contrast trim'
    : (
        {
          stripes: 'Vertical stripes',
          hoops: 'Horizontal hoops',
          sash: 'Diagonal sash',
          halves: 'Two-colour halves',
        } as const
      )[kit.pattern];
}

// Match content may be curated under a new opponent; replace only complete names.
export function renameOpponentText(
  value: string,
  oldName: string | undefined,
  newName: string,
  home: TeamIdentity = HOME_TEAM,
): string {
  let text = value;
  if (oldName && oldName !== newName) {
    text = text.replaceAll(oldName, newName);
    if (oldName.endsWith(' XI')) {
      const oldShort = oldName
        .slice(0, -3)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`\\b${oldShort}\\b`, 'g'), newName);
    }
  }
  return text
    .replace(/\bRival XI\b/g, newName)
    .replace(/\bRIVAL XI\b/g, newName)
    .replace(/\bOur XI\b/g, HOME_TEAM.name)
    .replace(/\bOUR XI\b/g, HOME_TEAM.name)
    .replaceAll(HOME_TEAM.name, home.name);
}

// My Tournament: the player names their club and picks one of eight strips.
export const KIT_PRESETS: { id: string; name: string; kit: TeamKit }[] = [
  { id: 'ember', name: 'Ember sash', kit: { primary: '#e86a32', secondary: '#fff4e6', pattern: 'sash' } },
  { id: 'navy', name: 'Navy hoops', kit: { primary: '#1d2f5c', secondary: '#f2c94c', pattern: 'hoops' } },
  { id: 'forest', name: 'Forest stripes', kit: { primary: '#1f6b45', secondary: '#f4f1e8', pattern: 'stripes' } },
  { id: 'crimson', name: 'Crimson classic', kit: { primary: '#b3262f', secondary: '#ffffff', pattern: 'solid' } },
  { id: 'sky', name: 'Sky halves', kit: { primary: '#6db3e8', secondary: '#ffffff', pattern: 'halves' } },
  { id: 'midnight', name: 'Midnight gold', kit: { primary: '#161616', secondary: '#d4a72c', pattern: 'stripes' } },
  { id: 'violet', name: 'Violet sash', kit: { primary: '#5b2a86', secondary: '#f3e8ff', pattern: 'sash' } },
  { id: 'ivory', name: 'Ivory hoops', kit: { primary: '#f7f3ea', secondary: '#1f4f8f', pattern: 'hoops' } },
];
export function validTeamName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const name = value.trim();
  return (
    name === value &&
    Array.from(name).length >= 2 &&
    Array.from(name).length <= 24 &&
    /^[\p{L}\p{N}][\p{L}\p{N} .'&-]*$/u.test(name) &&
    !teams.some((t) => t.name.toLowerCase() === name.toLowerCase() || t.shortName.toLowerCase() === name.toLowerCase())
  );
}
// Pitchwise FC never enters the rival draw in custom competitions.
export function validClubName(value: unknown): value is string {
  return validTeamName(value) || (typeof value === 'string' && value.toLowerCase() === 'pitchwise fc');
}

export function makeCustomTeam(name: string, kitId: string): TeamIdentity {
  const preset = KIT_PRESETS.find((k) => k.id === kitId) ?? KIT_PRESETS[0];
  const words = name.split(/\s+/).filter(Boolean);
  // Score code: one word → first three letters; two words → initial + two letters of the
  // second ("Real Barrio" → RBA); more → initials, skipping linking words.
  const clean = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '');
  const main = words.map(clean).filter((w) => w && !/^(de|del|la|las|los|el|the|of|and|y|da|do|di)$/i.test(w));
  const core = main.length ? main : words.map(clean).filter(Boolean);
  const letters = core.length === 1 ? core[0] : core.length === 2 ? core[0][0] + core[1] : core.map((w) => w[0]).join('');
  return {
    id: 'custom',
    name,
    // Whole words up to 14 characters, so scoreboards stay readable.
    shortName: words.reduce((short, word) => (short && (short + ' ' + word).length > 14 ? short : short ? `${short} ${word}` : word.slice(0, 14)), ''),
    code: (letters + core.join('')).slice(0, 3).toUpperCase().padEnd(3, 'X'),
    legacy: 'Our XI',
    kit: preset.kit,
  };
}
