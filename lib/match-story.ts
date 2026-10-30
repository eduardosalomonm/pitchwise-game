import type { MatchMoment, MatchScene, DecisionNode } from './match-day';
import type { Point, Movement } from './scenarios';
import { authoredScene, move, type Placement } from './tactical-scene.ts';

type Frame = MatchScene & { ballOwnerId?:string };
function advanceFrame(frame:Frame, active:string, owner:string|Point, positions:Placement[]):Frame {
 const changes=new Map(positions.map(([id,x,y])=>[id,{x,y}]));
 const players=frame.players.map(player=>({...player,...changes.get(player.id),active:player.id===active}));
 const ball=typeof owner==='string'?players.find(player=>player.id===owner):owner;
 if(!ball)throw new Error('Invalid match ball owner');
 return {players,ball:{x:ball.x,y:ball.y},ballOwnerId:typeof owner==='string'?owner:undefined};
}
const frames:Record<string,Frame>={};
frames['m1-gk']=authoredScene('h-gk','h-gk',[
 ['h-rcb',24,68],['h-lcb',24,31],['h-six',40,52],['h-r8',54,65],['h-rb',39,88],['h-rw',63,83],['h-st',69,48],
 ['a-st',20,38],['a-rw',32,24],['a-lw',42,76],['a-l8',45,53],['a-lb',70,81],['a-lcb',75,60],['a-rcb',75,38],['a-rb',71,18],['a-six',58,50],
],35);
frames['m1-cb']=advanceFrame(frames['m1-gk'],'h-rcb','h-rcb',[]);
frames['m1-six']=advanceFrame(frames['m1-cb'],'h-six','h-six',[
 ['h-rcb',38,68],['h-six',45,55],['a-lw',41,68],['a-l8',49,52],['h-r8',58,66],['h-rw',66,83],
]);
frames['m1-combine']=advanceFrame(frames['m1-six'],'h-rw','h-rw',[
 ['h-six',47,57],['h-r8',62,65],['h-rw',68,79],['h-rb',63,92],['a-l8',53,57],['a-lb',72,78],['a-lcb',78,61],['h-st',73,48],
]);
frames['m1-striker']=advanceFrame(frames['m1-combine'],'h-st','h-rw',[
 ['h-rw',85,78],['h-r8',73,65],['h-st',78,49],['a-lb',78,80],['a-lcb',83,57],['a-rcb',83,40],['a-gk',92,57],
]);
frames['m1-defend-six']=advanceFrame(frames['m1-gk'],'h-six','a-l8',[
 ['a-l8',39,52],['h-six',35,55],['a-st',29,39],['h-lcb',24,34],['h-rcb',24,65],['h-gk',10,50],
]);
frames['m1-defend-cb']=advanceFrame(frames['m1-defend-six'],'h-rcb','a-l8',[
 ['a-l8',29,54],['h-six',35,59],['h-rcb',23,53],['h-lcb',22,30],['a-st',26,65],
]);
frames['m1-defend-gk']=advanceFrame(frames['m1-defend-cb'],'h-gk',{x:16,y:56},[
 ['h-gk',9,50],['h-rcb',28,54],['a-st',21,59],['a-l8',25,54],
]);
frames['m1-late-recovery']=advanceFrame(frames['m1-six'],'h-six','a-l8',[
 ['h-six',42,54],['a-l8',45,53],['h-rcb',35,65],['a-st',39,43],['h-lcb',31,37],
]);

frames['m2-winger']=authoredScene('h-lw','a-rw',[
 ['h-lw',46,17],['h-lb',31,28],['h-lcb',22,40],['h-rcb',22,60],['h-rb',26,77],['h-six',34,49],
 ['a-rw',37,29],['a-rb',41,10],['a-st',27,43],['a-lw',34,77],
],35);
frames['m2-lb']=advanceFrame(frames['m2-winger'],'h-lb','a-rw',[
 ['h-lw',34,15],['a-rb',29,11],['a-rw',34,30],['h-lb',29,29],
]);
frames['m2-cross']=advanceFrame(frames['m2-winger'],'h-lcb','a-rb',[
 ['a-rb',21,12],['h-lw',34,19],['h-lb',28,27],['h-lcb',19,40],['a-st',23,35],['h-gk',8,48],
]);

frames['m3-eight']=authoredScene('h-l8','h-l8',[
 ['h-l8',61,32],['h-lw',73,17],['h-st',80,50],['h-r8',67,64],['h-rw',72,88],['h-lb',53,12],
 ['a-rb',77,25],['a-rcb',83,39],['a-lcb',83,58],['a-lb',80,77],['a-six',69,48],['a-r8',66,39],
],70);
frames['m3-winger']=advanceFrame(frames['m3-eight'],'h-lw','h-lw',[
 ['h-l8',82,11],['a-rb',81,19],['a-r8',72,30],
]);
frames['m3-finish']=advanceFrame(frames['m3-winger'],'h-r8','h-lw',[
 ['h-lw',85,30],['h-r8',73,61],['h-st',85,48],['a-rcb',87,37],['a-lcb',87,55],['a-six',80,49],['a-gk',92,43],
]);

frames['m4-six']=authoredScene('h-six','a-six',[
 ['h-six',51,50],['a-six',59,49],['h-lcb',37,36],['h-rcb',37,65],['h-lb',73,13],['h-rb',73,88],
 ['a-st',43,51],['a-lw',51,78],['a-rw',51,23],['h-gk',15,50],
],45);
frames['m4-cb']=advanceFrame(frames['m4-six'],'h-rcb','a-six',[
 ['h-six',46,52],['a-six',50,52],['a-lw',43,72],['a-rw',44,24],['h-rcb',35,64],['h-lcb',35,36],
]);
frames['m4-gk']=advanceFrame(frames['m4-cb'],'h-gk',{x:29,y:66},[
 ['h-gk',17,52],['a-lw',36,70],['h-rcb',40,63],['h-lcb',35,37],
]);

frames['m5-ten']=authoredScene('h-r8','h-r8',[
 ['h-r8',63,63],['h-st',76,51],['h-rw',78,87],['h-lw',74,13],['h-l8',59,34],
 ['a-lcb',80,59],['a-rcb',81,40],['a-lb',81,77],['a-rb',81,20],['a-six',61,52],['a-gk',92,50],
],68);
frames['m5-striker']=advanceFrame(frames['m5-ten'],'h-st','h-st',[
 ['h-st',70,51],['a-lcb',75,52],['h-r8',73,66],['a-lb',80,80],
]);
frames['m5-finish']=advanceFrame(frames['m5-striker'],'h-r8','h-r8',[
 ['h-r8',87,68],['h-rw',84,88],['h-lw',84,26],['a-lcb',80,54],['a-rcb',84,43],['a-rb',79,21],['a-lb',83,82],['a-gk',91,61],
]);

type Action = { moves?:Movement[]; ball?:Point[]; text?:string; label?:string };
const p=(x:number,y:number):Point=>({x,y});
const actions:Record<string,Action>={
 'm1-gk/right-cb':{ball:[p(24,68)]},
 'm1-gk/force-six':{ball:[p(40,52),p(39,52)]},
 'm1-gk/go-long':{moves:[move('h-st',71,48),move('a-rcb',73,45)],ball:[p(71,48),p(73,45)]},
 'm1-cb/carry':{ball:[p(38,68),p(45,55)],text:'The centre-back carries until the winger commits, then passes inside to the six.'},
 'm1-cb/early-wide':{ball:[p(39,88),p(24,68)]},
 'm1-cb/square':{ball:[p(21,40),p(47,18)],moves:[move('a-st',21,40),move('h-lcb',21,35)]},
 'm1-six/half-turn':{ball:[p(58,66),p(68,79)],text:'The six sets the right eight with one touch. The eight releases the winger outside the press.'},
 'm1-six/turn':{ball:[p(45,53)],text:'Their midfielder tackles our six as they turn. Rival XI now have the ball in the centre; our six must recover.'},
 'm1-six/back':{ball:[p(38,68)]},
 'm1-combine/set-run':{ball:[p(62,65),p(85,78)],text:'The winger sets the eight, then curves behind the full-back to receive the return pass.'},
 'm1-combine/dribble':{moves:[move('h-rw',73,67),move('a-lb',75,71),move('a-lcb',77,64)],ball:[p(73,67)]},
 'm1-combine/stay-wide':{moves:[move('a-lb',70,79)],ball:[p(70,79)]},
 'm1-striker/bend-finish':{moves:[{...move('h-st',88,53),via:[p(80,46),p(84,48)]}],ball:[p(88,53),p(97,43)]},
 'm1-striker/near':{moves:[move('h-st',86,64),move('a-lcb',86,61)],ball:[p(86,64),p(86,61)]},
 'm1-striker/hold':{ball:[p(81,61),p(68,54)],moves:[move('a-lcb',81,61)]},
 'm1-defend-six/delay':{moves:[move('h-six',30,51),move('a-l8',34,55),move('h-rcb',24,59)],ball:[p(34,55)]},
 'm1-defend-six/dive':{ball:[p(29,54)]},
 'm1-defend-six/chase-ball':{ball:[p(29,54)]},
 'm1-defend-cb/delay-cover':{moves:[move('h-rcb',19,56),move('a-l8',25,63),move('h-six',28,52)],ball:[p(25,63)]},
 'm1-defend-cb/step':{ball:[p(21,59),p(16,56)]},
 'm1-defend-gk/sweep':{moves:[move('h-gk',15,55),move('a-st',19,57)],ball:[p(15,55)]},
 'm1-defend-gk/hold-line':{moves:[move('a-st',15,56)],ball:[p(15,56),p(3,44)]},
 'm1-late-recovery/delay':{moves:[move('h-six',38,51),move('a-l8',40,57),move('h-rcb',31,62)],ball:[p(40,57)]},
 'm1-late-recovery/dive':{moves:[move('h-six',46,56),move('a-st',17,45),move('h-gk',12,49)],ball:[p(39,43),p(17,45),p(3,45)]},
 'm2-winger/track':{ball:[p(34,30)]},
 'm2-winger/ball':{ball:[p(21,12)]},
 'm2-winger/stay':{ball:[p(21,12)]},
 'm2-lb/inside':{moves:[move('h-lb',28,34),move('a-rw',32,33)],ball:[p(28,34)],text:'The left-back protects the inside pass and intercepts it while the winger tracks the overlap.'},
 'm2-lb/follow':{ball:[p(21,12)]},
 'm2-cross/front':{moves:[move('h-lcb',16,37),move('a-st',19,35)],ball:[p(16,37),p(37,17)]},
 'm2-cross/watch':{moves:[move('a-st',15,36)],ball:[p(15,36),p(3,43)]},
 'm3-eight/winger':{ball:[p(73,17)]},
 'm3-eight/carry':{moves:[move('h-l8',66,43),move('a-r8',66,44),move('a-six',68,45)],ball:[p(66,43),p(66,44)]},
 'm3-eight/switch':{ball:[p(72,88)],moves:[move('a-lb',78,83)]},
 'm3-winger/inside':{ball:[p(85,30)],label:'Drive inside and look for the cut-back',text:'The winger carries into the gap. The far eight now decides when to arrive for the cut-back.'},
 'm3-winger/overlap-pass':{ball:[p(82,11),p(81,19)]},
 'm3-finish/arrive':{moves:[move('h-r8',80,58)],ball:[p(80,58),p(97,57)]},
 'm3-finish/early':{moves:[move('h-r8',85,58),move('a-lcb',86,58)],ball:[p(85,58),p(86,58)]},
 'm4-six/delay':{ball:[p(50,52)]},
 'm4-six/tackle':{ball:[p(53,53),p(36,70),p(29,66)]},
 'm4-six/retreat':{ball:[p(36,70),p(29,66)]},
 'm4-cb/drop':{moves:[move('h-rcb',29,63),move('h-lcb',30,38),move('h-six',39,52),move('a-six',45,64)],ball:[p(45,64)],text:'The centre-back drops inside. Rival XI are forced wide, and our midfield recovers.'},
 'm4-cb/step':{ball:[p(36,70),p(29,66)]},
 'm4-gk/sweep':{moves:[move('h-gk',28,64),move('a-lw',32,68)],ball:[p(28,64),p(50,87)]},
 'm4-gk/line':{moves:[move('h-gk',8,50),move('a-lw',20,60)],ball:[p(20,60),p(3,43)]},
 'm5-ten/feet':{ball:[p(70,51)]},
 'm5-ten/through':{moves:[move('a-lcb',78,58)],ball:[p(79,60)],label:'Play through the centre for the striker',text:'The centre-back reads the premature pass and intercepts before the striker can turn.'},
 'm5-ten/switch':{ball:[p(78,87)],moves:[move('a-lb',81,84)]},
 'm5-striker/set':{ball:[p(87,68)],text:'The one-touch layoff releases the right eight into the box before the gap closes.'},
 'm5-striker/turn':{moves:[move('h-st',73,53),move('a-lcb',74,53)],ball:[p(73,53),p(74,53)]},
 'm5-finish/square':{moves:[move('h-lw',90,39),move('a-gk',92,59)],ball:[p(90,39),p(97,44)],text:'Our right eight passes across the goalkeeper. The left winger meets it at the far post and finishes first time.'},
 'm5-finish/shoot':{ball:[p(92,61),p(85,57)],moves:[move('a-gk',92,61)]},
};

export function reviewMatchMoments(moments:MatchMoment[]):MatchMoment[] {
 const first=moments[0];
 first.nodes.find(node=>node.id==='m1-six')!.choices.find(choice=>choice.id==='turn')!.nextNodeId='m1-late-recovery';
 const late:DecisionNode={...first.nodes.find(node=>node.id==='m1-defend-six')!,id:'m1-late-recovery',context:'The six loses the ball after the press is broken. The striker is about to run between our split centre-backs.',prompt:'Can the six stop the break at its source?',choices:[
  {id:'delay',label:'Recover inside toward the passing lane',feedback:'The six closes the striker’s lane and forces the carrier sideways.',movement:[],outcome:{id:'m1-late-stop',homeGoals:0,awayGoals:0,possession:'away',tone:'positive',headline:'The counter is contained.',recap:'An inside recovery prevents the central through ball.'}},
  {id:'dive',label:'Step across the carrier to tackle',feedback:'The carrier evades the tackle and releases the striker through the split defence.',movement:[],outcome:{id:'m1-late-goal',homeGoals:0,awayGoals:1,possession:'home',tone:'negative',headline:'Rival XI score.',recap:'The failed tackle leaves a direct pass through our split centre-backs.'}},
 ]};
 first.nodes.push(late);
 return moments.map(moment=>({...moment,nodes:moment.nodes.map(node=>{
  const frame=frames[node.id]; if(!frame)throw new Error(`Missing match scene ${node.id}`);
  const actor=frame.players.find(player=>player.active)!;
  return {...node,scene:frame,actor:actor.role,actorLabel:actor.label,
   context:node.id==='m1-defend-cb'?'The carrier and the outside runner attack our right centre-back. The other centre-back is too far across to help immediately.':node.id==='m3-finish'?'The winger reaches the byline and looks up. The far eight is still outside the box as defenders retreat toward goal.':node.id==='m5-ten'?'Our right eight receives between the lines. The striker checks short and both wingers hold their width.':node.id==='m5-striker'?'The centre-back follows the striker away from goal. Our right eight continues the run beyond.':node.id==='m5-finish'?'Our right eight enters the right side of the box. The goalkeeper closes the near post while the left winger arrives free at the far post.':node.context,
   choices:node.choices.map(choice=>{
    const action=actions[`${node.id}/${choice.id}`]; if(!action)throw new Error(`Missing action ${node.id}/${choice.id}`);
    const next=choice.nextNodeId?frames[choice.nextNodeId]:undefined;
    const movement=next?frame.players.flatMap(player=>{const target=next.players.find(other=>other.id===player.id)!;return target.x!==player.x||target.y!==player.y?[move(player.id,target.x,target.y,'')]:[];}):action.moves??[];
    const ballPath=action.ball??[];
    const result={...choice,label:action.label??choice.label,feedback:action.text??choice.feedback,movement,ballPath,ballTo:ballPath.at(-1)};
    if(node.id==='m5-ten'&&choice.id==='through')result.outcome={...choice.outcome!,headline:'Pass intercepted.',recap:'The central lane closes before the striker can turn.',id:'m5-intercepted'};
    if(node.id==='m4-cb'&&choice.id==='drop')result.outcome={...choice.outcome!,possession:'away',recap:'Delay and cover force the carrier wide. Rival XI keep the ball, but the counter is over.'};
    if(node.id==='m5-finish'&&choice.id==='square')result.outcome={...choice.outcome!,headline:'GOAL — the extra pass pays off!'};
    return result;
   })};
 })}));
}
