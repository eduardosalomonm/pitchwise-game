import assert from 'node:assert/strict';
import {test} from 'node:test';
import {courses} from '../lib/scenarios.ts';
import {matchMoments} from '../lib/match-day.ts';
import {completeTeamShape} from '../lib/team-shape.ts';

test('every lesson has distinct alternatives and one highlighted player',()=>{
 for(const course of courses){
  const answers=course.scenarios.flatMap(s=>s.choices.map(c=>c.label));
  assert.equal(new Set(answers).size,answers.length,course.id);
  for(const s of course.scenarios){
   const players=completeTeamShape(s.players,s.ball);
   assert.equal(players.filter(p=>p.active).length,1,s.id);
   assert.ok(players.every(p=>!['W','7','CB','8'].includes(p.label)),s.id);
   assert.ok(s.reveal.movements.every(m=>players.some(p=>p.id===m.playerId)),s.id);
  }
 }
});

test('the left eight cut-back shows the winger carry before the arriving receiver', () => {
 const s=courses.flatMap(c=>c.scenarios).find(s=>s.id==='left-midfielder-2');
 const winger=s.reveal.movements.find(m=>m.playerId==='h-lw');
 const receiver=s.reveal.movements.find(m=>m.playerId==='h-l8');
 assert.deepEqual(s.reveal.ballPath,[winger.to,receiver.to]);
 assert.deepEqual(s.reveal.ballTo,receiver.to);
});

test('match transitions end exactly where the next frame starts, with the same player identities',()=>{
 for(const moment of matchMoments)for(const node of moment.nodes)for(const choice of node.choices){
  assert.ok(choice.ballPath?.length,`${node.id}/${choice.id}`);
  if(!choice.nextNodeId)continue;
  const next=moment.nodes.find(n=>n.id===choice.nextNodeId);
  assert.deepEqual(choice.ballTo,next.scene.ball,`${node.id}/${choice.id}: ball continuity`);
  for(const p of node.scene.players){
   const end=choice.movement.find(m=>m.playerId===p.id)?.to??p;
   const following=next.scene.players.find(other=>other.id===p.id);
   assert.deepEqual([end.x,end.y,p.label],[following.x,following.y,following.label],`${node.id}/${choice.id}/${p.id}`);
  }
 }
});

test('the opening tree never exceeds five decisions, and every goal ends inside the correct goal',()=>{
 const first=matchMoments[0];
 function walk(id,depth){assert.ok(depth<=5,`${id}: depth ${depth}`);for(const c of first.nodes.find(n=>n.id===id).choices)if(c.nextNodeId)walk(c.nextNodeId,depth+1);}
 walk(first.rootNodeId,1);
 for(const moment of matchMoments)for(const node of moment.nodes)for(const choice of node.choices){
  if(choice.outcome?.homeGoals)assert.ok(choice.ballTo.x>96&&choice.ballTo.y>=40&&choice.ballTo.y<=60);
  if(choice.outcome?.awayGoals)assert.ok(choice.ballTo.x<4&&choice.ballTo.y>=40&&choice.ballTo.y<=60);
 }
});

test('the goalkeeper passes without running to the recipient and all diagrams have a ball owner or explicit loose ball',()=>{
 const first=matchMoments[0].nodes[0];
 assert.equal(first.choices[0].movement.some(m=>m.playerId==='h-gk'),false);
 for(const course of courses.slice(3))for(const s of course.scenarios){
  if(s.id==='right-midfielder-5')continue;
  assert.ok(s.players.some(p=>p.x===s.ball.x&&p.y===s.ball.y),s.id);
 }
});
