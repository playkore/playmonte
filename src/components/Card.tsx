import { motion } from 'motion/react';
import { Frown, Sparkles } from 'lucide-react';

import type { CardIndex } from '../game/types';

type CardProps = {
  index: CardIndex;
  isRevealed: boolean;
  isWinner: boolean;
  isSelected: boolean;
  disabled: boolean;
  onClick: (index: CardIndex) => void;
};

export function Card({
  index,
  isRevealed,
  isWinner,
  isSelected,
  disabled,
  onClick,
}: CardProps) {
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
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-800 rounded-xl border-2 border-indigo-400/50 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="text-indigo-300/50 text-5xl sm:text-6xl font-black">{index + 1}</div>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay rounded-xl" />
        </div>

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
}
