import type { Movement, Player, Point } from './scenarios';
import { roleNames } from './tactical-scene.ts';
export type PitchPlayer = Player & { background?: boolean };
const positions = [
 ['GK',8,50],['LB',30,14],['LCB',25,38],['RCB',25,62],['RB',30,86],
 ['6',42,50],['L8',53,32],['R8',53,68],['LW',69,12],['RW',69,88],['9',74,50],
] as const;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,(a.y-b.y)*.7);
const clamp=(v:number,min=7,max=93)=>Math.max(min,Math.min(max,v));

/** New scenes contain a complete authored XI. Legacy lessons retain their duels and IDs. */
export function completeTeamShape(involved:Player[],ball:Point,unavailablePlayerIds:string[]=[]):PitchPlayer[]{
 if(involved.length===22-unavailablePlayerIds.length)return involved.map(player=>({...player}));
 const players:PitchPlayer[]=[];
 for(const team of ['home','away'] as const){
  const home=team==='home';
  const shift=clamp((ball.x-50)*.3,-12,12);
  const slots=positions.map(([label,x,y],index)=>({id:`shape-${team}-${index}`,label,role:roleNames[label],team,background:true,x:label==='GK'?(home?8:92):clamp((home?x:100-x)+shift),y:home?y:100-y}));
  const available=new Set(slots.map((_,index)=>index));
  const authored=involved.filter(player=>player.team===team).sort((a,b)=>Number(b.label==='GK')-Number(a.label==='GK'));
  for(const player of authored){
   const candidates=[...available].filter(index=>{
    const label=slots[index].label;
    return player.label==='CB'?label==='LCB'||label==='RCB':player.label==='8'||player.label==='10'?label==='L8'||label==='R8':label===player.label;
   });
   if(!candidates.length)throw new Error(`Invalid or duplicate role: ${team} ${player.label}`);
   const nearest=candidates.sort((a,b)=>distance(slots[a],player)-distance(slots[b],player))[0];
   available.delete(nearest);
   const label=player.label==='10'?'10':slots[nearest].label;
   players.push({...player,label,role:label==='10'?'Attacking midfielder':roleNames[label]});
  }
  for(const index of available){
   const slot=slots[index];
   const candidates=[slot,...[-8,8,-16,16].flatMap(dy=>[-6,0,6].map(dx=>({...slot,x:clamp(slot.x+dx),y:clamp(slot.y+dy)})))];
   const free=candidates.find(point=>players.every(player=>distance(player,point)>=5.7))??slot;
   players.push(free);
  }
 }
 return players;
}

/** Only authored runs are shown: decorative movement can contradict a tactical lesson. */
export function teamMovements(_players:PitchPlayer[],authored:Movement[],_ball:Point,_ballTo:Point|undefined,_defending:boolean):Movement[]{
 return authored;
}
