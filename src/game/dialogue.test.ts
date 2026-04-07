import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIdleMessage, deriveDealerMood, listEligibleScenes, pickScene } from './dialogue';
import type { SceneContext, TrollScript } from './types';

function createContext(overrides: Partial<SceneContext> = {}): SceneContext {
  return {
    coins: 10,
    selectedCard: 1,
    winningCard: 2,
    dealerMood: 'smug',
    stats: {
      round: 3,
      wins: 1,
      losses: 2,
      streak: -1,
      lastPickedCard: 1,
      repeatedPickStreak: 1,
      pickCounts: { 0: 1, 1: 2, 2: 0 },
      recentScripts: [],
    },
    ...overrides,
  };
}

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

test('eligible scenes exclude bribe and all_in when coins are not positive', () => {
  const context = createContext({ coins: 0 });
  const eligibleScripts = listEligibleScenes(context).map((entry) => entry.scene.id);

  assert(!eligibleScripts.includes('all_in'));
  assert(!eligibleScripts.includes('bribe'));
});

test('scene picker avoids scripts that are still on cooldown', () => {
  const context = createContext({
    stats: {
      ...createContext().stats,
      recentScripts: ['monty_hall', 'fake_hint'] satisfies TrollScript[],
    },
  });

  const eligibleScripts = listEligibleScenes(context).map((entry) => entry.scene.id);
  assert(!eligibleScripts.includes('fake_hint'));
  assert(!eligibleScripts.includes('monty_hall'));
});

test('scene picker falls back to an eligible high-weight script deterministically', () => {
  const context = createContext({
    coins: 2,
    dealerMood: 'predatory',
    stats: {
      ...createContext().stats,
      losses: 4,
      wins: 0,
      repeatedPickStreak: 3,
      recentScripts: ['all_in', 'swap_cards', 'fake_hint'],
    },
  });

  const outcome = pickScene(context, sequenceRandom([0.35]));
  assert.equal(outcome.script, 'raise_stakes');
});

test('swap_cards changes the winning card without reusing the current one', () => {
  const context = createContext({
    selectedCard: 0,
    winningCard: 1,
    dealerMood: 'chaotic',
    stats: {
      ...createContext().stats,
      recentScripts: ['timeout', 'all_in', 'bribe'],
    },
  });

  const outcome = pickScene(context, sequenceRandom([0.82, 0.99]));

  assert.equal(outcome.script, 'swap_cards');
  assert.notEqual(outcome.nextWinningCard, context.winningCard);
  assert.notEqual(outcome.nextWinningCard, undefined);
});

test('idle message reacts to debt and repeated picks', () => {
  const line = buildIdleMessage(-1, 'predatory', 2, sequenceRandom([0.95]));
  assert.match(line, /кредит|предсказуемых/i);
});

test('dealer mood escalates from coin pressure and loss streaks', () => {
  assert.equal(deriveDealerMood(10, 0), 'smug');
  assert.equal(deriveDealerMood(2, 0), 'predatory');
  assert.equal(deriveDealerMood(20, 3), 'chaotic');
});
