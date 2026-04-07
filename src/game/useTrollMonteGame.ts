import { useEffect, useState } from 'react';

import {
  appendRecentScript,
  buildIdleMessage,
  buildRevealMessage,
  deriveDealerMood,
  pickScene,
  randomCardIndex,
} from './dialogue';
import type { CardIndex, DialogAction, DialogButton, GameState, GameStats, Stakes, TrollScript } from './types';

const BASE_STAKES: Stakes = { win: 2, lose: 1 };
const STARTING_COINS = 10;
const IDLE_MESSAGE =
  'Добро пожаловать в Тролль-Монте. Найди выигрышную карту. Спойлер: ты не сможешь.';
const GAME_OVER_MESSAGE =
  'Ну всё, касса пуста. Ты официально проиграл даже самому простому лохотрону, так что шоу окончено. Возвращайся, когда найдёшь хоть одну монетку и немного достоинства.';

function createDialogButton(id: string, label: string, action: DialogAction): DialogButton {
  return { id, label, action };
}

function createInitialStats(): GameStats {
  return {
    round: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    lastPickedCard: null,
    repeatedPickStreak: 0,
    pickCounts: { 0: 0, 1: 0, 2: 0 },
    recentScripts: [],
  };
}

export function useTrollMonteGame() {
  const [coins, setCoins] = useState(STARTING_COINS);
  const [winningCard, setWinningCard] = useState<CardIndex>(randomCardIndex());
  const [selectedCard, setSelectedCard] = useState<CardIndex | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [dealerMessage, setDealerMessage] = useState(IDLE_MESSAGE);
  const [currentStakes, setCurrentStakes] = useState<Stakes>(BASE_STAKES);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);
  const [dialogButtons, setDialogButtons] = useState<DialogButton[]>([]);
  const [activeScript, setActiveScript] = useState<TrollScript | null>(null);
  const [stats, setStats] = useState<GameStats>(createInitialStats);

  const dealerMood = deriveDealerMood(coins, stats.streak);

  useEffect(() => {
    if (gameState !== 'idle') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setDealerMessage(buildIdleMessage(coins, dealerMood, stats.repeatedPickStreak));
    }, 5000);

    return () => window.clearInterval(interval);
  }, [coins, dealerMood, gameState, stats.repeatedPickStreak]);

  useEffect(() => {
    if (coins > 0 || gameState === 'game-over') {
      return;
    }

    setSelectedCard(null);
    setGameState('game-over');
    setDealerMessage(GAME_OVER_MESSAGE);
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setActiveScript(null);
  }, [coins, gameState]);

  useEffect(() => {
    if (activeScript !== 'timeout' || gameState !== 'troll' || selectedCard === null) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCoins((value) => value - 1);
      setSelectedCard(null);
      setGameState('idle');
      setDealerMessage('Время вышло. Я забрал 1 монетку за нерешительность. Выбирай снова.');
      setCurrentStakes(BASE_STAKES);
      setRevealedCards([false, false, false]);
      setDialogButtons([]);
      setActiveScript(null);
      setStats((current) => ({
        ...current,
        round: current.round + 1,
        losses: current.losses + 1,
        streak: current.streak > 0 ? -1 : current.streak - 1,
      }));
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [activeScript, gameState, selectedCard]);

  const reveal = (finalIndex: CardIndex, stakes = currentStakes) => {
    const didWin = finalIndex === winningCard;

    setSelectedCard(finalIndex);
    setGameState('reveal');
    setRevealedCards([true, true, true]);
    setCurrentStakes(stakes);
    setActiveScript(null);
    setStats((current) => ({
      ...current,
      round: current.round + 1,
      wins: current.wins + (didWin ? 1 : 0),
      losses: current.losses + (didWin ? 0 : 1),
      streak: didWin
        ? current.streak >= 0
          ? current.streak + 1
          : 1
        : current.streak <= 0
          ? current.streak - 1
          : -1,
    }));

    if (didWin) {
      setCoins((value) => value + stakes.win);
    } else {
      setCoins((value) => value - stakes.lose);
    }

    setDealerMessage(buildRevealMessage(finalIndex, winningCard, stakes));
    setDialogButtons([createDialogButton('play-again', 'Играть снова', { type: 'reset-game' })]);
  };

  const cancelSelection = () => {
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage('Передумал? Типично. Выбирай снова.');
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setActiveScript(null);
  };

  const resetGame = () => {
    if (coins <= 0) {
      setGameState('game-over');
      setDealerMessage(GAME_OVER_MESSAGE);
      setDialogButtons([]);
      setActiveScript(null);
      return;
    }

    setWinningCard(randomCardIndex());
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage(buildIdleMessage(coins, dealerMood, stats.repeatedPickStreak));
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setActiveScript(null);
  };

  const runTrollScript = (index: CardIndex) => {
    const nextStats = {
      ...stats,
      lastPickedCard: index,
      repeatedPickStreak: stats.lastPickedCard === index ? stats.repeatedPickStreak + 1 : 1,
      pickCounts: {
        ...stats.pickCounts,
        [index]: stats.pickCounts[index] + 1,
      },
    };

    const outcome = pickScene({
      coins,
      selectedCard: index,
      winningCard,
      stats: nextStats,
      dealerMood,
    });

    setStats({
      ...nextStats,
      recentScripts: appendRecentScript(nextStats.recentScripts, outcome.script),
    });
    setActiveScript(outcome.script);
    setDealerMessage(outcome.message);
    setDialogButtons(outcome.buttons);
    setRevealedCards(outcome.revealedCards ?? [false, false, false]);

    if (outcome.nextWinningCard !== undefined) {
      setWinningCard(outcome.nextWinningCard);
    }
  };

  const selectCard = (index: CardIndex) => {
    if (gameState !== 'idle') {
      return;
    }

    setSelectedCard(index);
    setGameState('troll');
    setRevealedCards([false, false, false]);
    setCurrentStakes(BASE_STAKES);
    runTrollScript(index);
  };

  const handleDialogAction = (action: DialogAction) => {
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

      case 'pay-bribe':
        setCoins((value) => value - 1);
        setActiveScript(null);

        if (action.index === winningCard) {
          setDealerMessage('Ага, она выигрышная. Не благодари.');
          setDialogButtons([
            createDialogButton(`bribe-reveal-${action.index}`, 'Открывай!', {
              type: 'reveal',
              index: action.index,
            }),
          ]);
          return;
        }

        setDealerMessage('Не-а, она проигрышная. Рад, что заплатил мне? Выбирай другую.');
        setDialogButtons([
          createDialogButton('bribe-reset', 'Выбрать другую', { type: 'cancel-selection' }),
        ]);
        return;
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
  };
}
