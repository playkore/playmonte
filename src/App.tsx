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
      </main>
    </div>
  );
}
