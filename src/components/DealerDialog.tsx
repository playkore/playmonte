import { AnimatePresence, motion } from 'motion/react';
import { Smile, Skull, Angry } from 'lucide-react';

import type { DialogAction, DialogButton, DealerMood } from '../game/types';

type DealerDialogProps = {
  message: string;
  buttons: DialogButton[];
  onAction: (action: DialogAction) => void;
  mood: DealerMood;
 };


export function DealerDialog({ message, buttons, onAction, mood }: DealerDialogProps) {
  const moodIcon = (() => {
    switch (mood) {
      case 'smug':
        return <Smile className="h-8 w-8 text-green-400" />;
      case 'predatory':
        return <Skull className="h-8 w-8 text-red-600" />;
      case 'chaotic':
        return <Angry className="h-8 w-8 text-yellow-300" />;
      default:
        return <Smile className="h-8 w-8 text-green-400" />;
    }
  })();
  return (
    <div className="w-full max-w-2xl mx-auto mt-4 sm:mt-8 p-6 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl">
      <div className="flex items-start gap-4">
<div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">{moodIcon}</div>

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
                {buttons.map((button) => (
                  <button
                    key={button.id}
                    onClick={() => onAction(button.action)}
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors border border-zinc-700 hover:border-zinc-500 active:scale-95"
                  >
                    {button.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
