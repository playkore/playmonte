import { useState } from 'react';

import {
  buildBribeResultContext,
  buildRevealResultContext,
  buildSelectionContext,
  requestDealerDecision,
} from './dealer';
import type { CardIndex, DialogAction, DialogButton, GameConfig, GameState, Stakes } from './types';

const CARD_INDICES: CardIndex[] = [0, 1, 2];
const BASE_STAKES: Stakes = { win: 2, lose: 1 };
const STARTING_COINS = 10;
const IDLE_MESSAGE =
  'Добро пожаловать в Тролль-Монте. Выбери карту, а потом дай дилеру придумать, как испортить тебе жизнь.';

function randomCardIndex(): CardIndex {
  return CARD_INDICES[Math.floor(Math.random() * CARD_INDICES.length)] ?? 0;
}

function createDialogButton(id: string, label: string, action: DialogAction): DialogButton {
  return { id, label, action };
}

export function useTrollMonteGame(config: GameConfig) {
  const [coins, setCoins] = useState(STARTING_COINS);
  const [winningCard, setWinningCard] = useState<CardIndex>(randomCardIndex());
  const [selectedCard, setSelectedCard] = useState<CardIndex | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [dealerMessage, setDealerMessage] = useState(IDLE_MESSAGE);
  const [currentStakes, setCurrentStakes] = useState<Stakes>(BASE_STAKES);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);
  const [dialogButtons, setDialogButtons] = useState<DialogButton[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const applyDealerDecision = (message: string, buttons: DialogButton[]) => {
    setDealerMessage(message);
    setDialogButtons(buttons);
  };

  const handleDealerError = (error: unknown) => {
    const fallbackMessage =
      error instanceof Error ? error.message : 'Не удалось получить ответ от дилера.';

    setStatusMessage(fallbackMessage);
    setDealerMessage('Дилер подавился токенами. Попробуй еще раз или проверь API key.');
    setDialogButtons([
      createDialogButton('fallback-open', 'Просто открыть карту', {
        type: 'reveal',
        index: selectedCard ?? 0,
        stakes: BASE_STAKES,
      }),
      createDialogButton('fallback-cancel', 'Выбрать заново', { type: 'cancel-selection' }),
    ]);
  };

  const askDealerForSelection = async (index: CardIndex) => {
    setIsThinking(true);
    setStatusMessage('');

    try {
      const decision = await requestDealerDecision({
        apiKey: config.apiKey,
        model: config.model,
        context: buildSelectionContext({
          coins,
          selectedCard: index,
          winningCard,
          currentStakes: BASE_STAKES,
          allowBribe: coins >= 1,
        }),
      });

      applyDealerDecision(decision.message, decision.buttons);
    } catch (error) {
      handleDealerError(error);
    } finally {
      setIsThinking(false);
    }
  };

  const askDealerForBribeResult = async (
    index: CardIndex,
    bribeTruth: 'winner' | 'loser',
    nextCoins: number,
  ) => {
    setIsThinking(true);
    setStatusMessage('');

    try {
      const decision = await requestDealerDecision({
        apiKey: config.apiKey,
        model: config.model,
        context: buildBribeResultContext({
          coins: nextCoins,
          selectedCard: index,
          winningCard,
          currentStakes,
          bribeTruth,
        }),
      });

      applyDealerDecision(decision.message, decision.buttons);
    } catch (error) {
      handleDealerError(error);
    } finally {
      setIsThinking(false);
    }
  };

  const askDealerForRevealResult = async (
    finalIndex: CardIndex,
    stakes: Stakes,
    result: 'win' | 'lose',
    nextCoins: number,
    resolvedWinningCard: CardIndex,
  ) => {
    setIsThinking(true);
    setStatusMessage('');

    try {
      const decision = await requestDealerDecision({
        apiKey: config.apiKey,
        model: config.model,
        context: buildRevealResultContext({
          coins: nextCoins,
          selectedCard: finalIndex,
          winningCard: resolvedWinningCard,
          currentStakes: stakes,
          result,
        }),
      });

      applyDealerDecision(decision.message, decision.buttons);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Не удалось получить итоговую реплику.');
      setDialogButtons([createDialogButton('play-again', 'Играть снова', { type: 'reset-game' })]);
    } finally {
      setIsThinking(false);
    }
  };

  const reveal = (finalIndex: CardIndex, stakes = currentStakes) => {
    const resolvedWinningCard = winningCard;
    const didWin = finalIndex === resolvedWinningCard;
    const nextCoins = didWin ? coins + stakes.win : coins - stakes.lose;

    setSelectedCard(finalIndex);
    setGameState('reveal');
    setRevealedCards([true, true, true]);
    setCurrentStakes(stakes);
    setCoins(nextCoins);
    setDialogButtons([]);

    void askDealerForRevealResult(
      finalIndex,
      stakes,
      didWin ? 'win' : 'lose',
      nextCoins,
      resolvedWinningCard,
    );
  };

  const cancelSelection = () => {
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage('Передумал? Ладно. Выбирай заново.');
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setStatusMessage('');
  };

  const resetGame = () => {
    setWinningCard(randomCardIndex());
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage('Новый раунд. На этот раз у тебя снова плохие шансы.');
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setStatusMessage('');
  };

  const selectCard = (index: CardIndex) => {
    if (gameState !== 'idle' || isThinking) {
      return;
    }

    if (!config.apiKey.trim()) {
      setStatusMessage('Сначала вставь OpenAI API key.');
      setDealerMessage('Без API key я даже троллить тебя ленюсь.');
      return;
    }

    setSelectedCard(index);
    setGameState('troll');
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    void askDealerForSelection(index);
  };

  const handleDialogAction = (action: DialogAction) => {
    if (isThinking) {
      return;
    }

    switch (action.type) {
      case 'reveal':
        reveal(action.index, action.stakes ?? BASE_STAKES);
        return;

      case 'cancel-selection':
        cancelSelection();
        return;

      case 'reset-game':
        resetGame();
        return;

      case 'pay-bribe': {
        const nextCoins = coins - 1;
        const bribeTruth = action.index === winningCard ? 'winner' : 'loser';

        setCoins(nextCoins);
        setCurrentStakes(BASE_STAKES);
        setDialogButtons([]);
        void askDealerForBribeResult(action.index, bribeTruth, nextCoins);
      }
    }
  };

  return {
    coins,
    winningCard,
    selectedCard,
    revealedCards,
    dealerMessage,
    gameState,
    dialogButtons,
    currentStakes,
    selectCard,
    cancelSelection,
    handleDialogAction,
    resetGame,
    isThinking,
    statusMessage,
  };
}
