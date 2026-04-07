import { useEffect, useState } from 'react';

import type { CardIndex, DialogAction, DialogButton, GameState, Stakes, TrollScript } from './types';

const CARD_INDICES: CardIndex[] = [0, 1, 2];
const BASE_STAKES: Stakes = { win: 2, lose: 1 };
const STARTING_COINS = 10;
const IDLE_MESSAGE =
  'Добро пожаловать в Тролль-Монте. Найди выигрышную карту. Спойлер: ты не сможешь.';

function randomCardIndex(excluded: CardIndex[] = []): CardIndex {
  const available = CARD_INDICES.filter((index) => !excluded.includes(index));
  return available[Math.floor(Math.random() * available.length)] ?? 0;
}

function randomFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createDialogButton(id: string, label: string, action: DialogAction): DialogButton {
  return { id, label, action };
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

  useEffect(() => {
    if (gameState !== 'idle') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const messages = [
        'Выбирай карту. Любую. Я обещаю, что не буду мухлевать. Почти.',
        'Средняя выглядит сочно. Или это ловушка?',
        'Я бы не советовал брать левую.',
        'Ты будешь выбирать или так и будешь пялиться?',
        'По статистике, ты сейчас проиграешь.',
        'Я положил выигрышную карту справа. Или нет?',
        'Моя бабушка играет быстрее тебя.',
        'Я чую твой страх.',
        'Интересный факт: в 66% случаев ты проигрываешь.',
        'Не говорю, что вторая карта плохая, но она ужасная.',
      ];

      if (coins < 0) {
        messages.push('Ты мне должен денег. Выбирай осторожно.');
        messages.push('Играем в кредит, да?');
      }

      setDealerMessage(randomFrom(messages));
    }, 5000);

    return () => window.clearInterval(interval);
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
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [activeScript, gameState, selectedCard]);

  const reveal = (finalIndex: CardIndex, stakes = currentStakes) => {
    setSelectedCard(finalIndex);
    setGameState('reveal');
    setRevealedCards([true, true, true]);
    setCurrentStakes(stakes);
    setActiveScript(null);

    if (finalIndex === winningCard) {
      setCoins((value) => value + stakes.win);
      setDealerMessage(
        `Уф. Карта ${finalIndex + 1} оказалась верной. Вот твои ${stakes.win} монеток. Не привыкай к этому.`,
      );
    } else {
      setCoins((value) => value - stakes.lose);
      setDealerMessage(
        `ХАХАХА! Карта ${finalIndex + 1} — проигрышная! Победителем была Карта ${winningCard + 1}. Спасибо за ${stakes.lose} монетку(и)!`,
      );
    }

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
    setWinningCard(randomCardIndex());
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage('Давай еще раз. Я готов забрать больше твоих монеток.');
    setCurrentStakes(BASE_STAKES);
    setRevealedCards([false, false, false]);
    setDialogButtons([]);
    setActiveScript(null);
  };

  const runTrollScript = (script: TrollScript, index: CardIndex) => {
    setActiveScript(script);

    switch (script) {
      case 'are_you_sure':
        setDealerMessage(
          `Карта ${index + 1}? Серьезно? Я был уверен, что ты выберешь другую. Ты абсолютно уверен?`,
        );
        setDialogButtons([
          createDialogButton('confirm-selection', 'Да, уверен!', { type: 'reveal', index }),
          createDialogButton('change-mind', 'Стой, дай поменять', { type: 'cancel-selection' }),
        ]);
        return;

      case 'monty_hall': {
        const revealedLoser = randomCardIndex([index, winningCard]);
        const otherCard = CARD_INDICES.find(
          (cardIndex) => cardIndex !== index && cardIndex !== revealedLoser,
        ) as CardIndex;

        setRevealedCards([0, 1, 2].map((cardIndex) => cardIndex === revealedLoser));
        setDealerMessage(
          `Интересно. Давай я тебе помогу. Карта ${revealedLoser + 1} — проигрышная. Хочешь поменять свой выбор на Карту ${otherCard + 1}?`,
        );
        setDialogButtons([
          createDialogButton(`switch-${otherCard}`, `Поменять на Карту ${otherCard + 1}`, {
            type: 'reveal',
            index: otherCard,
          }),
          createDialogButton(`stay-${index}`, `Оставить Карту ${index + 1}`, {
            type: 'reveal',
            index,
          }),
        ]);
        return;
      }

      case 'raise_stakes': {
        const raisedStakes = { win: 4, lose: 2 };
        setDealerMessage(
          'Ты выглядишь уверенно. Слишком уверенно. Давай удвоим ставки? Выиграешь — получишь +4, проиграешь — отдашь -2. Идет?',
        );
        setDialogButtons([
          createDialogButton('raise-stakes', 'Удваиваем!', {
            type: 'reveal',
            index,
            stakes: raisedStakes,
          }),
          createDialogButton('base-stakes', 'Нет, обычные ставки', { type: 'reveal', index }),
        ]);
        return;
      }

      case 'fake_hint': {
        const isHonest = Math.random() > 0.5;
        const hintedCard = isHonest ? winningCard : randomCardIndex([winningCard]);
        const hintTone = isHonest ? 'Ладно, сегодня я почти честен.' : 'Буду честен. Наверное.';

        setDealerMessage(
          `${hintTone} Выигрышная карта — это Карта ${hintedCard + 1}. Хочешь поменять свой выбор на нее?`,
        );
        setDialogButtons([
          createDialogButton(`hint-switch-${hintedCard}`, `Поменять на Карту ${hintedCard + 1}`, {
            type: 'reveal',
            index: hintedCard,
          }),
          createDialogButton(`hint-stay-${index}`, `Оставить Карту ${index + 1}`, {
            type: 'reveal',
            index,
          }),
        ]);
        return;
      }

      case 'insult':
        setDealerMessage(
          `Карта ${index + 1}. Классический выбор для тех, кто любит терять деньги. Последний шанс передумать.`,
        );
        setDialogButtons([
          createDialogButton(`insult-stay-${index}`, `Я сказал Карта ${index + 1}`, {
            type: 'reveal',
            index,
          }),
          createDialogButton('insult-cancel', 'Дай подумать', { type: 'cancel-selection' }),
        ]);
        return;

      case 'bribe':
        setDealerMessage(
          `Псс. Дай мне 1 монетку, и я скажу тебе, выигрышная ли Карта ${index + 1}, до того как ты ее откроешь.`,
        );
        setDialogButtons([
          createDialogButton(`pay-bribe-${index}`, 'Заплатить 1 монетку', {
            type: 'pay-bribe',
            index,
          }),
          createDialogButton(`skip-bribe-${index}`, 'Никаких взяток, открывай', {
            type: 'reveal',
            index,
          }),
        ]);
        return;

      case 'all_in': {
        const allInStakes = { win: coins * 2, lose: coins };
        setDealerMessage(
          `Чувствуешь удачу? Ставь ВСЕ свои ${coins} монеток. Выиграешь — получишь ${coins * 2}! Проиграешь — останешься ни с чем.`,
        );
        setDialogButtons([
          createDialogButton('all-in', 'ВА-БАНК!', {
            type: 'reveal',
            index,
            stakes: allInStakes,
          }),
          createDialogButton('all-in-skip', 'Слишком страшно, обычная ставка', {
            type: 'reveal',
            index,
          }),
        ]);
        return;
      }

      case 'swap_cards': {
        const nextWinningCard = randomCardIndex([winningCard]);
        setWinningCard(nextWinningCard);
        setDealerMessage(
          `*Вжух* Я только что перемешал карты силой мысли. Ты все еще выбираешь Карту ${index + 1}?`,
        );
        setDialogButtons([
          createDialogButton('swap-open', 'Я доверяю интуиции. Открывай.', {
            type: 'reveal',
            index,
          }),
          createDialogButton('swap-cancel', 'Дай выбрать снова', { type: 'cancel-selection' }),
        ]);
        return;
      }

      case 'timeout':
        setDealerMessage(
          'Быстро! У тебя есть 3 секунды, чтобы подтвердить выбор. Иначе я заберу 1 монетку за тормоза.',
        );
        setDialogButtons([
          createDialogButton('timeout-confirm', 'ПОДТВЕРЖДАЮ!', { type: 'reveal', index }),
          createDialogButton('timeout-cancel', 'ПОМЕНЯТЬ!', { type: 'cancel-selection' }),
        ]);
        return;
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

    const availableScripts: TrollScript[] = [
      'are_you_sure',
      'monty_hall',
      'raise_stakes',
      'fake_hint',
      'insult',
      'swap_cards',
      'timeout',
    ];

    if (coins >= 1) {
      availableScripts.push('bribe');
    }

    if (coins > 0) {
      availableScripts.push('all_in');
    }

    runTrollScript(randomFrom(availableScripts), index);
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
