import type { Player, Point, Movement } from './scenarios';

export const roleNames: Record<string, string> = { GK: 'Goalkeeper', LB: 'Left-back', RB: 'Right-back', LCB: 'Left centre-back', RCB: 'Right centre-back', '6': 'Defensive midfielder', L8: 'Left central midfielder', R8: 'Right central midfielder', LW: 'Left winger', RW: 'Right winger', '9': 'Striker' };
export type Placement = [string, number, number];
const slots: Placement[] = [['gk',8,50],['lb',29,13],['lcb',26,37],['rcb',26,63],['rb',29,87],['six',42,50],['l8',53,32],['r8',53,68],['lw',68,12],['rw',68,88],['st',74,50]];
export const labels: Record<string,string> = { gk:'GK',lb:'LB',lcb:'LCB',rcb:'RCB',rb:'RB',six:'6',l8:'L8',r8:'R8',lw:'LW',rw:'RW',st:'9' };
export function authoredScene(active: string, owner: string | Point, placements: Placement[], territory: number = 50) {
  const overrides = new Map(placements.map(([id,x,y])=>[id,{x,y}]));
  const players: Player[] = [];
  for(const team of ['home','away'] as const) for(const [slot,x,y] of slots) {
    const id = `${team === 'home' ? 'h' : 'a'}-${slot}`;
    const shift = Math.max(-17,Math.min(17,(territory-50)*.45));
    const point = overrides.get(id) ?? {x: slot === 'gk' ? (team === 'home' ? 8 : 92) : Math.max(12,Math.min(88,(team === 'home' ? x : 100-x)+shift)), y: team === 'home' ? y : 100-y};
    const label = labels[slot];
    players.push({id,label,role:roleNames[label],team,active:id===active,...point, ...(!overrides.has(id) && id !== active ? {background:true} : {})});
  }
  // Keep contextual markers readable without moving any authored tactical actor.
  const occupied=players.filter(player=>!player.background);
  for(const player of players.filter(player=>player.background)) {
    const clear=(x:number,y:number)=>occupied.every(other=>Math.hypot((x-other.x)*10,(y-other.y)*7)>=42);
    if(!clear(player.x,player.y)) {
      const offsets=[[0,-7],[0,7],[-5,0],[5,0],[-5,-7],[5,7],[0,-12],[0,12]];
      const point=offsets.map(([dx,dy])=>({x:player.x+dx,y:player.y+dy})).find(p=>p.x>=6&&p.x<=94&&p.y>=8&&p.y<=92&&clear(p.x,p.y));
      if(point)Object.assign(player,point);
    }
    occupied.push(player);
  }
  const ball = typeof owner === 'string' ? players.find(player=>player.id===owner) : owner;
  if(!ball) throw new Error('Missing ball owner in tactical scene');
  return {players,ball:{x:ball.x,y:ball.y},ballOwnerId:typeof owner==='string'?owner:undefined};
}
export const move = (playerId:string, x:number, y:number, label=''):Movement => ({playerId,to:{x,y},label});
