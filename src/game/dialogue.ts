import type {
  CardIndex,
  DealerMood,
  DialogButton,
  SceneContext,
  SceneOutcome,
  Stakes,
  TrollScript,
} from './types';

const CARD_INDICES: CardIndex[] = [0, 1, 2];
const MAX_RECENT_SCRIPTS = 3;

export type RandomSource = () => number;

type SceneDefinition = {
  id: TrollScript;
  cooldown: number;
  getWeight: (context: SceneContext) => number;
  canRun?: (context: SceneContext) => boolean;
  create: (context: SceneContext, random: RandomSource) => SceneOutcome;
};

function createDialogButton(id: string, label: string, action: DialogButton['action']): DialogButton {
  return { id, label, action };
}

export function randomFrom<T>(items: readonly T[], random: RandomSource = Math.random): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function randomCardIndex(
  excluded: CardIndex[] = [],
  random: RandomSource = Math.random,
): CardIndex {
  const available = CARD_INDICES.filter((index) => !excluded.includes(index));
  return available[Math.floor(random() * available.length)] ?? 0;
}

export function deriveDealerMood(coins: number, streak: number): DealerMood {
  if (coins <= 2 || streak <= -2) {
    return 'predatory';
  }

  if (coins >= 15 || streak >= 2) {
    return 'chaotic';
  }

  return 'smug';
}

export function appendRecentScript(
  recentScripts: TrollScript[],
  script: TrollScript,
  limit = MAX_RECENT_SCRIPTS,
): TrollScript[] {
  return [...recentScripts, script].slice(-limit);
}

export function buildIdleMessage(
  coins: number,
  dealerMood: DealerMood,
  repeatedPickStreak: number,
  random: RandomSource = Math.random,
): string {
  const lines = [
    'Выбирай карту. Любую. Я обещаю, что не буду мухлевать. Почти.',
    'Средняя выглядит сочно. Или это ловушка?',
    'Ты будешь выбирать или так и будешь пялиться?',
    'По статистике, ты сейчас проиграешь.',
    'Я положил выигрышную карту справа. Или нет?',
  ];

  if (dealerMood !== 'smug') {
    lines.push('Я уже чувствую запах паники. Отличное начало.');
    lines.push('Сегодня у меня настроение портить тебе интуицию.');
  }

  if (dealerMood === 'chaotic') {
    lines.push('Сейчас будет либо красиво, либо очень стыдно.');
    lines.push('Предлагаю тебе стратегию: импровизируй и страдай.');
  }

  if (coins < 0) {
    lines.push('Ты мне должен денег. Выбирай осторожно.');
    lines.push('Играем в кредит, да? Очень взрослое решение.');
  }

  if (repeatedPickStreak >= 2) {
    lines.push('Опять тянешься к одной и той же карте? Люблю предсказуемых игроков.');
  }

  return randomFrom(lines, random);
}

const sceneDefinitions: SceneDefinition[] = [
  {
    id: 'are_you_sure',
    cooldown: 1,
    getWeight: (context) => (context.stats.repeatedPickStreak >= 2 ? 3 : 1.2),
    create: (context, random) => {
      const variants = [
        `Карта ${context.selectedCard + 1}? Серьезно? Я был уверен, что ты выберешь другую. Ты абсолютно уверен?`,
        `Опять Карта ${context.selectedCard + 1}? Мне даже скучно стало. Подтверждаешь этот гениальный выбор?`,
        `Я бы на твоем месте притворился, что мискликнул. Открываем Карту ${context.selectedCard + 1}?`,
      ];

      return {
        script: 'are_you_sure',
        message: randomFrom(variants, random),
        buttons: [
          createDialogButton('confirm-selection', 'Да, уверен!', {
            type: 'reveal',
            index: context.selectedCard,
          }),
          createDialogButton('change-mind', 'Стой, дай поменять', { type: 'cancel-selection' }),
        ],
      };
    },
  },
  {
    id: 'monty_hall',
    cooldown: 2,
    getWeight: () => 1.4,
    create: (context, random) => {
      const revealedLoser = randomCardIndex([context.selectedCard, context.winningCard], random);
      const otherCard = CARD_INDICES.find(
        (cardIndex) => cardIndex !== context.selectedCard && cardIndex !== revealedLoser,
      ) as CardIndex;
      const variants = [
        `Интересно. Давай я тебе помогу. Карта ${revealedLoser + 1} точно проигрышная. Поменяешь выбор на Карту ${otherCard + 1}?`,
        `Смотри, Карта ${revealedLoser + 1} мусор. Остались твоя и Карта ${otherCard + 1}. Рискнешь переключиться?`,
      ];

      return {
        script: 'monty_hall',
        message: randomFrom(variants, random),
        buttons: [
          createDialogButton(`switch-${otherCard}`, `Поменять на Карту ${otherCard + 1}`, {
            type: 'reveal',
            index: otherCard,
          }),
          createDialogButton(`stay-${context.selectedCard}`, `Оставить Карту ${context.selectedCard + 1}`, {
            type: 'reveal',
            index: context.selectedCard,
          }),
        ],
        revealedCards: CARD_INDICES.map((cardIndex) => cardIndex === revealedLoser),
      };
    },
  },
  {
    id: 'raise_stakes',
    cooldown: 2,
    getWeight: (context) => (context.dealerMood === 'predatory' ? 2.4 : 1.3),
    create: (context, random) => {
      const raisedStakes: Stakes = { win: 4, lose: 2 };
      const variants = [
        'Ты выглядишь уверенно. Слишком уверенно. Давай удвоим ставки? Выиграешь +4, проиграешь -2.',
        'Пора проверить, насколько дорогая у тебя самоуверенность. Играем на повышенных?',
      ];

      return {
        script: 'raise_stakes',
        message: randomFrom(variants, random),
        buttons: [
          createDialogButton('raise-stakes', 'Удваиваем!', {
            type: 'reveal',
            index: context.selectedCard,
            stakes: raisedStakes,
          }),
          createDialogButton('base-stakes', 'Нет, обычные ставки', {
            type: 'reveal',
            index: context.selectedCard,
          }),
        ],
      };
    },
  },
  {
    id: 'fake_hint',
    cooldown: 2,
    getWeight: (context) => (context.stats.losses > context.stats.wins ? 2.2 : 1.1),
    create: (context, random) => {
      const isHonest = random() > 0.5;
      const hintedCard = isHonest
        ? context.winningCard
        : randomCardIndex([context.winningCard], random);
      const hintTone = isHonest ? 'Ладно, сегодня я почти честен.' : 'Буду честен. Наверное.';

      return {
        script: 'fake_hint',
        message: `${hintTone} Выигрышная карта, кажется, Карта ${hintedCard + 1}. Хочешь поменять выбор?`,
        buttons: [
          createDialogButton(`hint-switch-${hintedCard}`, `Поменять на Карту ${hintedCard + 1}`, {
            type: 'reveal',
            index: hintedCard,
          }),
          createDialogButton(`hint-stay-${context.selectedCard}`, `Оставить Карту ${context.selectedCard + 1}`, {
            type: 'reveal',
            index: context.selectedCard,
          }),
        ],
      };
    },
  },
  {
    id: 'insult',
    cooldown: 1,
    getWeight: (context) => (context.stats.repeatedPickStreak >= 2 ? 2.5 : 1.2),
    create: (context, random) => {
      const variants = [
        `Карта ${context.selectedCard + 1}. Классический выбор для тех, кто любит терять деньги. Последний шанс передумать.`,
        `О, Карта ${context.selectedCard + 1}. Надежный выбор, если твоя цель унижение.`,
      ];

      return {
        script: 'insult',
        message: randomFrom(variants, random),
        buttons: [
          createDialogButton(`insult-stay-${context.selectedCard}`, `Я сказал Карта ${context.selectedCard + 1}`, {
            type: 'reveal',
            index: context.selectedCard,
          }),
          createDialogButton('insult-cancel', 'Дай подумать', { type: 'cancel-selection' }),
        ],
      };
    },
  },
  {
    id: 'swap_cards',
    cooldown: 3,
    getWeight: (context) => (context.dealerMood === 'chaotic' ? 2.5 : 0.9),
    create: (context, random) => {
      const nextWinningCard = randomCardIndex([context.winningCard], random);
      const variants = [
        `*Вжух* Я только что перемешал карты силой мысли. Ты все еще выбираешь Карту ${context.selectedCard + 1}?`,
        `Мне стало скучно, поэтому я слегка сдвинул удачу в сторону. Оставляем Карту ${context.selectedCard + 1}?`,
      ];

      return {
        script: 'swap_cards',
        message: randomFrom(variants, random),
        buttons: [
          createDialogButton('swap-open', 'Я доверяю интуиции. Открывай.', {
            type: 'reveal',
            index: context.selectedCard,
          }),
          createDialogButton('swap-cancel', 'Дай выбрать снова', { type: 'cancel-selection' }),
        ],
        nextWinningCard,
      };
    },
  },
  {
    id: 'timeout',
    cooldown: 3,
    getWeight: (context) => (context.stats.losses >= 2 ? 2.8 : 1),
    create: (context) => ({
      script: 'timeout',
      message:
        'Быстро. У тебя 3 секунды, чтобы подтвердить выбор. Иначе я заберу 1 монетку за тормоза.',
      buttons: [
        createDialogButton('timeout-confirm', 'ПОДТВЕРЖДАЮ!', {
          type: 'reveal',
          index: context.selectedCard,
        }),
        createDialogButton('timeout-cancel', 'ПОМЕНЯТЬ!', { type: 'cancel-selection' }),
      ],
      timeoutMs: 3000,
    }),
  },
  {
    id: 'bribe',
    cooldown: 2,
    canRun: (context) => context.coins >= 1,
    getWeight: (context) => (context.coins <= 3 ? 2.4 : 1.1),
    create: (context) => ({
      script: 'bribe',
      message: `Псс. Дай мне 1 монетку, и я скажу тебе, выигрышная ли Карта ${context.selectedCard + 1}, до того как ты ее откроешь.`,
      buttons: [
        createDialogButton(`pay-bribe-${context.selectedCard}`, 'Заплатить 1 монетку', {
          type: 'pay-bribe',
          index: context.selectedCard,
        }),
        createDialogButton(`skip-bribe-${context.selectedCard}`, 'Никаких взяток, открывай', {
          type: 'reveal',
          index: context.selectedCard,
        }),
      ],
    }),
  },
  {
    id: 'all_in',
    cooldown: 3,
    canRun: (context) => context.coins > 0,
    getWeight: (context) => (context.coins >= 8 ? 2.2 : 0.7),
    create: (context) => {
      const allInStakes: Stakes = { win: context.coins * 2, lose: context.coins };

      return {
        script: 'all_in',
        message: `Чувствуешь удачу? Ставь все свои ${context.coins} монеток. Выиграешь ${context.coins * 2}, проиграешь все.`,
        buttons: [
          createDialogButton('all-in', 'ВА-БАНК!', {
            type: 'reveal',
            index: context.selectedCard,
            stakes: allInStakes,
          }),
          createDialogButton('all-in-skip', 'Слишком страшно, обычная ставка', {
            type: 'reveal',
            index: context.selectedCard,
          }),
        ],
      };
    },
  },
];

function computeSceneWeight(scene: SceneDefinition, context: SceneContext): number {
  if (scene.canRun && !scene.canRun(context)) {
    return 0;
  }

  const recentIndex = context.stats.recentScripts.lastIndexOf(scene.id);
  if (recentIndex !== -1) {
    const roundsAgo = context.stats.recentScripts.length - recentIndex;
    if (roundsAgo <= scene.cooldown) {
      return 0;
    }
  }

  const baseWeight = scene.getWeight(context);
  if (context.stats.recentScripts.at(-1) === scene.id) {
    return 0;
  }

  return Math.max(baseWeight, 0);
}

export function listEligibleScenes(context: SceneContext) {
  return sceneDefinitions
    .map((scene) => ({ scene, weight: computeSceneWeight(scene, context) }))
    .filter((entry) => entry.weight > 0);
}

export function pickScene(context: SceneContext, random: RandomSource = Math.random): SceneOutcome {
  const eligible = listEligibleScenes(context);
  const pool = eligible.length > 0
    ? eligible
    : sceneDefinitions
        .filter((scene) => !scene.canRun || scene.canRun(context))
        .map((scene) => ({ scene, weight: Math.max(scene.getWeight(context), 0.1) }));

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * totalWeight;

  for (const entry of pool) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.scene.create(context, random);
    }
  }

  return pool[pool.length - 1].scene.create(context, random);
}

export function buildRevealMessage(
  finalIndex: CardIndex,
  winningCard: CardIndex,
  stakes: Stakes,
  random: RandomSource = Math.random,
): string {
  if (finalIndex === winningCard) {
    return randomFrom(
      [
        `Уф. Карта ${finalIndex + 1} оказалась верной. Вот твои ${stakes.win} монеток. Не привыкай к этому.`,
        `Нелепо, но да, Карта ${finalIndex + 1} выиграла. Забирай свои ${stakes.win} монеток.`,
      ],
      random,
    );
  }

  return randomFrom(
    [
      `ХАХАХА. Карта ${finalIndex + 1} проигрышная. Победителем была Карта ${winningCard + 1}. Спасибо за ${stakes.lose} монетку(и).`,
      `Мимо. Карта ${finalIndex + 1} была пустышкой, а выигрывала Карта ${winningCard + 1}. Я забираю ${stakes.lose}.`,
    ],
    random,
  );
}
