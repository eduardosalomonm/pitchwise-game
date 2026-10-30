import assert from 'node:assert/strict';
import {test} from 'node:test';
import {matchMoments,createMatchRun,chooseMatchOption,continueMatch} from '../lib/match-day.ts';
import {getMatchArt,goalFeeling,visibleScore,hasPlayableMotion} from '../lib/match-presentation.ts';
import {courses} from '../lib/scenarios.ts';
import {generatedArt} from '../lib/generated-art.ts';
import {existsSync} from 'node:fs';
import sharp from 'sharp';

test('every match choice has an action illustration, and opposing goals never use our goal artwork',()=>{
 for(const moment of matchMoments)for(const node of moment.nodes)for(const choice of node.choices){
  assert.ok(getMatchArt(node,choice).src.endsWith('.webp'));
  if(choice.outcome?.awayGoals)assert.match(getMatchArt(node,choice).src,/match-rival-(goal|header)/);
  if(choice.outcome?.homeGoals)assert.match(getMatchArt(node,choice).src,/match-home-goal/);
 }
});
test('the celebration score previews the pending goal without awarding it twice',()=>{
 let run=createMatchRun();
 for(const id of ['right-cb','carry','half-turn','set-run']){
  run=continueMatch(chooseMatchOption(run,matchMoments[0].id,run.nodeId,id));
 }
 run=chooseMatchOption(run,matchMoments[0].id,run.nodeId,'bend-finish');
 assert.deepEqual(visibleScore(run),{home:0,away:0});
 assert.deepEqual(visibleScore(run,true),{home:1,away:0});
 assert.deepEqual(visibleScore(run,true),{home:1,away:0});
 assert.equal(run.homeScore,0);
 run=continueMatch(run);
 assert.deepEqual(visibleScore(run,true),{home:1,away:0});
});
test('goal copy distinguishes leads, equalisers, consolation goals, and conceded goals',()=>{
 assert.match(goalFeeling(1,0,true).detail,/lead/);
 assert.match(goalFeeling(1,1,true).detail,/level/);
 assert.match(goalFeeling(1,2,true).detail,/One back/);
 assert.equal(goalFeeling(0,1,false).title,'Rival XI score.');
});
test('replay is offered for actual player or ball movement only',()=>{
 const node=matchMoments[0].nodes[0];
 assert.equal(hasPlayableMotion(node,node.choices[0]),true);
 assert.equal(hasPlayableMotion(node,{...node.choices[0],movement:[],ballPath:[node.scene.ball]}),false);
});
test('all training situations have existing artwork and generated assets retain landscape dimensions',async()=>{
 for(const course of courses)for(const scenario of course.scenarios){
  assert.ok(scenario.illustration,scenario.id);
  assert.ok(existsSync(`public${scenario.illustration.src}`),scenario.id);
 }
 assert.ok(Object.keys(generatedArt).length>0);
 for(const id of Object.keys(generatedArt)){
  const metadata=await sharp(`public/illustrations/actions/${id}.webp`).metadata();
  // Optimised for display: 3:2 landscape, sharp at 2× (scripts/optimize-images.mjs).
  assert.ok(metadata.width>=768&&metadata.width<=960,id);assert.equal(metadata.width*2,metadata.height*3,id);
 }
});
