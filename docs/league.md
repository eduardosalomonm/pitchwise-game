# My League

Select Tournaments → My League, or use `/#league`. The existing standalone matches,
Readers’ Cup, My Tournament and training remain available with unchanged saves.

## Rules and content

- 4–12 clubs, one meeting per rival or home/away. Name your club or choose a suggestion;
  pick one of eight kit designs. Rivals reuse the existing fictional club/kit registry.
- True round-robin calendar: balanced venues, reversed return fixtures, actual rest weeks
  for odd sizes. Rival games simulate once, deterministically, after each matchweek.
- Three points for a win, one for a draw. No league penalties. Table ties use goal
  difference, goals scored, then the seeded draw order; this is disclosed in the rules.
- Our row is highlighted; form shows the last five W/D/L results, oldest to newest.
  Between-match reports show points, table movement, all results and a fact from the week.
- Moment-length decks: 10% three, 40% four, 40% five, 10% six across each ten fixtures.
  Short seasons sample this deck rather than guaranteeing every length.
- 271 regular plays: the historical 109, the first 41 league-only situations, and
  121 new level-specific situations. New action images reuse existing original
  assets; no third-party footage or dependency is introduced.
- Regular situations do not repeat within a season, including the maximum 22 matches.
  Openings can attack, defend or transition; every match has a reachable winning path.

## Difficulty and capacity

New seasons choose Easy, Intermediate (default), or Hard before kickoff. The choice
lasts for the season. It selects tactical content, not a probability of winning:
scoring, turnovers and recovery follow the chosen branches. Simulated rival fixtures
and the calendar do not change with the selected level.

Attacking and defending slots each use a seeded, shuffled eight-slot deck:

| Mode | Easy plays | Intermediate plays | Hard plays |
| --- | ---: | ---: | ---: |
| Easy | 6 | 2 | 0 |
| Intermediate | 1 | 6 | 1 |
| Hard | 0 | 2 | 6 |

Counters continue across the season, not per match. Partial decks may vary, but full
decks are 75% the selected tier. New authored main routes take 2/3/4 linked reads and
offer 3/4/4 options respectively. Historical stories retain their existing graph
lengths. Pressure, receiving orientation, support and timing also change; difficulty
is not a renamed answer or a hidden scoring penalty.

The maximum season is 22 matches. Two complete ten-match length decks require 50
attacking and 40 defensive slots. The last two matches add at most 6 and 5: a maximum
of 56 attacks and 45 defences, 101 moments. A primary tier therefore needs 42 attacks
and 35 defences. Rounded-up 10% reserve gives 47 and 39 **eligible** plays per tier:

| Tier | Existing eligible A/D | Added A/D | Final eligible A/D |
| --- | ---: | ---: | ---: |
| Easy | 23/18 | 24/21 | 47/39 |
| Intermediate | 26/24 | 21/15 | 47/39 |
| Hard | 24/22 | 23/17 | 47/39 |

An eligible attack has a reachable positive goal difference; an eligible defence
(including transition roots) has a reachable non-negative outcome. The 13 historical
non-scoring attacking stories remain in the review/collector catalogue, but cannot
silently occupy a promised scoring slot. New allocation requires the exact planned
tier rather than silently falling back to another level late in the season.

Rare new highlights are capped at one potential opportunity per five player
fixtures, never more than one per match. Their choice of shot still depends on the
visible keeper, ball control and cover; a highlight does not award a goal automatically.
Shot height is described in the narrative: the overhead pitch remains a 2D projection.
Each bucket has sufficient ordinary plays even when every rare opportunity is excluded.

## Dismissals

There are 12 additional graphs, not replacements or recoloured regular plays:
six for our ten players and six against ten, with attack and defence on both sides.

One seeded potential dismissal occurs per five player fixtures. Short seasons may
not include one. This is a fictional off-ball second-yellow event between moments,
not a hidden punishment for a chosen answer. Only one team is reduced in a match.

The event arrives with a brief notice. The count persists through every remaining
moment. The left eight is actually absent in all branches: 21 markers, missing
midfield cover and adjusted support. Against ten: three options/two linked reads
and clearer outlets; with ten: four options/three reads and fewer attacking chances.
Neither state guarantees a goal. The following fixture returns to eleven players;
season suspensions, injuries and substitutions are not implemented.

## State boundaries

The engine (`lib/league.ts`) owns rules, not UI. The allocation module owns content,
not standings. `app/league.tsx` renders setup, calendar, matchweek reports and table
using the existing broadcast styling and match component.

`pitchwise-league-v1` stores settings/seed and our completed results. Rival results
and standings reconstruct through the engine, rather than trusting copied tables.
`pitchwise-league-match-v1` journals validated choice IDs and pending-reveal state,
not trusted scores or scenes. Leave/reload resumes the active decision; full time
commits the result before Continue and clears the journal. Moment review is non-scoring.
Unavailable local storage shows a warning and still allows in-memory play.

Preserve catalogue IDs and order for seeded saves. Missing `config.difficulty` is
intentional on v35 saves: their entire season uses the original 150-play pool and
opponent-driven allocator. Do not default old saves to Intermediate, which would
reroll the current fixture and invalidate its journal. Both storage keys/payload v1
remain compatible. New setup always saves an explicit difficulty. The historical
cup pool remains 109; league additions must never be appended to it.

Collectors are not activated by this feature. Where recording is separately enabled,
league events use the authored `league` catalogue; invented choice IDs are rejected
and verdicts recalculated. No database/schema/configuration change is required.

## Validation

The unit suite checks all 18 team-count/leg settings, true byes, venue balance,
immutable single-award results, complete-season reconstruction, last-five form,
weighted lengths, all 54 difficulty/size/leg settings, exact phase-tier decks,
10% capacity reserve, fresh allocation, both dismissals and a reachable win per match.
Literal v35 saved fixtures and journals are upgrade regressions, not snapshots
regenerated by the new allocator. Shared tactical tests include all 174 league graphs:
continuity, valid coordinates,
synchronized contacts and pass-time offside for both teams, including later touches
and original-shot eligibility after a save. Only direct restart deliveries are exempt.

The isolated league browser suite exercises all three level choices at 320px using
the keyboard, selected-level reload, a literal v35 pending upgrade, a full season, pending
reload, committed exit/resume through visible/global/hash navigation, full-time save
before Continue, non-scoring review, unavailable storage, both red-card sides,
21-player diagrams, real venues and 320px badge/title/pitch layout. The other seven
game suites remain regression coverage. All telemetry requests are mocked.

Chromium responsive checks are not certification on a physical iPhone/Safari.
Before expanding gameplay, run a short friend playtest: understand the dismissal,
find the next match, recover a saved decision, and distinguish useful flair from
forcing an action. Additional weather, fatigue or season bans need their own rules,
content and tests rather than cosmetic badges.
