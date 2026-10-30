import type { MatchMoment } from './match-day.ts';

type ChoiceCopy = { label?: string; feedback?: string };
type NodeCopy = {
  context?: string;
  prompt?: string;
  choices?: Record<string, ChoiceCopy>;
};

// These cues describe the existing scenes. Keep the original graphs, movements,
// scores and IDs: a returning player should recognise the same match and record.
const copy: Record<string, NodeCopy> = {
  'm1-gk': {
    context:
      'Their striker curves toward our left centre-back. Their midfielder stays close to our six.',
    choices: {
      'right-cb': {
        feedback:
          'The pass reaches our right centre-back beyond the striker’s pressing run.',
      },
      'force-six': {
        feedback:
          'Their midfielder steps across our six and intercepts. They now carry toward our goal.',
      },
    },
  },
  'm1-cb': {
    context:
      'You receive facing upfield. Their winger waits ahead; our right-back holds the touchline.',
    prompt: 'How do you use the next touch?',
    choices: {
      carry: {
        label: 'Carry toward their winger',
        feedback:
          'Your carry draws the winger. You then pass inside to our six.',
      },
      'early-wide': {
        label: 'Pass outside to our right-back',
        feedback:
          'Our right-back receives facing the touchline and returns the ball. We keep possession; the press resets.',
      },
      square: {
        feedback:
          'Their striker reaches the square pass. Our defender clears hurriedly, and they collect upfield.',
      },
    },
  },
  'm1-six': {
    context:
      'You receive with your back to goal and a midfielder close behind. Our right eight offers a pass to your right.',
    prompt: 'What is your first action on the pass?',
    choices: {
      'half-turn': { label: 'Set the ball across to the eight' },
      turn: { label: 'Take a touch and turn upfield' },
      back: {
        feedback:
          'The return reaches our centre-back, but their winger recovers. We keep the ball without breaking the press.',
      },
    },
  },
  'm1-combine': {
    context:
      'You receive short with the full-back ahead of you. Our eight supports inside; our right-back holds the outside lane.',
    choices: {
      'set-run': { label: 'Set the eight and run beyond' },
      dribble: {
        label: 'Take the ball inside yourself',
        feedback:
          'You carry into the covering centre-back’s lane. Our team retains the ball, but the route into the box closes.',
      },
      'stay-wide': {
        label: 'Hold the ball by the touchline',
        feedback:
          'The full-back closes while you wait and takes the ball by the line.',
      },
    },
  },
  'm1-striker': {
    context:
      'The winger has the ball on the right of the box. You are still onside; the near centre-back watches the ball and the keeper moves toward that side.',
    choices: {
      'bend-finish': {
        label: 'Curve across and finish across goal',
        feedback:
          'Your curved run separates from the defender. You meet the pass first time and finish into the far corner.',
      },
      hold: {
        feedback:
          'The delivery passes your waiting position. Their centre-back reaches it and clears into midfield.',
      },
      'alt-1': { label: 'Check short to the edge of the box' },
    },
  },
  'm1-defend-six': {
    context:
      'Their midfielder has intercepted our pass into the six. You are beside the carrier; our centre-backs are retreating behind you.',
    choices: {
      delay: {
        label: 'Recover across the central pass',
        feedback:
          'You block the striker’s lane. The carrier moves sideways while our centre-backs regain their shape.',
      },
    },
  },
  'm1-defend-cb': {
    context:
      'Their midfielder has passed our six. You face the carrier and an outside runner, with the other centre-back too far across to cover both.',
  },
  'm1-late-recovery': {
    context:
      'Their midfielder has taken your turning touch. Their striker starts between our separated centre-backs; you are still beside the carrier.',
  },
  'm2-winger': {
    context:
      'Their right winger carries inside at our left-back. Their right-back starts an overlapping run outside, along the near touchline.',
  },
  'm2-lb': {
    context:
      'Our winger now tracks the overlap. Their ball carrier turns inward toward the striker, leaving you to defend the inside lane.',
    choices: {
      inside: { label: 'Move across the pass to the striker' },
      follow: { label: 'Move out with the overlapping runner' },
    },
  },
  'm2-cross': {
    context:
      'Their right-back reaches crossing space. You are goal-side of the striker, who begins a run across your near shoulder.',
    choices: {
      front: {
        label: 'Move across the striker’s run',
        feedback:
          'You reach the delivery before the striker and clear up the left channel.',
      },
      watch: { label: 'Hold your spot and follow the ball' },
    },
  },
  'm3-eight': {
    context:
      'You receive facing their midfield. The near defender blocks the central carry; our left winger is outside the full-back.',
    choices: {
      winger: {
        feedback:
          'The winger receives wide. Your run beyond them draws the full-back toward the line.',
      },
      carry: {
        feedback:
          'Their midfielder meets your carry through the centre and wins the ball.',
      },
    },
  },
  'm3-winger': {
    context:
      'You face the full-back. Our eight’s outside run draws them toward the line; their centre-backs stay with the striker.',
    choices: {
      inside: { label: 'Take the ball inside the full-back' },
      'overlap-pass': {
        label: 'Pass outside into the eight’s run',
        feedback:
          'The full-back follows the outside run and intercepts the return. They take possession by the line.',
      },
    },
  },
  'm3-finish': {
    context:
      'The winger looks back from the byline. You are outside the box, facing goal; their defenders retreat with our striker.',
    choices: {
      arrive: { label: 'Follow the cut-back into the box' },
      early: {
        label: 'Move early and wait inside the box',
        feedback:
          'The centre-back picks up your early arrival and blocks the finish.',
      },
    },
  },
  'm4-six': {
    context:
      'Their six has won the ball while both our full-backs are high. The striker is ahead of you and their wingers start on either side.',
    choices: {
      delay: {
        label: 'Angle back across the striker’s lane',
        feedback:
          'The striker’s lane stays covered. Their carrier slows, giving our centre-backs time to drop together.',
      },
    },
  },
  'm4-cb': {
    choices: {
      drop: { label: 'Drop inside the outside runner' },
      step: { label: 'Leave the runner and close the carrier' },
    },
  },
  'm5-ten': {
    context:
      'You receive facing goal between the lines. Our striker checks toward you; the centre-back begins to follow and both wingers stay wide.',
    choices: {
      feet: { label: 'Pass to the striker and run beyond' },
      through: { label: 'Pass directly through the centre' },
      switch: { label: 'Take a touch and pass to the winger' },
    },
  },
  'm5-striker': {
    context:
      'You receive with your back to goal and the centre-back behind you. Our right eight continues past your right shoulder.',
    choices: {
      set: { label: 'Set the ball into the eight’s run' },
      turn: { label: 'Take a touch and turn the defender' },
    },
  },
  'm5-finish': {
    context:
      'You enter the right side of the box facing goal. The keeper closes your angle; our left winger arrives beyond the far centre-back.',
    choices: {
      square: { label: 'Pass across to the arriving winger' },
      shoot: { label: 'Shoot low from your current angle' },
    },
  },
  'block-switch-finish': {
    context:
      'You receive facing the recovering full-back. They approach from inside; our striker stays between the centre-backs.',
    choices: {
      read: { label: 'Carry outside and pull the ball back' },
      rush: { label: 'Hold the ball and wait for support' },
    },
  },
  'block-rebound-start': {
    context:
      'Their eight controls the clearance facing our goal. You are goal-side of the receiver, with their striker behind you.',
    choices: {
      build: { label: 'Stay between the receiver and goal' },
      force: { label: 'Move past the receiver toward halfway' },
    },
  },
  'block-rebound-finish': {
    context:
      'Their lofted delivery drops toward the striker. You are close enough to meet it from the goal side; our right-back is outside the box.',
    choices: {
      read: { label: 'Meet the cross across the striker' },
      rush: { label: 'Hold your position below the ball' },
    },
  },
  'block-underlap-start': {
    choices: {
      build: { label: 'Pass into the left-back’s inside run' },
      force: { label: 'Pass centrally into the striker’s run' },
    },
  },
  'block-underlap-finish': {
    context:
      'You receive in stride inside the full-back. The keeper guards the near post while our striker arrives between the centre-backs.',
    choices: {
      read: {
        label: 'Pass inside to the arriving striker',
        feedback:
          'The pass travels inside the first defender. Our striker meets it centrally and finishes first time.',
      },
    },
  },
  'block-cross-finish': {
    choices: {
      rush: {
        feedback:
          'You stop below the dropping cross. Their far winger reaches it first and heads into the exposed goal.',
      },
    },
  },
  'block-rebound-goal-start': {
    context:
      'Their keeper has spilled low shots. You face goal outside the box with a shooting lane. Our striker is onside beside the nearer centre-back.',
    choices: { build: { label: 'Shoot low toward the far corner' } },
  },
  'block-rebound-goal-finish': {
    context:
      'The keeper’s parry spills into your run. The keeper is still on the ground and a centre-back is recovering from your right.',
    choices: { read: { label: 'Meet the rebound with your next touch' } },
  },
  'direct-duel-finish': {
    context:
      'The header drops to you as their midfielder closes from behind. You are facing the incoming ball; our right-back offers a pass outside.',
    choices: { read: { label: 'Set the dropping ball to the right-back' } },
  },
  'direct-outlet-finish': {
    context:
      'You receive running toward their box. The striker is onside between the retreating centre-backs, while their full-back chases from outside.',
    choices: {
      read: { label: 'Pass across into the striker’s run' },
      rush: { label: 'Carry at the recovering full-back' },
    },
  },
  'direct-press-finish': {
    context:
      'You win the pass facing goal. Their near centre-back steps toward you while our striker starts beyond their shoulder.',
    choices: { read: { label: 'Release the striker with the next touch' } },
  },
  'direct-layoff-start': {
    context:
      'You receive with your back to goal and a centre-back tight behind. Our right eight approaches the ball facing upfield.',
    choices: { build: { label: 'Set the ball across to our eight' } },
  },
  'direct-layoff-finish': {
    choices: {
      read: { label: 'Pass into the winger’s first run' },
      rush: { label: 'Carry forward before releasing the winger' },
    },
  },
  'advanced-touchline-3': {
    context:
      'You receive short with your back to goal as the full-back approaches. Our left-back continues outside, still onside.',
    choices: { 'option-1': { label: 'Set the ball outside to our left-back' } },
  },
  'advanced-touchline-4': {
    choices: {
      'option-1': {
        label: 'Pass inside to the arriving eight',
        feedback:
          'The eight meets your pass between the retreating defenders and scores first time into the far corner.',
      },
    },
  },
  'advanced-press-trigger-4': {
    context:
      'You intercept facing goal. The near centre-back steps out; our striker starts onside, inside the deeper defender.',
    choices: {
      'option-1': { label: 'Pass diagonally into the striker’s run' },
    },
  },
  'advanced-third-runner-2': {
    context:
      'You receive with your back to goal and their eight tight behind. Our six faces upfield inside you; our winger stays wide.',
  },
  'advanced-third-runner-4': {
    context:
      'You receive short while their full-back approaches from inside. Our eight runs through the channel, still onside.',
    choices: { 'option-1': { label: 'Set the ball into the eight’s run' } },
  },
  'advanced-switch-twice-2': {
    context:
      'You face the left half of the pitch. Their far eight moves toward our left-back; our left centre-back is behind that pressing line.',
  },
  'advanced-switch-twice-5': {
    context:
      'You receive in stride inside their full-back. The near centre-back turns toward you; our striker is behind the ball between defenders.',
  },
  'advanced-cutback-chain-4': {
    context:
      'Our full-back’s block reaches your inside foot. Their winger turns to close from behind; our right winger offers an outlet up the line.',
    choices: { 'option-1': { label: 'Take the ball across toward the line' } },
  },
  'advanced-diagonal-run-4': {
    context:
      'The header reaches you facing back toward our defence. Their eight closes from behind; our left eight is available to your left.',
  },
  'advanced-end-to-end-2': {
    context:
      'You receive our keeper’s pass with your back to goal and a centre-back behind you. Our left eight arrives facing upfield.',
  },
  'advanced-end-to-end-5': {
    context:
      'You receive in stride on the right of the box. The keeper is still moving across; their full-back stands in the square passing lane.',
  },
};

export function polishOriginalMoments(
  fixtureId: string,
  moments: MatchMoment[],
): MatchMoment[] {
  if (
    ![
      'original',
      'low-block',
      'second-ball',
      'high-pressure',
      'changing-picture',
    ].includes(fixtureId)
  )
    return moments;
  return moments.map((moment) => ({
    ...moment,
    nodes: moment.nodes.map((node) => {
      const patch = copy[node.id];
      if (!patch) return node;
      return {
        ...node,
        context: patch.context ?? node.context,
        prompt: patch.prompt ?? node.prompt,
        choices: node.choices.map((choice) => {
          const change = patch.choices?.[choice.id];
          if (!change) return choice;
          return {
            ...choice,
            ...change,
            ...(choice.outcome && change.feedback
              ? { outcome: { ...choice.outcome, recap: change.feedback } }
              : {}),
          };
        }),
      };
    }),
  }));
}
