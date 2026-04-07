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
