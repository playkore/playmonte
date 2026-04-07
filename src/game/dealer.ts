import { fetchStructuredJson } from '../lib/openai';

import type { CardIndex, DialogAction, DialogButton, Stakes } from './types';

type DealerContext = {
  phase: 'selection' | 'bribe-result' | 'reveal-result';
  coins: number;
  selectedCard: CardIndex | null;
  winningCard: CardIndex;
  currentStakes: Stakes;
  revealedCards: boolean[];
  result?: 'win' | 'lose';
  bribeTruth?: 'winner' | 'loser';
  revealedWinnerCard?: CardIndex;
  allowedActions: DialogActionDescriptor[];
};

type DialogActionDescriptor =
  | {
      type: 'reveal';
      targetCard: CardIndex;
      stakes: Stakes;
      description: string;
    }
  | {
      type: 'cancel-selection';
      description: string;
    }
  | {
      type: 'pay-bribe';
      targetCard: CardIndex;
      description: string;
    }
  | {
      type: 'reset-game';
      description: string;
    };

type DealerDecisionButton = {
  label: string;
  action: {
    type: DialogAction['type'];
    targetCard: CardIndex | null;
    stakes: Stakes | null;
  };
};

type DealerDecision = {
  message: string;
  buttons: DealerDecisionButton[];
};

function toDisplayCard(card: CardIndex | null): number | null {
  return card === null ? null : card + 1;
}

function toDisplayActionDescriptor(action: DialogActionDescriptor) {
  switch (action.type) {
    case 'cancel-selection':
    case 'reset-game':
      return action;

    case 'pay-bribe':
      return {
        ...action,
        targetCard: toDisplayCard(action.targetCard),
      };

    case 'reveal':
      return {
        ...action,
        targetCard: toDisplayCard(action.targetCard),
      };
  }
}

const DEALER_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'buttons'],
  properties: {
    message: {
      type: 'string',
      minLength: 1,
      maxLength: 280,
    },
    buttons: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'action'],
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
          },
          action: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'targetCard', 'stakes'],
            properties: {
              type: {
                type: 'string',
                enum: ['reveal', 'cancel-selection', 'pay-bribe', 'reset-game'],
              },
              targetCard: {
                type: ['integer', 'null'],
                enum: [0, 1, 2, null],
              },
              stakes: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['win', 'lose'],
                    properties: {
                      win: { type: 'integer', minimum: 0, maximum: 1000 },
                      lose: { type: 'integer', minimum: 0, maximum: 1000 },
                    },
                  },
                  {
                    type: 'null',
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
} satisfies Record<string, unknown>;

const DEALER_SYSTEM_PROMPT = `Ты дилер игры "Тролль-Монте". Отвечай только по-русски.
Твоя задача: выдать короткую язвительную реплику и 1-3 кнопки действий.
Всегда возвращай строго JSON по схеме.
Не выдумывай действий, кроме тех, что разрешены в allowedActions.
Если phase = selection, ты можешь троллить, подталкивать к смене карты, предлагать взятку или менять ставки, но только через разрешенные действия.
Если phase = bribe-result, опирайся на правду о выбранной карте.
Если phase = reveal-result, прокомментируй исход и предложи только начать заново.
Не раскрывай технические детали, не упоминай JSON, API, схему или внутренние ограничения.
Тон: злой, ехидный, игровой, но без ненавистнических оскорблений.
Кнопки должны быть понятными и короткими.`;

function buildUserPrompt(context: DealerContext): string {
  return JSON.stringify(
    {
      ...context,
      selectedCard: toDisplayCard(context.selectedCard),
      winningCard: toDisplayCard(context.winningCard),
      revealedWinnerCard: toDisplayCard(context.revealedWinnerCard ?? null),
      allowedActions: context.allowedActions.map(toDisplayActionDescriptor),
    },
    null,
    2,
  );
}

function sameStakes(left: Stakes | undefined, right: Stakes | undefined): boolean {
  return left?.win === right?.win && left?.lose === right?.lose;
}

function isActionAllowed(
  action: DealerDecisionButton['action'],
  allowedActions: DialogActionDescriptor[],
): boolean {
  return allowedActions.some((allowed) => {
    if (allowed.type !== action.type) {
      return false;
    }

    if (allowed.type === 'cancel-selection' || allowed.type === 'reset-game') {
      return true;
    }

    if (allowed.type === 'pay-bribe') {
      return allowed.targetCard === action.targetCard;
    }

    return allowed.targetCard === action.targetCard && sameStakes(allowed.stakes, action.stakes);
  });
}

function toDialogAction(button: DealerDecisionButton): DialogAction {
  switch (button.action.type) {
    case 'cancel-selection':
      return { type: 'cancel-selection' };

    case 'reset-game':
      return { type: 'reset-game' };

    case 'pay-bribe':
      return { type: 'pay-bribe', index: button.action.targetCard ?? 0 };

    case 'reveal':
      return {
        type: 'reveal',
        index: button.action.targetCard ?? 0,
        stakes: button.action.stakes,
      };
  }
}

function normalizeDecision(
  decision: DealerDecision,
  allowedActions: DialogActionDescriptor[],
): DialogButton[] {
  const buttons = decision.buttons
    .filter((button) => isActionAllowed(button.action, allowedActions))
    .slice(0, 3)
    .map((button, index) => ({
      id: `${button.action.type}-${index}-${button.label}`,
      label: button.label.trim(),
      action: toDialogAction(button),
    }));

  if (buttons.length === 0) {
    throw new Error('Model returned no valid actions.');
  }

  return buttons;
}

export async function requestDealerDecision(params: {
  apiKey: string;
  model: string;
  context: DealerContext;
}): Promise<{ message: string; buttons: DialogButton[] }> {
  const decision = await fetchStructuredJson<DealerDecision>({
    apiKey: params.apiKey,
    model: params.model,
    systemPrompt: DEALER_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(params.context),
    schemaName: 'trollmonte_dealer_turn',
    schema: DEALER_RESPONSE_SCHEMA,
  });

  return {
    message: decision.message.trim(),
    buttons: normalizeDecision(decision, params.context.allowedActions),
  };
}

export function buildRevealAction(
  targetCard: CardIndex,
  stakes: Stakes,
  description: string,
): DialogActionDescriptor {
  return {
    type: 'reveal',
    targetCard,
    stakes,
    description,
  };
}

export function buildSelectionContext(params: {
  coins: number;
  selectedCard: CardIndex;
  winningCard: CardIndex;
  currentStakes: Stakes;
  allowBribe: boolean;
}): DealerContext {
  const { coins, selectedCard, winningCard, currentStakes, allowBribe } = params;
  const otherCards = [0, 1, 2].filter((card) => card !== selectedCard) as CardIndex[];
  const allowedActions: DialogActionDescriptor[] = [
    buildRevealAction(selectedCard, currentStakes, 'Открыть текущую выбранную карту с обычными ставками.'),
    ...otherCards.map((card) =>
      buildRevealAction(card, currentStakes, 'Предложить игроку сменить выбор и открыть другую карту.'),
    ),
    buildRevealAction(selectedCard, { win: 4, lose: 2 }, 'Предложить удвоенные ставки на текущую карту.'),
    { type: 'cancel-selection', description: 'Разрешить отказаться от выбора и выбрать заново.' },
  ];

  if (coins > 0) {
    allowedActions.push(
      buildRevealAction(
        selectedCard,
        { win: coins * 2, lose: coins },
        'Предложить ва-банк на текущую карту.',
      ),
    );
  }

  if (allowBribe) {
    allowedActions.push({
      type: 'pay-bribe',
      targetCard: selectedCard,
      description: 'Взять 1 монетку и затем честно сообщить, выигрышная ли карта.',
    });
  }

  return {
    phase: 'selection',
    coins,
    selectedCard,
    winningCard,
    currentStakes,
    revealedCards: [false, false, false],
    allowedActions,
  };
}

export function buildBribeResultContext(params: {
  coins: number;
  selectedCard: CardIndex;
  winningCard: CardIndex;
  currentStakes: Stakes;
  bribeTruth: 'winner' | 'loser';
}): DealerContext {
  const { coins, selectedCard, winningCard, currentStakes, bribeTruth } = params;

  return {
    phase: 'bribe-result',
    coins,
    selectedCard,
    winningCard,
    currentStakes,
    revealedCards: [false, false, false],
    bribeTruth,
    allowedActions:
      bribeTruth === 'winner'
        ? [
            buildRevealAction(
              selectedCard,
              currentStakes,
              'Открыть ту же карту после того, как дилер подтвердил, что она выигрышная.',
            ),
          ]
        : [{ type: 'cancel-selection', description: 'Разрешить отказаться от карты и выбрать заново.' }],
  };
}

export function buildRevealResultContext(params: {
  coins: number;
  selectedCard: CardIndex;
  winningCard: CardIndex;
  currentStakes: Stakes;
  result: 'win' | 'lose';
}): DealerContext {
  const { coins, selectedCard, winningCard, currentStakes, result } = params;

  return {
    phase: 'reveal-result',
    coins,
    selectedCard,
    winningCard,
    currentStakes,
    revealedCards: [true, true, true],
    result,
    revealedWinnerCard: winningCard,
    allowedActions: [{ type: 'reset-game', description: 'Предложить начать новый раунд.' }],
  };
}
