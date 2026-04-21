import type {
  CardIndex,
  GameGraph,
  GameMessageGroup,
  GameStateNode,
  GameTransition,
  Stakes,
} from './types';

const BASE_STAKES: Stakes = { win: 2, lose: 1 };
const RAISED_STAKES: Stakes = { win: 4, lose: 2 };

function state(node: Omit<GameStateNode, 'id'> & { id: GameStateNode['id'] }): GameStateNode {
  return node;
}

function messages(...templates: string[]): GameMessageGroup[] {
  return [{ templates }];
}

function cardSceneTransitions(): GameTransition[] {
  const sharedEffects = [
    { type: 'set-context', key: 'selectedCard', value: { helper: 'actionCardIndex' } },
    { type: 'set-revealed-cards', mode: 'all-hidden' },
    { type: 'clear-scene-data' },
    { type: 'update-selection-stats' },
  ] as const;

  return [
    {
      id: 'pick-are-you-sure',
      trigger: 'card-selected',
      target: 'scene_are_you_sure',
      weight: 1.2,
      guards: [{ op: 'script-available', script: 'are_you_sure', cooldown: 1 }],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-monty-hall',
      trigger: 'card-selected',
      target: 'scene_monty_hall',
      weight: 1.4,
      guards: [{ op: 'script-available', script: 'monty_hall', cooldown: 2 }],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-raise-stakes',
      trigger: 'card-selected',
      target: 'scene_raise_stakes',
      weight: 1.3,
      guards: [
        { op: 'script-available', script: 'raise_stakes', cooldown: 2 },
        {
          op: 'any',
          guards: [
            { op: 'eq', left: { helper: 'dealerMood' }, right: 'predatory' },
            { op: 'eq', left: 1, right: 1 },
          ],
        },
      ],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-fake-hint',
      trigger: 'card-selected',
      target: 'scene_fake_hint',
      weight: 1.1,
      guards: [{ op: 'script-available', script: 'fake_hint', cooldown: 2 }],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-insult',
      trigger: 'card-selected',
      target: 'scene_insult',
      weight: 1.2,
      guards: [{ op: 'script-available', script: 'insult', cooldown: 1 }],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-swap-cards',
      trigger: 'card-selected',
      target: 'scene_swap_cards',
      weight: 0.9,
      guards: [
        { op: 'script-available', script: 'swap_cards', cooldown: 3 },
        { op: 'eq', left: { helper: 'dealerMood' }, right: 'chaotic' },
      ],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-timeout',
      trigger: 'card-selected',
      target: 'scene_timeout',
      weight: 1,
      guards: [{ op: 'script-available', script: 'timeout', cooldown: 3 }],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-bribe',
      trigger: 'card-selected',
      target: 'scene_bribe',
      weight: 1.1,
      guards: [
        { op: 'script-available', script: 'bribe', cooldown: 2 },
        { op: 'gte', left: { from: 'context', key: 'coins' }, right: 1 },
      ],
      effects: [...sharedEffects],
    },
    {
      id: 'pick-all-in',
      trigger: 'card-selected',
      target: 'scene_all_in',
      weight: 0.7,
      guards: [
        { op: 'script-available', script: 'all_in', cooldown: 3 },
        { op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 },
      ],
      effects: [...sharedEffects],
    },
  ];
}

function doubledStakeMessages(): GameMessageGroup {
  return {
    templates: [
      'Неплохо. После прошлого выигрыша ставка удвоилась: теперь выиграешь {winAmount} монеток, а проиграешь {loseAmount}.',
      'Раз уж ты поймал удачу, я поднял цену: за правильную карту получишь {winAmount}, за ошибку потеряешь {loseAmount}.',
    ],
  };
}

function idlePromptMessages(): GameMessageGroup[] {
  return [
    {
      templates: [
        'Выбирай карту. Любую. Я обещаю, что не буду мухлевать. Почти.',
        'Средняя выглядит сочно. Или это ловушка?',
        'Ты будешь выбирать или так и будешь пялиться?',
        'По статистике, ты сейчас проиграешь.',
        'Я положил выигрышную карту справа. Или нет?',
      ],
    },
    {
      guards: [{ op: 'ne', left: { helper: 'dealerMood' }, right: 'smug' }],
      templates: [
        'Я уже чувствую запах паники. Отличное начало.',
        'Сегодня у меня настроение портить тебе интуицию.',
      ],
    },
    {
      guards: [{ op: 'eq', left: { helper: 'dealerMood' }, right: 'chaotic' }],
      templates: [
        'Сейчас будет либо красиво, либо очень стыдно.',
        'Предлагаю тебе стратегию: импровизируй и страдай.',
      ],
    },
    {
      guards: [{ op: 'lt', left: { from: 'context', key: 'coins' }, right: 0 }],
      templates: [
        'Ты мне должен денег. Выбирай осторожно.',
        'Играем в кредит, да? Очень взрослое решение.',
      ],
    },
    {
      guards: [
        { op: 'gte', left: { from: 'context', key: 'stats.repeatedPickStreak' }, right: 2 },
      ],
      templates: [
        'Опять тянешься к одной и той же карте? Люблю предсказуемых игроков.',
      ],
    },
  ];
}

export const BASE_STAKES_VALUE = BASE_STAKES;
export const RAISED_STAKES_VALUE = RAISED_STAKES;

export const gameGraph: GameGraph = {
  initialNodeId: 'idle_intro',
  states: {
    idle_intro: state({
      id: 'idle_intro',
      phase: 'idle',
      messages: messages(
        'Добро пожаловать в Тролль-Монте. Найди выигрышную карту. Спойлер: ты не сможешь.',
      ),
      transitions: [
        ...cardSceneTransitions(),
        { id: 'intro-to-idle', trigger: 'auto', target: 'idle_prompt', delayMs: 5000 },
      ],
    }),
    idle_prompt: state({
      id: 'idle_prompt',
      phase: 'idle',
      messages: idlePromptMessages(),
      transitions: [
        ...cardSceneTransitions(),
        { id: 'refresh-idle', trigger: 'auto', target: 'idle_prompt', delayMs: 5000 },
      ],
    }),
    idle_doubled_stakes: state({
      id: 'idle_doubled_stakes',
      phase: 'idle',
      messageMode: 'prefix-random',
      messages: [doubledStakeMessages(), ...idlePromptMessages()],
      transitions: [
        ...cardSceneTransitions(),
        { id: 'doubled-stakes-to-idle', trigger: 'auto', target: 'idle_prompt', delayMs: 5000 },
      ],
    }),
    idle_cancel: state({
      id: 'idle_cancel',
      phase: 'idle',
      messages: messages('Передумал? Типично. Выбирай снова.'),
      transitions: [
        ...cardSceneTransitions(),
        { id: 'cancel-to-idle', trigger: 'auto', target: 'idle_prompt', delayMs: 5000 },
      ],
    }),
    idle_timeout_penalty: state({
      id: 'idle_timeout_penalty',
      phase: 'idle',
      messages: messages('Время вышло. Я забрал 1 монетку за нерешительность. Выбирай снова.'),
      transitions: [
        ...cardSceneTransitions(),
        { id: 'timeout-to-idle', trigger: 'auto', target: 'idle_prompt', delayMs: 5000 },
      ],
    }),
    scene_are_you_sure: state({
      id: 'scene_are_you_sure',
      phase: 'troll',
      scriptId: 'are_you_sure',
      messages: messages(
        'Карта {selectedCard}? Серьезно? Я был уверен, что ты выберешь другую. Ты абсолютно уверен?',
        'Опять Карта {selectedCard}? Мне даже скучно стало. Подтверждаешь этот гениальный выбор?',
        'Я бы на твоем месте притворился, что мискликнул. Открываем Карту {selectedCard}?',
      ),
      transitions: [
        {
          id: 'confirm-selection',
          trigger: 'action',
          actionId: 'confirm-selection',
          label: 'Да, уверен!',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
        {
          id: 'change-mind',
          trigger: 'action',
          actionId: 'change-mind',
          label: 'Стой, дай поменять',
          target: 'idle_cancel',
          effects: [{ type: 'clear-selection' }],
        },
      ],
    }),
    scene_monty_hall: state({
      id: 'scene_monty_hall',
      phase: 'troll',
      scriptId: 'monty_hall',
      entryEffects: [
        { type: 'set-scene-data', key: 'revealedLoser', value: { helper: 'loserCardExcludingSelectedAndWinner' } },
        { type: 'set-scene-data', key: 'otherCard', value: { helper: 'otherRemainingCard' } },
        { type: 'set-revealed-cards', mode: 'single-loser' },
      ],
      messages: messages(
        'Интересно. Давай я тебе помогу. Карта {revealedLoser} точно проигрышная. Поменяешь выбор на Карту {otherCard}?',
        'Смотри, Карта {revealedLoser} мусор. Остались твоя и Карта {otherCard}. Рискнешь переключиться?',
      ),
      transitions: [
        {
          id: 'monty-switch',
          trigger: 'action',
          actionId: 'monty-switch',
          label: 'Поменять на Карту {otherCard}',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { from: 'scene', key: 'otherCard' } }],
        },
        {
          id: 'monty-stay',
          trigger: 'action',
          actionId: 'monty-stay',
          label: 'Оставить Карту {selectedCard}',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
      ],
    }),
    scene_raise_stakes: state({
      id: 'scene_raise_stakes',
      phase: 'troll',
      scriptId: 'raise_stakes',
      messages: messages(
        'Ты выглядишь уверенно. Слишком уверенно. Давай удвоим ставки? Выиграешь +4, проиграешь -2.',
        'Пора проверить, насколько дорогая у тебя самоуверенность. Играем на повышенных?',
      ),
      transitions: [
        {
          id: 'raise-stakes',
          trigger: 'action',
          actionId: 'raise-stakes',
          label: 'Удваиваем!',
          target: 'reveal_resolution',
          effects: [
            { type: 'set-stakes', value: RAISED_STAKES },
            { type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } },
          ],
        },
        {
          id: 'base-stakes',
          trigger: 'action',
          actionId: 'base-stakes',
          label: 'Нет, обычные ставки',
          target: 'reveal_resolution',
          effects: [
            { type: 'set-stakes', value: { helper: 'baseStakes' } },
            { type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } },
          ],
        },
      ],
    }),
    scene_fake_hint: state({
      id: 'scene_fake_hint',
      phase: 'troll',
      scriptId: 'fake_hint',
      entryEffects: [
        { type: 'set-scene-data', key: 'hintedCard', value: { helper: 'fakeHintedCard' } },
        { type: 'set-scene-data', key: 'hintTone', value: { helper: 'fakeHintTone' } },
      ],
      messages: [
        {
          guards: [
            { op: 'ne', left: { from: 'scene', key: 'hintedCard' }, right: { helper: 'selectedCard' } },
          ],
          templates: [
            '{hintTone} Выигрышная карта, кажется, Карта {hintedCard}. Хочешь поменять выбор?',
          ],
        },
        {
          guards: [
            { op: 'eq', left: { from: 'scene', key: 'hintedCard' }, right: { helper: 'selectedCard' } },
          ],
          templates: [
            '{hintTone} Похоже, ты и так держишься за Карту {hintedCard}. Можем просто открыть её, если хватит смелости.',
          ],
        },
      ],
      transitions: [
        {
          id: 'hint-switch',
          trigger: 'action',
          actionId: 'hint-switch',
          label: 'Поменять на Карту {hintedCard}',
          target: 'reveal_resolution',
          guards: [
            { op: 'ne', left: { from: 'scene', key: 'hintedCard' }, right: { helper: 'selectedCard' } },
          ],
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { from: 'scene', key: 'hintedCard' } }],
        },
        {
          id: 'hint-stay',
          trigger: 'action',
          actionId: 'hint-stay',
          label: 'Оставить Карту {selectedCard}',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
      ],
    }),
    scene_insult: state({
      id: 'scene_insult',
      phase: 'troll',
      scriptId: 'insult',
      messages: messages(
        'Карта {selectedCard}. Классический выбор для тех, кто любит терять деньги. Последний шанс передумать.',
        'О, Карта {selectedCard}. Надежный выбор, если твоя цель унижение.',
      ),
      transitions: [
        {
          id: 'insult-stay',
          trigger: 'action',
          actionId: 'insult-stay',
          label: 'Я сказал Карта {selectedCard}',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
        {
          id: 'insult-cancel',
          trigger: 'action',
          actionId: 'insult-cancel',
          label: 'Дай подумать',
          target: 'idle_cancel',
          effects: [{ type: 'clear-selection' }],
        },
      ],
    }),
    scene_swap_cards: state({
      id: 'scene_swap_cards',
      phase: 'troll',
      scriptId: 'swap_cards',
      entryEffects: [{ type: 'set-context', key: 'winningCard', value: { helper: 'nonCurrentWinningCard' } }],
      messages: messages(
        '*Вжух* Я только что перемешал карты силой мысли. Ты все еще выбираешь Карту {selectedCard}?',
        'Мне стало скучно, поэтому я слегка сдвинул удачу в сторону. Оставляем Карту {selectedCard}?',
      ),
      transitions: [
        {
          id: 'swap-open',
          trigger: 'action',
          actionId: 'swap-open',
          label: 'Я доверяю интуиции. Открывай.',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
        {
          id: 'swap-cancel',
          trigger: 'action',
          actionId: 'swap-cancel',
          label: 'Дай выбрать снова',
          target: 'idle_cancel',
          effects: [{ type: 'clear-selection' }],
        },
      ],
    }),
    scene_timeout: state({
      id: 'scene_timeout',
      phase: 'troll',
      scriptId: 'timeout',
      messages: messages(
        'Быстро. У тебя 3 секунды, чтобы подтвердить выбор. Иначе я заберу 1 монетку за тормоза.',
      ),
      transitions: [
        {
          id: 'timeout-confirm',
          trigger: 'action',
          actionId: 'timeout-confirm',
          label: 'ПОДТВЕРЖДАЮ!',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
        {
          id: 'timeout-cancel',
          trigger: 'action',
          actionId: 'timeout-cancel',
          label: 'ПОМЕНЯТЬ!',
          target: 'idle_cancel',
          effects: [{ type: 'clear-selection' }],
        },
        {
          id: 'timeout-expired',
          trigger: 'auto',
          target: 'timeout_resolution',
          delayMs: 3000,
        },
      ],
    }),
    timeout_resolution: state({
      id: 'timeout_resolution',
      phase: 'idle',
      entryEffects: [
        { type: 'add-coins', amount: -1 },
        { type: 'update-round-stats', outcome: 'lose' },
        { type: 'clear-selection' },
      ],
      transitions: [
        {
          id: 'timeout-game-over',
          trigger: 'auto',
          target: 'game_over',
          guards: [{ op: 'lte', left: { from: 'context', key: 'coins' }, right: 0 }],
        },
        {
          id: 'timeout-back-to-idle',
          trigger: 'auto',
          target: 'idle_timeout_penalty',
          guards: [{ op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 }],
        },
      ],
    }),
    scene_bribe: state({
      id: 'scene_bribe',
      phase: 'troll',
      scriptId: 'bribe',
      messages: messages(
        'Псс. Дай мне 1 монетку, и я скажу тебе, выигрышная ли Карта {selectedCard}, до того как ты ее откроешь.',
      ),
      transitions: [
        {
          id: 'pay-bribe',
          trigger: 'action',
          actionId: 'pay-bribe',
          label: 'Заплатить 1 монетку',
          target: 'bribe_resolution',
          effects: [
            { type: 'add-coins', amount: -1 },
            { type: 'set-scene-data', key: 'bribeWon', value: { helper: 'bribeIsWinningCard' } },
          ],
        },
        {
          id: 'skip-bribe',
          trigger: 'action',
          actionId: 'skip-bribe',
          label: 'Никаких взяток, открывай',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
      ],
    }),
    bribe_resolution: state({
      id: 'bribe_resolution',
      phase: 'troll',
      transitions: [
        {
          id: 'bribe-game-over',
          trigger: 'auto',
          target: 'game_over',
          guards: [{ op: 'lte', left: { from: 'context', key: 'coins' }, right: 0 }],
        },
        {
          id: 'bribe-success',
          trigger: 'auto',
          target: 'bribe_truth',
          guards: [
            { op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 },
            { op: 'eq', left: { from: 'scene', key: 'bribeWon' }, right: true },
          ],
        },
        {
          id: 'bribe-failure',
          trigger: 'auto',
          target: 'bribe_lie',
          guards: [
            { op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 },
            { op: 'eq', left: { from: 'scene', key: 'bribeWon' }, right: false },
          ],
        },
      ],
    }),
    bribe_truth: state({
      id: 'bribe_truth',
      phase: 'troll',
      messages: messages('Ага, она выигрышная. Не благодари.'),
      transitions: [
        {
          id: 'bribe-reveal',
          trigger: 'action',
          actionId: 'bribe-reveal',
          label: 'Открывай!',
          target: 'reveal_resolution',
          effects: [{ type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } }],
        },
      ],
    }),
    bribe_lie: state({
      id: 'bribe_lie',
      phase: 'troll',
      messages: messages('Не-а, она проигрышная. Рад, что заплатил мне? Выбирай другую.'),
      transitions: [
        {
          id: 'bribe-reset',
          trigger: 'action',
          actionId: 'bribe-reset',
          label: 'Выбрать другую',
          target: 'idle_cancel',
          effects: [{ type: 'clear-selection' }],
        },
      ],
    }),
    scene_all_in: state({
      id: 'scene_all_in',
      phase: 'troll',
      scriptId: 'all_in',
      messages: messages(
        'Чувствуешь удачу? Ставь все свои {coins} монеток. Выиграешь {allInWinAmount}, проиграешь все.',
      ),
      transitions: [
        {
          id: 'all-in',
          trigger: 'action',
          actionId: 'all-in',
          label: 'ВА-БАНК!',
          target: 'reveal_resolution',
          effects: [
            { type: 'set-stakes', value: { helper: 'allInStakes' } },
            { type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } },
          ],
        },
        {
          id: 'all-in-skip',
          trigger: 'action',
          actionId: 'all-in-skip',
          label: 'Слишком страшно, обычная ставка',
          target: 'reveal_resolution',
          effects: [
            { type: 'set-stakes', value: { helper: 'baseStakes' } },
            { type: 'set-scene-data', key: 'revealIndex', value: { helper: 'selectedCard' } },
          ],
        },
      ],
    }),
    reveal_resolution: state({
      id: 'reveal_resolution',
      phase: 'reveal',
      entryEffects: [
        { type: 'set-context', key: 'selectedCard', value: { helper: 'selectedCardOrRevealIndex' } },
        { type: 'set-revealed-cards', mode: 'all-revealed' },
        { type: 'set-scene-data', key: 'resolvedWinningCard', value: { helper: 'winningCard' } },
        { type: 'set-scene-data', key: 'revealOutcome', value: { helper: 'revealOutcome' } },
        { type: 'add-coins', amount: { helper: 'revealCoinDelta' } },
        { type: 'update-round-stats', outcome: { helper: 'revealOutcome' } },
      ],
      transitions: [
        {
          id: 'reveal-game-over',
          trigger: 'auto',
          target: 'game_over',
          guards: [{ op: 'lte', left: { from: 'context', key: 'coins' }, right: 0 }],
        },
        {
          id: 'reveal-win',
          trigger: 'auto',
          target: 'reveal_win',
          guards: [
            { op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 },
            { op: 'eq', left: { from: 'scene', key: 'revealOutcome' }, right: 'win' },
          ],
        },
        {
          id: 'reveal-loss',
          trigger: 'auto',
          target: 'reveal_loss',
          guards: [
            { op: 'gt', left: { from: 'context', key: 'coins' }, right: 0 },
            { op: 'eq', left: { from: 'scene', key: 'revealOutcome' }, right: 'lose' },
          ],
        },
      ],
    }),
    reveal_win: state({
      id: 'reveal_win',
      phase: 'reveal',
      messages: messages(
        'Уф. Карта {revealIndex} оказалась верной. Вот твои {winAmount} монеток. Не привыкай к этому.',
        'Нелепо, но да, Карта {revealIndex} выиграла. Забирай свои {winAmount} монеток.',
      ),
      transitions: [
        {
          id: 'play-again-win',
          trigger: 'action',
          actionId: 'play-again',
          label: 'Играть снова',
          target: 'idle_doubled_stakes',
          effects: [{ type: 'prepare-next-round' }],
        },
      ],
    }),
    reveal_loss: state({
      id: 'reveal_loss',
      phase: 'reveal',
      messages: messages(
        'ХАХАХА. Карта {revealIndex} проигрышная. Победителем была Карта {resolvedWinningCard}. Спасибо за {loseAmount} монетку(и).',
        'Мимо. Карта {revealIndex} была пустышкой, а выигрывала Карта {resolvedWinningCard}. Я забираю {loseAmount}.',
      ),
      transitions: [
        {
          id: 'play-again-loss',
          trigger: 'action',
          actionId: 'play-again',
          label: 'Играть снова',
          target: 'idle_prompt',
          effects: [{ type: 'prepare-next-round' }],
        },
      ],
    }),
    game_over: state({
      id: 'game_over',
      phase: 'game-over',
      messages: messages(
        'Ну всё, касса пуста. Ты официально проиграл даже самому простому лохотрону, так что шоу окончено. Возвращайся, когда найдёшь хоть одну монетку и немного достоинства.',
      ),
      transitions: [],
    }),
  },
};

export type GameGraphStateId = keyof typeof gameGraph.states;

export function getCardIndices(): CardIndex[] {
  return [0, 1, 2];
}
