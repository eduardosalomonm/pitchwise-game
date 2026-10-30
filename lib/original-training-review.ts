import type { Scenario } from './scenarios';
import { move } from './tactical-scene.ts';

export function reviewOriginalTraining(s:Scenario):Scenario {
 const players=s.players.map(p=>({...p}));
 const movements=s.reveal.movements.map(m=>({...m}));
 let ballTo=s.reveal.ballTo;
 let context=s.context;
 const set=(id:string,x:number,y:number)=>{const p=players.find(p=>p.id===id);if(p)Object.assign(p,{x,y});};
 const add=(id:string,x:number,y:number)=>{if(!movements.some(m=>m.playerId===id))movements.push(move(id,x,y));};
 switch(s.id){
  case 'build-up-width': add('press-1',31,36);break;
  case 'overlap-decoy':add('opp-rb',72,13);add('lw',68,28);ballTo={x:68,y:28};break;
  case 'recovery-inside':set('lw',76,21);players.find(p=>p.id==='runner')!.label='RW';add('runner',50,28);add('lw',74,20);break;
  case 'far-side-tuck':add('far-runner',29,24);add('rb',36,83);break;
  case 'cover-centre-back':add('runner',33,28);break;
  case 'six-cover-shadow':add('press-nine',33,40);break;
  case 'six-half-turn':context='The six has just received from the left centre-back. Pressure approaches from the left shoulder, while the right central midfielder is free.';ballTo={x:48,y:56};add('opp-ten',47,47);break;
  case 'six-rest-defence':context='The left winger carries near the box. The left-back, a central midfielder and the striker are committed ahead, while a forward waits to counter through the centre.';add('counter-nine',52,50);break;
  case 'six-screen-ten':players.find(p=>p.id==='opp-winger')!.label='LW';add('press-nine',64,48);break;
  case 'six-delay-counter':players.find(p=>p.id==='left-runner')!.label='RW';players.find(p=>p.id==='right-runner')!.label='LW';add('carrier',54,46);ballTo={x:54,y:46};add('lcb',25,39);add('rcb',25,64);add('left-runner',50,23);add('right-runner',49,76);break;
  case 'cb-split':add('striker',21,48);break;
  case 'cb-carry':add('striker',43,43);add('rcb',24,55);break;
  case 'cb-cover':add('runner',31,43);break;
  case 'cb-drop':ballTo={x:35,y:30};break;
  case 'cb-cross':set('lcb',23,42);set('rcb',21,61);set('runner',28,36);context='The opponent’s left winger prepares a cross from our right. The striker threatens the far centre-back’s blind side while the partner covers the near zone.';break;
  default:throw new Error(`Unreviewed original lesson: ${s.id}`);
 }
 return {...s,players,context,reveal:{...s.reveal,movements,ballTo}};
}
