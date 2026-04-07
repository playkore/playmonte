import { useEffect, useState } from 'react';

import { Card } from './components/Card';
import { DealerDialog } from './components/DealerDialog';
import { useTrollMonteGame } from './game/useTrollMonteGame';

export default function App() {
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem('openai_api_key') ?? '');

  useEffect(() => {
    window.localStorage.setItem('openai_api_key', apiKey);
  }, [apiKey]);

  const {
    coins,
    winningCard,
    selectedCard,
    revealedCards,
    dealerMessage,
    gameState,
    dialogButtons,
    selectCard,
    handleDialogAction,
    isThinking,
    statusMessage,
  } = useTrollMonteGame({
    apiKey,
    model: 'gpt-5.4-nano',
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-purple-500/30">
      <div className="w-full max-w-5xl mx-auto p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
            <span className="text-purple-500">ТРОЛЛЬ</span>МОНТЕ
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/80 px-6 py-3 rounded-full border border-zinc-800 shadow-xl">
            <span className="text-amber-400 text-xl" aria-hidden="true">
              $
            </span>
            <span className={`font-bold text-xl ${coins < 0 ? 'text-red-500' : 'text-amber-400'}`}>
              {coins}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <label htmlFor="openai-api-key" className="text-sm text-zinc-400">
            OpenAI API key для прототипа
          </label>
          <input
            id="openai-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-purple-500"
          />
          <div className="text-sm text-zinc-500">
            Ключ хранится в `localStorage` на фронтенде. Для прототипа это намеренно небезопасно.
          </div>
          {statusMessage && <div className="text-sm text-amber-300">{statusMessage}</div>}
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto">
        <div className="flex justify-center gap-4 sm:gap-8 mb-12 w-full">
          {[0, 1, 2].map((cardIndex) => (
            <Card
              key={cardIndex}
              index={cardIndex as 0 | 1 | 2}
              isRevealed={revealedCards[cardIndex]}
              isWinner={cardIndex === winningCard}
              isSelected={selectedCard === cardIndex}
              onClick={selectCard}
              disabled={gameState !== 'idle'}
            />
          ))}
        </div>

        <DealerDialog
          message={dealerMessage}
          buttons={dialogButtons}
          onAction={handleDialogAction}
          isLoading={isThinking}
        />
      </main>
    </div>
  );
}
