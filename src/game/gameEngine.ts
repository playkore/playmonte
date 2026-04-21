import { gameGraph, BASE_STAKES_VALUE, getCardIndices } from './gameGraph';
import type {
  CardIndex,
  DealerMood,
  DialogButton,
  GameEffect,
  GameGraph,
  GameGuard,
  GameNodeId,
  GameStateNode,
  GameTransition,
  GameViewModel,
  MachineContext,
  MachineDispatchOptions,
  MachineEvent,
  MachineState,
  PendingAutoTransition,
  Stakes,
  ValueSource,
} from './types';

const MAX_RECENT_SCRIPTS = 3;

function randomFrom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function getPathValue(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined;
    }

    return (value as Record<string, unknown>)[part];
  }, source);
}

function setPathValue(target: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.split('.');
  const last = parts.pop();
  if (!last) {
    return;
  }

  let cursor: Record<string, unknown> = target;
  for (const part of parts) {
    const current = cursor[part];
    if (!current || typeof current !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[last] = value;
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

function randomCardIndex(excluded: CardIndex[], random: () => number): CardIndex {
  const candidates = getCardIndices().filter((index) => !excluded.includes(index));
  return candidates[Math.floor(random() * candidates.length)] ?? 0;
}

function appendRecentScript(recentScripts: string[], script: string) {
  return [...recentScripts, script].slice(-MAX_RECENT_SCRIPTS);
}

function resolveValue(
  context: MachineContext,
  value: ValueSource,
  random: () => number,
  event?: MachineEvent,
): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  if ('from' in value) {
    if (value.from === 'context') {
      return getPathValue(context, value.key);
    }

    if (value.from === 'scene') {
      return context.sceneData[value.key];
    }

    if (value.from === 'action') {
      if (!event) {
        return undefined;
      }

      return getPathValue(event, value.key);
    }
  }

  if ('helper' in value) {
    return resolveHelper(context, value.helper, random, event);
  }

  return value;
}

function resolveHelper(
  context: MachineContext,
  helper: ValueSource & { helper: string }['helper'],
  random: () => number,
  event?: MachineEvent,
): unknown {
  switch (helper) {
    case 'dealerMood':
      return deriveDealerMood(context.coins, context.stats.streak);
    case 'actionCardIndex':
      return event && event.type === 'card-selected' ? event.cardIndex : null;
    case 'baseStakes':
      return BASE_STAKES_VALUE;
    case 'raisedStakes':
      return { win: 4, lose: 2 } satisfies Stakes;
    case 'allInStakes':
      return { win: context.coins * 2, lose: context.coins } satisfies Stakes;
    case 'loserCardExcludingSelectedAndWinner':
      return randomCardIndex(
        [context.selectedCard, context.winningCard].filter(
          (index): index is CardIndex => index !== null,
        ),
        random,
      );
    case 'otherRemainingCard': {
      const selectedCard = context.selectedCard;
      const revealedLoser = context.sceneData.revealedLoser;

      if (selectedCard === null || typeof revealedLoser !== 'number') {
        return selectedCard;
      }

      return getCardIndices().find(
        (cardIndex) => cardIndex !== selectedCard && cardIndex !== revealedLoser,
      );
    }
    case 'nonCurrentWinningCard':
      return randomCardIndex([context.winningCard], random);
    case 'fakeHintedCard':
      return random() > 0.5
        ? context.winningCard
        : randomCardIndex([context.winningCard], random);
    case 'fakeHintTone': {
      const hintedCard = context.sceneData.hintedCard;
      return hintedCard === context.winningCard
        ? 'Ладно, сегодня я почти честен.'
        : 'Буду честен. Наверное.';
    }
    case 'winningCard':
      return context.winningCard;
    case 'selectedCard':
      return context.selectedCard;
    case 'selectedCardOrRevealIndex':
      return context.sceneData.revealIndex ?? context.selectedCard;
    case 'revealOutcome': {
      const revealIndex = context.sceneData.revealIndex ?? context.selectedCard;
      return revealIndex === context.winningCard ? 'win' : 'lose';
    }
    case 'revealCoinDelta': {
      const outcome = resolveHelper(context, 'revealOutcome', random);
      const isLastWin = context.stats.streak > 0;
      if (outcome === 'win') {
        const winAmount = context.currentStakes.win;
        return isLastWin ? winAmount * 2 : winAmount;
      }
      return -1;
    }
    case 'bribeIsWinningCard':
      return context.selectedCard === context.winningCard;
    default:
      return undefined;
  }
}

function evaluateGuard(
  guard: GameGuard,
  context: MachineContext,
  graph: GameGraph,
  random: () => number,
  event?: MachineEvent,
): boolean {
  switch (guard.op) {
    case 'all':
      return guard.guards.every((entry) => evaluateGuard(entry, context, graph, random, event));
    case 'any':
      return guard.guards.some((entry) => evaluateGuard(entry, context, graph, random, event));
    case 'not':
      return !evaluateGuard(guard.guard, context, graph, random, event);
    case 'script-available': {
      const recentIndex = context.stats.recentScripts.lastIndexOf(guard.script);
      if (recentIndex !== -1) {
        const roundsAgo = context.stats.recentScripts.length - recentIndex;
        if (roundsAgo <= guard.cooldown) {
          return false;
        }
      }

      return context.stats.recentScripts.at(-1) !== guard.script;
    }
    default: {
      const left = resolveValue(context, guard.left, random, event);
      const right = resolveValue(context, guard.right, random, event);

      switch (guard.op) {
        case 'eq':
          return left === right;
        case 'ne':
          return left !== right;
        case 'gt':
          return Number(left) > Number(right);
        case 'gte':
          return Number(left) >= Number(right);
        case 'lt':
          return Number(left) < Number(right);
        case 'lte':
          return Number(left) <= Number(right);
        default:
          return false;
      }
    }
  }
}

function getEligibleTransitions(
  node: GameStateNode,
  trigger: GameTransition['trigger'],
  context: MachineContext,
  graph: GameGraph,
  random: () => number,
  event?: MachineEvent,
) {
  return node.transitions
    .filter((transition) => transition.trigger === trigger)
    .filter((transition) =>
      (transition.guards ?? []).every((guard) => evaluateGuard(guard, context, graph, random, event)),
    );
}

function chooseWeightedTransition(transitions: GameTransition[], random: () => number) {
  if (transitions.length <= 1) {
    return transitions[0] ?? null;
  }

  const totalWeight = transitions.reduce((sum, transition) => sum + (transition.weight ?? 1), 0);
  let cursor = random() * totalWeight;

  for (const transition of transitions) {
    cursor -= transition.weight ?? 1;
    if (cursor <= 0) {
      return transition;
    }
  }

  return transitions[transitions.length - 1] ?? null;
}

function applyEffect(
  context: MachineContext,
  effect: GameEffect,
  random: () => number,
  event?: MachineEvent,
): MachineContext {
  switch (effect.type) {
    case 'set-context': {
      const nextContext = structuredClone(context) as MachineContext;
      setPathValue(nextContext as unknown as Record<string, unknown>, effect.key, resolveValue(context, effect.value, random, event));
      return nextContext;
    }
    case 'set-scene-data':
      return {
        ...context,
        sceneData: {
          ...context.sceneData,
          [effect.key]: resolveValue(context, effect.value, random, event) as
            | string
            | number
            | boolean
            | null,
        },
      };
    case 'clear-scene-data':
      return {
        ...context,
        sceneData: {},
      };
    case 'add-coins':
      return {
        ...context,
        coins: context.coins + Number(resolveValue(context, effect.amount, random, event) ?? 0),
      };
    case 'set-stakes':
      return {
        ...context,
        currentStakes: resolveValue(context, effect.value, random, event) as Stakes,
      };
    case 'set-revealed-cards':
      if (effect.mode === 'all-hidden') {
        return { ...context, revealedCards: [false, false, false] };
      }

      if (effect.mode === 'all-revealed') {
        return { ...context, revealedCards: [true, true, true] };
      }

      return {
        ...context,
        revealedCards: getCardIndices().map(
          (cardIndex) => cardIndex === context.sceneData.revealedLoser,
        ) as [boolean, boolean, boolean],
      };
    case 'update-selection-stats': {
      const selectedCard = event && event.type === 'card-selected' ? event.cardIndex : context.selectedCard;
      if (selectedCard === null) {
        return context;
      }

      const repeatedPickStreak =
        context.stats.lastPickedCard === selectedCard ? context.stats.repeatedPickStreak + 1 : 1;

      return {
        ...context,
        stats: {
          ...context.stats,
          lastPickedCard: selectedCard,
          repeatedPickStreak,
          pickCounts: {
            ...context.stats.pickCounts,
            [selectedCard]: context.stats.pickCounts[selectedCard] + 1,
          },
        },
      };
    }
    case 'update-round-stats': {
      const outcome = resolveValue(context, effect.outcome, random, event);
      const didWin = outcome === 'win';

      return {
        ...context,
        stats: {
          ...context.stats,
          round: context.stats.round + 1,
          wins: context.stats.wins + (didWin ? 1 : 0),
          losses: context.stats.losses + (didWin ? 0 : 1),
          streak: didWin
            ? context.stats.streak >= 0
              ? context.stats.streak + 1
              : 1
            : context.stats.streak <= 0
              ? context.stats.streak - 1
              : -1,
        },
      };
    }
    case 'append-recent-script':
      return {
        ...context,
        stats: {
          ...context.stats,
          recentScripts: appendRecentScript(context.stats.recentScripts, effect.script),
        },
      };
    case 'clear-selection':
      return {
        ...context,
        selectedCard: null,
        currentStakes: BASE_STAKES_VALUE,
        revealedCards: [false, false, false],
        sceneData: {},
      };
    case 'prepare-next-round':
      return {
        ...context,
        winningCard: randomCardIndex([], random),
        selectedCard: null,
        currentStakes: BASE_STAKES_VALUE,
        revealedCards: [false, false, false],
        sceneData: {},
      };
    case 'choose-message':
      return context;
    default:
      return context;
  }
}

function buildTemplateVars(context: MachineContext) {
  const winAmount = context.currentStakes.win;
  const loseAmount = context.currentStakes.lose;

  return {
    coins: context.coins,
    allInWinAmount: context.coins * 2,
    selectedCard: context.selectedCard !== null ? context.selectedCard + 1 : '',
    winningCard: context.winningCard + 1,
    revealedLoser:
      typeof context.sceneData.revealedLoser === 'number'
        ? Number(context.sceneData.revealedLoser) + 1
        : '',
    revealIndex:
      typeof context.sceneData.revealIndex === 'number'
        ? Number(context.sceneData.revealIndex) + 1
        : '',
    resolvedWinningCard:
      typeof context.sceneData.resolvedWinningCard === 'number'
        ? Number(context.sceneData.resolvedWinningCard) + 1
        : '',
    otherCard:
      typeof context.sceneData.otherCard === 'number' ? Number(context.sceneData.otherCard) + 1 : '',
    hintedCard:
      typeof context.sceneData.hintedCard === 'number'
        ? Number(context.sceneData.hintedCard) + 1
        : '',
    hintTone: context.sceneData.hintTone ?? '',
    winAmount,
    loseAmount,
    ...Object.fromEntries(
      Object.entries(context.sceneData).map(([key, value]) => {
        if (
          typeof value === 'number' &&
          ['revealedLoser', 'otherCard', 'hintedCard', 'revealIndex', 'resolvedWinningCard'].includes(key)
        ) {
          return [key, value + 1];
        }

        return [key, value];
      }),
    ),
  };
}

function renderTemplate(template: string, context: MachineContext) {
  const vars = buildTemplateVars(context);

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => String(vars[key as keyof typeof vars] ?? ''));
}

function chooseMessage(node: GameStateNode, context: MachineContext, graph: GameGraph, random: () => number) {
  const groups = (node.messages ?? []).filter((group) =>
    (group.guards ?? []).every((guard) => evaluateGuard(guard, context, graph, random)),
  );
  const templates = groups.flatMap((group) => group.templates);

  if (templates.length === 0) {
    return '';
  }

  return renderTemplate(randomFrom(templates, random), context);
}

function buildButtons(node: GameStateNode, context: MachineContext, graph: GameGraph, random: () => number): DialogButton[] {
  return getEligibleTransitions(node, 'action', context, graph, random)
    .filter((transition) => transition.actionId && transition.label)
    .map((transition) => ({
      id: transition.id,
      label: renderTemplate(transition.label as string, context),
      action: { type: 'graph-action', actionId: transition.actionId as string },
    }));
}

function getPendingAutoTransition(
  node: GameStateNode,
  context: MachineContext,
  graph: GameGraph,
  random: () => number,
): PendingAutoTransition | null {
  const delayed = getEligibleTransitions(node, 'auto', context, graph, random).filter(
    (transition) => transition.delayMs && transition.delayMs > 0,
  );
  const chosen = chooseWeightedTransition(delayed, random);

  return chosen ? { transitionId: chosen.id, delayMs: chosen.delayMs as number } : null;
}

function enterNode(
  graph: GameGraph,
  currentState: MachineState,
  nodeId: GameNodeId,
  random: () => number,
  event?: MachineEvent,
): MachineState {
  const node = graph.states[nodeId];
  let nextContext = currentState.context;

  for (const effect of node.entryEffects ?? []) {
    nextContext = applyEffect(nextContext, effect, random, event);
  }

  if (node.scriptId) {
    nextContext = applyEffect(
      nextContext,
      { type: 'append-recent-script', script: node.scriptId },
      random,
      event,
    );
  }

  const immediateAuto = chooseWeightedTransition(
    getEligibleTransitions(node, 'auto', nextContext, graph, random).filter(
      (transition) => !transition.delayMs || transition.delayMs <= 0,
    ),
    random,
  );

  if (immediateAuto) {
    return transitionTo(graph, { currentNodeId: nodeId, context: nextContext, dealerMessage: '', pendingAutoTransition: null }, immediateAuto, random, event);
  }

  return {
    currentNodeId: nodeId,
    context: nextContext,
    dealerMessage: chooseMessage(node, nextContext, graph, random),
    pendingAutoTransition: getPendingAutoTransition(node, nextContext, graph, random),
  };
}

export function enterNodeById(
  state: MachineState,
  nodeId: GameNodeId,
  options: MachineDispatchOptions = {},
  graph: GameGraph = gameGraph,
) {
  const random = options.random ?? Math.random;
  return enterNode(graph, state, nodeId, random);
}

function transitionTo(
  graph: GameGraph,
  currentState: MachineState,
  transition: GameTransition,
  random: () => number,
  event?: MachineEvent,
) {
  let nextContext = currentState.context;

  for (const effect of transition.effects ?? []) {
    nextContext = applyEffect(nextContext, effect, random, event);
  }

  return enterNode(
    graph,
    {
      currentNodeId: currentState.currentNodeId,
      context: nextContext,
      dealerMessage: currentState.dealerMessage,
      pendingAutoTransition: null,
    },
    transition.target,
    random,
    event,
  );
}

export function createInitialMachineState(
  options: MachineDispatchOptions = {},
  graph: GameGraph = gameGraph,
): MachineState {
  const random = options.random ?? Math.random;
  const initialContext: MachineContext = {
    coins: 10,
    winningCard: randomCardIndex([], random),
    selectedCard: null,
    revealedCards: [false, false, false],
    currentStakes: BASE_STAKES_VALUE,
    sceneData: {},
    stats: {
      round: 0,
      wins: 0,
      losses: 0,
      streak: 0,
      lastPickedCard: null,
      repeatedPickStreak: 0,
      pickCounts: { 0: 0, 1: 0, 2: 0 },
      recentScripts: [],
    },
  };

  return enterNode(
    graph,
    {
      currentNodeId: graph.initialNodeId,
      context: initialContext,
      dealerMessage: '',
      pendingAutoTransition: null,
    },
    graph.initialNodeId,
    random,
  );
}

export function dispatchMachineEvent(
  state: MachineState,
  event: MachineEvent,
  options: MachineDispatchOptions = {},
  graph: GameGraph = gameGraph,
): MachineState {
  const random = options.random ?? Math.random;
  const node = graph.states[state.currentNodeId];

  const eligibleTransitions =
    event.type === 'card-selected'
      ? getEligibleTransitions(node, 'card-selected', state.context, graph, random, event)
      : event.type === 'auto'
        ? getEligibleTransitions(node, 'auto', state.context, graph, random, event).filter(
            (transition) => transition.id === event.transitionId,
          )
        : getEligibleTransitions(node, 'action', state.context, graph, random, event).filter(
            (transition) => transition.actionId === event.actionId,
          );

  const transition = chooseWeightedTransition(eligibleTransitions, random);
  if (!transition) {
    return state;
  }

  return transitionTo(graph, state, transition, random, event);
}

export function getViewModel(
  state: MachineState,
  options: MachineDispatchOptions = {},
  graph: GameGraph = gameGraph,
): GameViewModel {
  const random = options.random ?? Math.random;
  const node = graph.states[state.currentNodeId];

  return {
    coins: state.context.coins,
    winningCard: state.context.winningCard,
    selectedCard: state.context.selectedCard,
    revealedCards: state.context.revealedCards,
    dealerMessage: state.dealerMessage,
    gameState: node.phase,
    dialogButtons: buildButtons(node, state.context, graph, random),
    currentStakes: state.context.currentStakes,
  };
}

export function getGraphContractIssues(graph: GameGraph = gameGraph) {
  const issues: string[] = [];

  for (const [nodeId, node] of Object.entries(graph.states)) {
    for (const transition of node.transitions) {
      if (!graph.states[transition.target]) {
        issues.push(`Unknown target "${transition.target}" from "${nodeId}"`);
      }
    }

    const hasActions = node.transitions.some((transition) => transition.trigger === 'action');
    const hasAuto = node.transitions.some((transition) => transition.trigger === 'auto');
    const hasCards = node.transitions.some((transition) => transition.trigger === 'card-selected');

    if (node.phase !== 'game-over' && !hasActions && !hasAuto && !hasCards) {
      issues.push(`Non-terminal node "${nodeId}" has no outgoing transitions`);
    }
  }

  return issues;
}
