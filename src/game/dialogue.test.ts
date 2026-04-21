import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialMachineState,
  deriveDealerMood,
  dispatchMachineEvent,
  enterNodeById,
  getGraphContractIssues,
  getViewModel,
} from './gameEngine';

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

test('graph contract has no dangling targets or dead non-terminal nodes', () => {
  assert.deepEqual(getGraphContractIssues(), []);
});

test('initial machine exposes intro message and idle state', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
  const view = getViewModel(machine);

  assert.equal(view.gameState, 'idle');
  assert.match(view.dealerMessage, /Добро пожаловать/i);
});

test('machine engine does not log speculative winning cards', () => {
  const originalLog = console.log;
  const logs: unknown[][] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args);
  };

  try {
    const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
    machine.currentNodeId = 'reveal_win';
    machine.context.stats.streak = 1;

    dispatchMachineEvent(
      machine,
      { type: 'action', actionId: 'play-again' },
      { random: sequenceRandom([0.7, 0.1]) },
    );
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(logs, []);
});

test('play again after a win prepares the doubled next round stake', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
  machine.currentNodeId = 'reveal_win';
  machine.context.currentStakes = { win: 2, lose: 1 };
  machine.context.stats.streak = 1;

  const next = dispatchMachineEvent(
    machine,
    { type: 'action', actionId: 'play-again' },
    { random: sequenceRandom([0.1]) },
  );
  const view = getViewModel(next);

  assert.equal(view.gameState, 'idle');
  assert.equal(view.currentStakes.win, 4);
  assert.equal(view.currentStakes.lose, 1);
  assert.match(view.dealerMessage, /^Неплохо\..*ставка удвоилась/i);
  assert.match(view.dealerMessage, /\n\nВыбирай карту/i);
  assert.match(view.dealerMessage, /4 монет/i);
});

test('play again after consecutive wins keeps doubling the next round stake', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
  machine.currentNodeId = 'reveal_win';
  machine.context.currentStakes = { win: 4, lose: 1 };
  machine.context.stats.streak = 2;

  const next = dispatchMachineEvent(
    machine,
    { type: 'action', actionId: 'play-again' },
    { random: sequenceRandom([0.1]) },
  );
  const view = getViewModel(next);

  assert.equal(view.currentStakes.win, 8);
  assert.equal(view.currentStakes.lose, 1);
  assert.match(view.dealerMessage, /8 монет/i);
});

test('play again after a loss resets the next round stake to 2', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
  machine.currentNodeId = 'reveal_loss';
  machine.context.currentStakes = { win: 8, lose: 1 };
  machine.context.stats.streak = -1;

  const next = dispatchMachineEvent(
    machine,
    { type: 'action', actionId: 'play-again' },
    { random: sequenceRandom([0.1]) },
  );
  const view = getViewModel(next);

  assert.equal(view.currentStakes.win, 2);
  assert.equal(view.currentStakes.lose, 1);
});

test('regular reveal loss subtracts one coin even when win reward is doubled', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.2]) });
  machine.context.coins = 10;
  machine.context.selectedCard = 0;
  machine.context.winningCard = 1;
  machine.context.currentStakes = { win: 8, lose: 1 };
  machine.context.sceneData = { revealIndex: 0 };

  const state = enterNodeById(
    { ...machine, currentNodeId: 'reveal_resolution', pendingAutoTransition: null, dealerMessage: '' },
    'reveal_resolution',
    { random: sequenceRandom([0.1]) },
  );

  assert.equal(state.currentNodeId, 'reveal_loss');
  assert.equal(state.context.coins, 9);
});

test('scene routing excludes bribe and all-in when coins are not positive', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.currentNodeId = 'idle_prompt';
  machine.context.coins = 0;

  const next = dispatchMachineEvent(
    machine,
    { type: 'card-selected', cardIndex: 1 },
    { random: sequenceRandom([0.95]) },
  );

  assert.notEqual(next.currentNodeId, 'scene_bribe');
  assert.notEqual(next.currentNodeId, 'scene_all_in');
});

test('scene routing respects cooldown data from recent scripts', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.currentNodeId = 'idle_prompt';
  machine.context.stats.recentScripts = ['monty_hall', 'fake_hint'];

  const next = dispatchMachineEvent(
    machine,
    { type: 'card-selected', cardIndex: 1 },
    { random: sequenceRandom([0.4]) },
  );

  assert.notEqual(next.currentNodeId, 'scene_monty_hall');
  assert.notEqual(next.currentNodeId, 'scene_fake_hint');
});

test('weighted routing is deterministic for the same random source', () => {
  const createMachine = () => {
    const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
    machine.currentNodeId = 'idle_prompt';
    machine.context.coins = 2;
    machine.context.stats.losses = 4;
    machine.context.stats.wins = 0;
    machine.context.stats.streak = -3;
    machine.context.stats.repeatedPickStreak = 3;
    machine.context.stats.recentScripts = ['all_in', 'swap_cards', 'fake_hint'];
    return machine;
  };

  const nextA = dispatchMachineEvent(
    createMachine(),
    { type: 'card-selected', cardIndex: 1 },
    { random: sequenceRandom([0.72]) },
  );
  const nextB = dispatchMachineEvent(
    createMachine(),
    { type: 'card-selected', cardIndex: 1 },
    { random: sequenceRandom([0.72]) },
  );

  assert.equal(nextA.currentNodeId, nextB.currentNodeId);
});

test('swap-cards scene changes winning card without reusing current one', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.context.selectedCard = 0;
  machine.context.winningCard = 1;
  const entered = enterNodeById(
    { ...machine, currentNodeId: 'idle_prompt', pendingAutoTransition: null, dealerMessage: '' },
    'scene_swap_cards',
    { random: sequenceRandom([0.99]) },
  );

  const next = dispatchMachineEvent(
    entered,
    { type: 'action', actionId: 'swap-open' },
    { random: sequenceRandom([0.7]) },
  );

  assert.notEqual(entered.context.winningCard, 1);
  assert.match(next.currentNodeId, /^reveal_/);
});

test('dealer mood escalates from coin pressure and loss streaks', () => {
  assert.equal(deriveDealerMood(10, 0), 'smug');
  assert.equal(deriveDealerMood(2, 0), 'predatory');
  assert.equal(deriveDealerMood(20, 3), 'chaotic');
});

test('timeout scene auto-transition applies penalty and returns to idle', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.currentNodeId = 'scene_timeout';
  machine.context.coins = 3;
  machine.context.selectedCard = 1;

  const next = dispatchMachineEvent(
    machine,
    { type: 'auto', transitionId: 'timeout-expired' },
    { random: sequenceRandom([0.2]) },
  );

  assert.equal(next.currentNodeId, 'idle_timeout_penalty');
  assert.equal(next.context.coins, 2);
  assert.equal(next.context.selectedCard, null);
});

test('winning reveal always lands in reveal_win, not a random fallback', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.context.selectedCard = 2;
  machine.context.winningCard = 2;
  machine.context.currentStakes = { win: 2, lose: 1 };
  machine.context.sceneData = { revealIndex: 2 };

  const state = enterNodeById(
    { ...machine, currentNodeId: 'reveal_resolution', pendingAutoTransition: null, dealerMessage: '' },
    'reveal_resolution',
    { random: sequenceRandom([0.95]) },
  );

  assert.equal(state.currentNodeId, 'reveal_win');
  assert.match(getViewModel(state).dealerMessage, /2 монет/);
});

test('bribe resolution respects bribeWon instead of randomly falling through', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.context.coins = 5;
  machine.context.sceneData = { bribeWon: true };

  const state = enterNodeById(
    { ...machine, currentNodeId: 'scene_bribe', pendingAutoTransition: null, dealerMessage: '' },
    'bribe_resolution',
    { random: sequenceRandom([0.95]) },
  );

  assert.equal(state.currentNodeId, 'bribe_truth');
});

test('fake hint does not render duplicate switch/stay actions for the same card', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.context.selectedCard = 2;
  machine.context.winningCard = 2;

  const state = enterNodeById(
    { ...machine, currentNodeId: 'idle_prompt', pendingAutoTransition: null, dealerMessage: '' },
    'scene_fake_hint',
    { random: sequenceRandom([0.9]) },
  );
  const view = getViewModel(state);

  assert.equal(view.dialogButtons.length, 1);
  assert.equal(view.dialogButtons[0].action.actionId, 'hint-stay');
  assert.match(view.dealerMessage, /и так держишься за Карту 3/i);
});

test('reveal loss message uses reveal snapshot, not mutable live winner state', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.context.selectedCard = 0;
  machine.context.winningCard = 0;
  machine.context.currentStakes = { win: 4, lose: 2 };
  machine.context.sceneData = {
    revealIndex: 0,
    resolvedWinningCard: 1,
    revealOutcome: 'lose',
  };

  const state = enterNodeById(
    { ...machine, currentNodeId: 'reveal_resolution', pendingAutoTransition: null, dealerMessage: '' },
    'reveal_loss',
    { random: sequenceRandom([0.1]) },
  );
  const view = getViewModel(state);

  assert.match(view.dealerMessage, /Карта 1 проигрышная\..*Карта 2\./);
});

test('game over blocks further progress', () => {
  const machine = createInitialMachineState({ random: sequenceRandom([0.1]) });
  machine.currentNodeId = 'game_over';
  machine.context.coins = 0;

  const next = dispatchMachineEvent(
    machine,
    { type: 'card-selected', cardIndex: 1 },
    { random: sequenceRandom([0.2]) },
  );

  assert.equal(next.currentNodeId, 'game_over');
});
