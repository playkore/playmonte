import { BalanceDisplay } from './components/BalanceDisplay';
import { Card } from './components/Card';
import { DealerDialog } from './components/DealerDialog';
import { useTrollMonteGame } from './game/useTrollMonteGame';


export default function App() {
  const {
    coins,
    winningCard,
    selectedCard,
    revealedCards,
    dealerMood,
    gameState,
    dialogButtons,
    dealerMessage,
    currentStakes,
    selectCard,
    handleDialogAction,
  } = useTrollMonteGame();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-purple-500/30">
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto p-6">
        <div className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
          <span className="text-purple-500">ТРОЛЛЬ</span>МОНТЕ
        </div>

        <BalanceDisplay coins={coins} />
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
          mood={dealerMood}
        />

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Stakes
            </span>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-300">
                Win +{currentStakes.win}
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-sm font-bold text-rose-300">
                Lose -{currentStakes.lose}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
