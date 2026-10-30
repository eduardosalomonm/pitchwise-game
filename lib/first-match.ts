import { easyLeaguePlays } from './league-easy-plays.ts';
import { balanceChoiceOrder } from './match-choice-order.ts';

// Reuse audited movement/contact routes. The friendly is separate from saved competitions.
const sources = ['lg2-e-six-side-door', 'lg2-e-keeper-low-hold-outlet'];
const contexts = [
  [
    'An opponent is closing you down. Our right midfielder is free beside the pressure.',
    'You face goal with the ball. Their defender is moving wide, leaving space inside.',
  ],
  [
    'Their midfielder has room for a low shot from outside the box. You have a clear view.',
    'You have caught the shot. Their striker is near our right defender; our left-back is free.',
  ],
];
const friendlyCopy = [
  [
    [
      [
        'Pass to the right midfielder',
        'Your pass beats the pressure. Our right midfielder can now face goal.',
      ],
      ['Pass back', 'We keep possession.'],
      [
        'Dribble through the middle',
        'The opponent takes your next touch. Eastgate have the ball.',
      ],
    ],
    [
      [
        'Take a touch inside and shoot',
        'You move inside the defender and finish across the keeper.',
      ],
      [
        'Pass to the right winger',
        'We keep the ball, but their defence closes the chance to shoot.',
      ],
      [
        'Shoot immediately',
        'The defender blocks your shot and Eastgate recover the ball.',
      ],
    ],
  ],
  [
    [
      [
        'Get low and catch the shot',
        'You hold the shot. The ball is ours again.',
      ],
      [
        'Push the shot wide',
        'You keep the shot out. Their winger collects the ball on the side.',
      ],
      ['Stay upright', 'The low shot goes underneath you and into the goal.'],
    ],
    [
      [
        'Roll to the left-back',
        'Our left-back receives safely. We can build another attack.',
      ],
      [
        'Kick long into midfield',
        'Their midfielder collects your kick. The immediate danger is over.',
      ],
      [
        'Roll to the right centre-back',
        'Their striker intercepts the pass and scores before you can reset.',
      ],
    ],
  ],
];
export const firstMatchMoments = balanceChoiceOrder(
  sources.map((id, index) => {
    const source = easyLeaguePlays.find(
      ({ moment }) => moment.id === id,
    )!.moment;
    return {
      ...source,
      minute: index === 0 ? 18 : 72,
      name: index === 0 ? 'Find your teammate' : 'Keep them out',
      nodes: source.nodes.map((node, step) => ({
        ...node,
        context: contexts[index][step],
        scene: {
          ...node.scene,
          players: node.scene.players.map((player) =>
            player.active && index === 0
              ? { ...player, facing: { x: 100, y: player.y } }
              : player,
          ),
        },
        // Start with two actions; introduce three once the interaction is familiar.
        choices: (index === 0 && step === 0
          ? node.choices.filter((choice) => choice.tone !== 'neutral')
          : node.choices
        ).map((choice) => {
          const copy = friendlyCopy[index][step][node.choices.indexOf(choice)];
          return { ...choice, label: copy[0], feedback: copy[1] };
        }),
        choiceOrder: undefined,
      })),
    };
  }),
  'first-friendly',
);
