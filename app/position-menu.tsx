import { ArrowRight, Star } from 'lucide-react';

import { courses, type CourseId } from '@/lib/scenarios';
import type { CourseProgress } from '@/lib/course-progress';

export function Stars({ count, large = false }: { count: number; large?: boolean }) {
  return <span className={`position-stars ${large ? 'has-course-star' : ''}`} aria-label={`${count} of 5 correct answers`}>{[0,1,2,3,4].map((index) => <Star key={index} aria-hidden="true" className={index < count ? 'is-earned' : ''} />)}{large && <Star aria-hidden="true" className="course-star is-earned" />}</span>;
}

export function PositionMenu({ onSelect, progress }: { onSelect: (courseId: CourseId) => void; progress: CourseProgress }) {
  const roles: { label: string; name: string; x: number; y: number; course: CourseId }[] = [
    { label:'9',name:'Striker',x:50,y:12,course:'striker' },
    { label:'LW',name:'Left winger',x:17,y:24,course:'left-winger' }, { label:'RW',name:'Right winger',x:83,y:24,course:'right-winger' },
    { label:'8',name:'Left midfielder',x:31,y:41,course:'left-midfielder' }, { label:'8',name:'Right midfielder',x:69,y:41,course:'right-midfielder' },
    { label:'6',name:'Defensive midfielder',x:50,y:56,course:'defensive-midfielder' },
    { label:'LB',name:'Left-back',x:14,y:69,course:'full-back' }, { label:'RB',name:'Right-back',x:86,y:69,course:'right-back' },
    { label:'CB',name:'Left centre-back',x:37,y:81,course:'centre-back' }, { label:'CB',name:'Right centre-back',x:67,y:81,course:'right-centre-back' },
    { label:'GK',name:'Goalkeeper',x:50,y:94,course:'goalkeeper' },
  ];
  return <div className="position-menu">
    <div className="position-map" aria-label="Choose a position on the pitch">
      <svg viewBox="0 0 400 540" preserveAspectRatio="none" aria-hidden="true"><rect x="14" y="14" width="372" height="512" rx="2" /><line x1="14" y1="270" x2="386" y2="270" /><circle cx="200" cy="270" r="52" /><rect x="105" y="14" width="190" height="82" /><rect x="105" y="444" width="190" height="82" /><rect x="154" y="14" width="92" height="33" /><rect x="154" y="493" width="92" height="33" /><path d="M178 14V3H222V14M178 526V537H222V526" strokeWidth="3" /><path d="M189 3V14M200 3V14M211 3V14M178 8H222M189 526V537M200 526V537M211 526V537M178 532H222" strokeWidth="1" /></svg>
      <span className="map-direction">Attack ↑</span>
      {roles.map((role) => { const count = Math.min(5, progress[role.course]?.length ?? 0); return <button key={role.name} type="button" className={`map-position is-available ${count === 5 ? 'is-course-complete' : ''}`} style={{ left: `${role.x}%`, top: `${role.y}%` }} onClick={() => onSelect(role.course)} aria-label={`Start ${role.name} course. ${count} of 5 correct answers.`}><strong>{role.label}</strong><Stars count={count} large={count === 5} /></button>; })}
    </div>
    <div className="position-menu-copy"><p className="eyebrow">The whole XI</p><h2>Pick your position.</h2><p>Every position is playable. Each correct answer earns one star; five correct answers unlock the position star.</p><div className="course-list">{courses.map((course) => { const count=Math.min(5,progress[course.id]?.length ?? 0); return <button key={course.id} type="button" onClick={() => onSelect(course.id)}><span><strong>{course.position}</strong><small>{count}/5 correct · {course.scenarios.filter((s) => s.mode === 'Attacking').length} attacking · {course.scenarios.filter((s) => s.mode === 'Defending').length} defending</small></span><Stars count={count} large={count===5}/><ArrowRight aria-hidden="true" /></button>; })}</div><p className="map-key"><span>☆ Correct-answer star</span><span>★ Five correct</span></p></div>
  </div>;
}
