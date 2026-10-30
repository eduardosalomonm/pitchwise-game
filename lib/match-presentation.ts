import type { DecisionNode, MatchChoice, MatchRun } from './match-day';
import { generatedArt } from './generated-art.ts';

// A choice's still frame follows the selected action, never the ideal alternative.
export const matchArt:Record<string,string>={
 'm1-gk/right-cb':'goalkeeper-1','m1-gk/force-six':'match-interception','m1-gk/go-long':'striker-1',
 'm1-cb/carry':'right-centre-back-2','m1-cb/early-wide':'right-back-1','m1-cb/square':'match-interception',
 'm1-six/half-turn':'right-midfielder-1','m1-six/turn':'match-interception','m1-six/back':'right-centre-back-1',
 'm1-combine/set-run':'right-winger-3','m1-combine/dribble':'match-interception','m1-combine/stay-wide':'match-interception',
 'm1-striker/bend-finish':'match-home-goal','m1-striker/near':'match-blocked-shot','m1-striker/hold':'striker-1',
 'm1-defend-six/delay':'match-duel','m1-defend-six/dive':'match-failed-tackle','m1-defend-six/chase-ball':'right-back-3',
 'm1-defend-cb/delay-cover':'right-centre-back-3','m1-defend-cb/step':'match-duel',
 'm1-defend-gk/sweep':'match-save','m1-defend-gk/hold-line':'match-rival-goal',
 'm1-late-recovery/delay':'match-duel','m1-late-recovery/dive':'match-rival-goal',
 'm2-winger/track':'left-winger-5','m2-winger/ball':'left-winger-4','m2-winger/stay':'left-winger-1',
 'm2-lb/inside':'match-duel','m2-lb/follow':'left-winger-5',
 'm2-cross/front':'right-centre-back-5','m2-cross/watch':'match-rival-header',
 'm3-eight/winger':'left-midfielder-3','m3-eight/carry':'match-interception','m3-eight/switch':'right-midfielder-2',
 'm3-winger/inside':'left-winger-3','m3-winger/overlap-pass':'match-interception',
 'm3-finish/arrive':'match-home-goal','m3-finish/early':'match-blocked-shot',
 'm4-six/delay':'match-duel','m4-six/tackle':'match-failed-tackle','m4-six/retreat':'right-centre-back-4',
 'm4-cb/drop':'right-centre-back-3','m4-cb/step':'match-duel',
 'm4-gk/sweep':'goalkeeper-2','m4-gk/line':'match-rival-goal',
 'm5-ten/feet':'left-midfielder-3','m5-ten/through':'match-interception','m5-ten/switch':'right-midfielder-2',
 'm5-striker/set':'striker-2','m5-striker/turn':'match-interception',
 'm5-finish/square':'match-home-goal','m5-finish/shoot':'striker-5',
};

export function getMatchArt(node:DecisionNode, choice:MatchChoice) {
 const id=choice.artId ?? matchArt[`${node.id}/${choice.id}`];
 if(!id)throw new Error(`Missing action art: ${node.id}/${choice.id}`);
 return {src:`/illustrations/actions/${id}.webp`,alt:generatedArt[id].alt,caption:choice.label};
}

export function visibleScore(run:MatchRun, includePending=false) {
 return {home:run.homeScore+(includePending?run.pending?.outcome?.homeGoals??0:0),away:run.awayScore+(includePending?run.pending?.outcome?.awayGoals??0:0)};
}

export function goalFeeling(home:number,away:number,homeGoal:boolean) {
 if(!homeGoal)return {title:'Rival XI score.',detail:'Regroup. The next decision is yours.'};
 return {title:'GOOOAL!',detail:home-away>1?'You extend the lead.':home>away?'You take the lead.':home===away?'Back on level terms!':'One back. Keep believing.'};
}

export function hasPlayableMotion(node:DecisionNode, choice:MatchChoice) {
 return choice.movement.some(move=>{const p=node.scene.players.find(p=>p.id===move.playerId);return p&&(p.x!==move.to.x||p.y!==move.to.y||(move.via?.length??0)>0);})||Boolean(choice.ballPath?.some(p=>p.x!==node.scene.ball.x||p.y!==node.scene.ball.y));
}
