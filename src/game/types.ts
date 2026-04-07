export type CardIndex = 0 | 1 | 2;

export type GameState = 'idle' | 'troll' | 'reveal';

export type TrollScript =
  | 'are_you_sure'
  | 'monty_hall'
  | 'raise_stakes'
  | 'fake_hint'
  | 'insult'
  | 'swap_cards'
  | 'timeout'
  | 'bribe'
  | 'all_in';

export type Stakes = {
  win: number;
  lose: number;
};

export type DealerMood = 'smug' | 'predatory' | 'chaotic';

export type DialogAction =
  | { type: 'reveal'; index: CardIndex; stakes?: Stakes }
  | { type: 'cancel-selection' }
  | { type: 'reset-game' }
  | { type: 'pay-bribe'; index: CardIndex };

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
  recentScripts: TrollScript[];
};

export type SceneContext = {
  coins: number;
  selectedCard: CardIndex;
  winningCard: CardIndex;
  stats: GameStats;
  dealerMood: DealerMood;
};

export type SceneOutcome = {
  script: TrollScript;
  message: string;
  buttons: DialogButton[];
  revealedCards?: boolean[];
  nextWinningCard?: CardIndex;
  timeoutMs?: number;
};
