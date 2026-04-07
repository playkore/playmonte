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
