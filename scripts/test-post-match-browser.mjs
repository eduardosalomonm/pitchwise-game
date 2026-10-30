import assert from 'node:assert/strict';
import { isolateGameTelemetry, previewOrigin } from './browser-test-support.mjs';
import { createLeague, activeLeagueGame, serializeLeague, finishLeagueGame, leagueTable, LEAGUE_KEY, LEAGUE_MATCH_KEY } from '../lib/league.ts';
import { leagueFixture } from '../lib/league-matches.ts';
import { serializeLeagueMatch } from '../lib/league-match-progress.ts';
import { createMatchRun, chooseMatchOption, continueMatch } from '../lib/match-day.ts';
import { matchChoiceTone } from '../lib/match-feedback.ts';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = previewOrigin();
for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await launcher.launch();
  try {
    for (const width of [320, 375, 1280]) {
      const page = await browser.newPage({viewport:{width,height:667},reducedMotion:'reduce'});
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await isolateGameTelemetry(page);
      const league=createLeague(501,{name:'Mobile FC',kitId:'forest',size:4,legs:1,difficulty:'easy'});
      const game=activeLeagueGame(league), fixture=leagueFixture(league);
      let run=createMatchRun(fixture.moments);
      while(run.status!=='final') {
        const moment=fixture.moments[run.momentIndex],node=moment.nodes.find(n=>n.id===run.nodeId);
        const choice=node.choices.find(c=>matchChoiceTone(node,c)==='positive')??node.choices[0];
        run=chooseMatchOption(run,moment.id,node.id,choice.id,fixture.moments);
        if(continueMatch(run,fixture.moments).status==='final')break;
        run=continueMatch(run,fixture.moments);
      }
      await page.goto(origin);
      await page.evaluate(([lk,lv,mk,mv])=>{localStorage.setItem(lk,lv);localStorage.setItem(mk,mv);},[LEAGUE_KEY,serializeLeague(league),LEAGUE_MATCH_KEY,serializeLeagueMatch(league.seed,game.id,run)]);
      await page.goto(origin+'/#league');
      await page.getByRole('button',{name:'Continue match',exact:true}).click();
      await page.locator('.match-consequence button').click();
      await page.locator('.league-recap').waitFor();
      await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
      const after=finishLeagueGame(league,game.id,run.homeScore,run.awayScore);
      const row=leagueTable(after).find(r=>r.team==='Mobile FC');
      assert.equal(await page.locator('.recap-stats dd').nth(1).innerText(),String(row.points));
      assert.equal(await page.evaluate(()=>localStorage.getItem('pitchwise-league-v1')),serializeLeague(after));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const next=page.getByRole('button',{name:'Play next match',exact:true});
      const box=await next.boundingBox();
      assert.ok(box.height>=44);
      if(width===375)assert.ok(box.y+box.height<667,'next match fits the first mobile screen');
      await page.screenshot({path:`/private/tmp/pw45-result-${engine}-${width}.png`,fullPage:true});
      if(width===320){
        await page.getByRole('button',{name:'View full league',exact:true}).click();
        await page.locator('.league-standings').waitFor();
        assert.equal(await page.locator('.league-calendar').getAttribute('open'),'');
        assert.equal(await page.evaluate(()=>localStorage.getItem('pitchwise-league-v1')),serializeLeague(after));
      }else{
        await next.click();
        await page.locator('.match-choice-list').waitFor();
        assert.equal(await page.evaluate(()=>localStorage.getItem('pitchwise-league-v1')),serializeLeague(after));
      }
      assert.deepEqual(errors,[]); await page.close();
    }
  }finally{await browser.close();}
}
console.log('PASS: compact results, current league summary, direct next fixture and full overview in Chromium and WebKit.');
