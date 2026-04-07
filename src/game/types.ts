export type CardIndex = 0 | 1 | 2;

export type GameState = 'idle' | 'troll' | 'reveal' | 'game-over';

export type Stakes = {
  win: number;
  lose: number;
};

export type DealerMood = 'smug' | 'predatory' | 'chaotic';

export type GameNodeId = string;
export type GameActionId = string;
export type GameScriptId = string;

export type DialogAction = {
  type: 'graph-action';
  actionId: GameActionId;
};

export type DialogButton = {
  id: string;
  label: string;
  action: DialogAction;
};

export type GameStats = {
  round: number;
  wins: number;
  losses: number;
  streak: number;
  lastPickedCard: CardIndex | null;
  repeatedPickStreak: number;
  pickCounts: Record<CardIndex, number>;
  recentScripts: GameScriptId[];
};

export type MachineContext = {
  coins: number;
  selectedCard: CardIndex | null;
  winningCard: CardIndex;
  revealedCards: [boolean, boolean, boolean];
  currentStakes: Stakes;
  stats: GameStats;
  sceneData: Record<string, string | number | boolean | null>;
};

export type ValueSource =
  | { from: 'context'; key: string }
  | { from: 'scene'; key: string }
  | { from: 'action'; key: string }
  | { helper: GameHelperName }
  | string
  | number
  | boolean
  | null
  | Stakes;

export type GameGuard =
  | { op: 'all'; guards: GameGuard[] }
  | { op: 'any'; guards: GameGuard[] }
  | { op: 'not'; guard: GameGuard }
  | { op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; left: ValueSource; right: ValueSource }
  | { op: 'script-available'; script: GameScriptId; cooldown: number };

export type GameHelperName =
  | 'dealerMood'
  | 'actionCardIndex'
  | 'baseStakes'
  | 'raisedStakes'
  | 'allInStakes'
  | 'loserCardExcludingSelectedAndWinner'
  | 'otherRemainingCard'
  | 'nonCurrentWinningCard'
  | 'fakeHintedCard'
  | 'fakeHintTone'
  | 'winningCard'
  | 'selectedCard'
  | 'selectedCardOrRevealIndex'
  | 'revealOutcome'
  | 'revealCoinDelta'
  | 'bribeIsWinningCard';

export type GameEffect =
  | { type: 'set-context'; key: string; value: ValueSource }
  | { type: 'set-scene-data'; key: string; value: ValueSource }
  | { type: 'clear-scene-data' }
  | { type: 'add-coins'; amount: ValueSource }
  | { type: 'set-stakes'; value: ValueSource }
  | { type: 'set-revealed-cards'; mode: 'all-hidden' | 'all-revealed' | 'single-loser' }
  | { type: 'update-selection-stats' }
  | { type: 'update-round-stats'; outcome: ValueSource }
  | { type: 'append-recent-script'; script: GameScriptId }
  | { type: 'clear-selection' }
  | { type: 'prepare-next-round' }
  | { type: 'choose-message' };

export type GameMessageGroup = {
  templates: string[];
  guards?: GameGuard[];
};

export type GameTransition = {
  id: string;
  trigger: 'card-selected' | 'action' | 'auto';
  actionId?: GameActionId;
  label?: string;
  target: GameNodeId;
  delayMs?: number;
  weight?: number;
  guards?: GameGuard[];
  effects?: GameEffect[];
};

export type GameStateNode = {
  id: GameNodeId;
  phase: GameState;
  scriptId?: GameScriptId;
  messages?: GameMessageGroup[];
  entryEffects?: GameEffect[];
  transitions: GameTransition[];
};

export type GameGraph = {
  initialNodeId: GameNodeId;
  states: Record<GameNodeId, GameStateNode>;
};

export type MachineEvent =
  | { type: 'card-selected'; cardIndex: CardIndex }
  | { type: 'action'; actionId: GameActionId }
  | { type: 'auto'; transitionId: string };

export type PendingAutoTransition = {
  transitionId: string;
  delayMs: number;
};

export type MachineState = {
  currentNodeId: GameNodeId;
  context: MachineContext;
  dealerMessage: string;
  pendingAutoTransition: PendingAutoTransition | null;
};

export type MachineDispatchOptions = {
  random?: () => number;
};

export type GameViewModel = {
  coins: number;
  winningCard: CardIndex;
  selectedCard: CardIndex | null;
  revealedCards: [boolean, boolean, boolean];
  dealerMessage: string;
  gameState: GameState;
  dialogButtons: DialogButton[];
  currentStakes: Stakes;
};
