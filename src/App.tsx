import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Sparkles, Frown, Smile } from 'lucide-react';

const Card = ({ index, isRevealed, isWinner, isSelected, onClick, disabled }: any) => {
  return (
    <motion.div
      className={`relative w-28 h-40 sm:w-40 sm:h-56 rounded-xl cursor-pointer perspective-1000 ${disabled ? 'pointer-events-none' : ''}`}
      onClick={() => onClick(index)}
      whileHover={!disabled ? { scale: 1.05, y: -10 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={{
        y: isSelected ? -20 : 0,
        scale: isSelected ? 1.05 : 1,
      }}
    >
      <motion.div
        className="w-full h-full rounded-xl shadow-2xl preserve-3d"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Front (Face Down) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-800 rounded-xl border-2 border-indigo-400/50 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="text-indigo-300/50 text-5xl sm:text-6xl font-black">{index + 1}</div>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay rounded-xl"></div>
        </div>

        {/* Back (Face Up) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-zinc-100 rounded-xl border-2 border-zinc-300 flex flex-col items-center justify-center">
          {isWinner ? (
            <>
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mb-2" />
              <span className="text-amber-600 font-bold text-lg sm:text-xl">ПОБЕДА</span>
              <span className="text-amber-500 font-black text-xl sm:text-2xl">+</span>
            </>
          ) : (
            <>
              <Frown className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-400 mb-2" />
              <span className="text-zinc-500 font-bold text-lg sm:text-xl">ПРОИГРЫШ</span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const DealerDialog = ({ message, buttons }: any) => {
  return (
    <div className="w-full max-w-2xl mx-auto mt-4 sm:mt-8 p-6 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
          <Smile className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-purple-400 font-bold text-sm mb-1 uppercase tracking-wider">Дилер</h3>
          <div className="min-h-[4rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-zinc-200 text-base sm:text-lg leading-relaxed"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </div>
          
          <AnimatePresence>
            {buttons.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-3 mt-6"
              >
                {buttons.map((btn: any, i: number) => (
                  <button
                    key={i}
                    onClick={btn.action}
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors border border-zinc-700 hover:border-zinc-500 active:scale-95"
                  >
                    {btn.text}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [coins, setCoins] = useState(10);
  const [winningCard, setWinningCard] = useState(Math.floor(Math.random() * 3));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'troll' | 'reveal'>('idle');
  const [dealerMessage, setDealerMessage] = useState("Добро пожаловать в Тролль-Монте. Найди выигрышную карту. Спойлер: ты не сможешь.");
  const [stakes, setStakes] = useState({ win: 2, lose: 1 });
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);
  const [trollButtons, setTrollButtons] = useState<{text: string, action: () => void}[]>([]);

  useEffect(() => {
    if (gameState === 'idle') {
      const interval = setInterval(() => {
        const messages = [
          "Выбирай карту. Любую. Я обещаю, что не буду мухлевать. Почти.",
          "Средняя выглядит сочно. Или это ловушка?",
          "Я бы не советовал брать левую.",
          "Ты будешь выбирать или так и будешь пялиться?",
          "По статистике, ты сейчас проиграешь.",
          "Я положил выигрышную карту справа. Или нет?",
          "Моя бабушка играет быстрее тебя.",
          "Я чую твой страх.",
          "Интересный факт: в 66% случаев ты проигрываешь.",
          "Не говорю, что вторая карта плохая, но она ужасная."
        ];
        if (coins < 0) {
          messages.push("Ты мне должен денег. Выбирай осторожно.");
          messages.push("Играем в кредит, да?");
        }
        setDealerMessage(messages[Math.floor(Math.random() * messages.length)]);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gameState, coins]);

  const handleCardClick = (index: number) => {
    if (gameState !== 'idle') return;
    setSelectedCard(index);
    setGameState('troll');
    
    let availableScripts = [
      'are_you_sure', 
      'monty_hall', 
      'raise_stakes', 
      'fake_hint', 
      'insult', 
      'swap_cards', 
      'timeout'
    ];
    if (coins >= 1) availableScripts.push('bribe');
    if (coins > 0) availableScripts.push('all_in');

    const script = availableScripts[Math.floor(Math.random() * availableScripts.length)];
    runTrollScript(script, index);
  };

  const cancelSelection = () => {
    setSelectedCard(null);
    setGameState('idle');
    setDealerMessage("Передумал? Типично. Выбирай снова.");
    setTrollButtons([]);
    setRevealedCards([false, false, false]);
  };

  const reveal = (finalIndex: number) => {
    setSelectedCard(finalIndex);
    setGameState('reveal');
    setRevealedCards([true, true, true]);
    
    if (finalIndex === winningCard) {
      setCoins(c => c + stakes.win);
      setDealerMessage(`Уф. Карта ${finalIndex + 1} оказалась верной. Вот твои ${stakes.win} монеток. Не привыкай к этому.`);
    } else {
      setCoins(c => c - stakes.lose);
      setDealerMessage(`ХАХАХА! Карта ${finalIndex + 1} — проигрышная! Победителем была Карта ${winningCard + 1}. Спасибо за ${stakes.lose} монетку(и)!`);
    }
    
    setTrollButtons([
      { text: "Играть снова", action: () => resetGame() }
    ]);
  };

  const resetGame = () => {
    setWinningCard(Math.floor(Math.random() * 3));
    setSelectedCard(null);
    setGameState('idle');
    setStakes({ win: 2, lose: 1 });
    setRevealedCards([false, false, false]);
    setTrollButtons([]);
    setDealerMessage("Давай еще раз. Я готов забрать больше твоих монеток.");
  };

  const runTrollScript = (script: string, index: number) => {
    switch (script) {
      case 'are_you_sure':
        setDealerMessage(`Карта ${index + 1}? Серьезно? Я был уверен, что ты выберешь другую. Ты абсолютно уверен?`);
        setTrollButtons([
          { text: "Да, уверен!", action: () => reveal(index) },
          { text: "Стой, дай поменять", action: () => cancelSelection() }
        ]);
        break;
      case 'monty_hall':
        const possibleLosers = [0, 1, 2].filter(i => i !== index && i !== winningCard);
        const revealedLoser = possibleLosers[Math.floor(Math.random() * possibleLosers.length)];
        
        const newRevealed = [...revealedCards];
        newRevealed[revealedLoser] = true;
        setRevealedCards(newRevealed);
        
        const otherCard = [0, 1, 2].find(i => i !== index && i !== revealedLoser);
        
        setDealerMessage(`Интересно. Давай я тебе помогу. Карта ${revealedLoser + 1} — проигрышная. Хочешь поменять свой выбор на Карту ${otherCard! + 1}?`);
        setTrollButtons([
          { text: `Поменять на Карту ${otherCard! + 1}`, action: () => reveal(otherCard!) },
          { text: `Оставить Карту ${index + 1}`, action: () => reveal(index) }
        ]);
        break;
      case 'raise_stakes':
        setDealerMessage(`Ты выглядишь уверенно. Слишком уверенно. Давай удвоим ставки? Выиграешь — получишь +4, проиграешь — отдашь -2. Идет?`);
        setTrollButtons([
          { text: "Удваиваем!", action: () => { setStakes({win: 4, lose: 2}); reveal(index); } },
          { text: "Нет, обычные ставки", action: () => reveal(index) }
        ]);
        break;
      case 'fake_hint':
        const isLying = Math.random() > 0.5;
        const hintedCard = isLying ? (index === winningCard ? (index + 1) % 3 : winningCard) : winningCard;
        setDealerMessage(`Буду честен. Выигрышная карта — это Карта ${hintedCard + 1}. Хочешь поменять свой выбор на нее?`);
        setTrollButtons([
          { text: `Поменять на Карту ${hintedCard + 1}`, action: () => reveal(hintedCard) },
          { text: `Оставить Карту ${index + 1}`, action: () => reveal(index) }
        ]);
        break;
      case 'insult':
        setDealerMessage(`Карта ${index + 1}. Классический выбор для тех, кто любит терять деньги. Последний шанс передумать.`);
        setTrollButtons([
          { text: `Я сказал Карта ${index + 1}`, action: () => reveal(index) },
          { text: "Дай подумать", action: () => cancelSelection() }
        ]);
        break;
      case 'bribe':
        setDealerMessage(`Псс. Дай мне 1 монетку, и я скажу тебе, выигрышная ли Карта ${index + 1}, до того как ты ее откроешь.`);
        setTrollButtons([
          { text: "Заплатить 1 монетку", action: () => {
              setCoins(c => c - 1);
              if (index === winningCard) {
                setDealerMessage("Ага, она выигрышная. Не благодари.");
                setTrollButtons([{ text: "Открывай!", action: () => reveal(index) }]);
              } else {
                setDealerMessage("Не-а, она проигрышная. Рад, что заплатил мне? Выбирай другую.");
                setTrollButtons([{ text: "Выбрать другую", action: () => cancelSelection() }]);
              }
          }},
          { text: "Никаких взяток, открывай", action: () => reveal(index) }
        ]);
        break;
      case 'all_in':
        setDealerMessage(`Чувствуешь удачу? Ставь ВСЕ свои ${coins} монеток. Выиграешь — получишь ${coins * 2}! Проиграешь — останешься ни с чем.`);
        setTrollButtons([
          { text: "ВА-БАНК!", action: () => { setStakes({win: coins * 2, lose: coins}); reveal(index); } },
          { text: "Слишком страшно, обычная ставка", action: () => reveal(index) }
        ]);
        break;
      case 'swap_cards':
        setDealerMessage(`*Вжух* Я только что перемешал карты силой мысли. Ты все еще выбираешь Карту ${index + 1}?`);
        setWinningCard(Math.floor(Math.random() * 3));
        setTrollButtons([
          { text: "Я доверяю интуиции. Открывай.", action: () => reveal(index) },
          { text: "Дай выбрать снова", action: () => cancelSelection() }
        ]);
        break;
      case 'timeout':
        setDealerMessage(`Быстро! У тебя есть 3 секунды, чтобы подтвердить, или я заберу монетку!`);
        setTrollButtons([
          { text: "ПОДТВЕРЖДАЮ!", action: () => reveal(index) },
          { text: "ПОМЕНЯТЬ!", action: () => cancelSelection() }
        ]);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-purple-500/30">
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto p-6">
        <div className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
          <span className="text-purple-500">ТРОЛЛЬ</span>МОНТЕ
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/80 px-6 py-3 rounded-full border border-zinc-800 shadow-xl">
          <Coins className="w-6 h-6 text-amber-400" />
          <span className={`font-bold text-xl ${coins < 0 ? 'text-red-500' : 'text-amber-400'}`}>{coins}</span>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto">
        
        <div className="flex justify-center gap-4 sm:gap-8 mb-12 w-full">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              index={i}
              isRevealed={revealedCards[i]}
              isWinner={i === winningCard}
              isSelected={selectedCard === i}
              onClick={handleCardClick}
              disabled={gameState !== 'idle'}
            />
          ))}
        </div>

        <DealerDialog message={dealerMessage} buttons={trollButtons} />

      </main>
    </div>
  );
}
