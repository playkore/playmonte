import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type BurstCoin = {
  id: number;
  x: number;
  y: number;
  delay: number;
};

type BalanceDisplayProps = {
  coins: number;
};

const MAX_BURST_COINS = 6;
const BURST_LIFETIME_MS = 1100;

function createBurst(delta: number, direction: 'gain' | 'loss', idBase: number): BurstCoin[] {
  const amount = Math.max(1, Math.min(MAX_BURST_COINS, Math.abs(delta)));

  return Array.from({ length: amount }, (_, index) => {
    const spread = direction === 'gain' ? 56 : 72;
    const x =
      direction === 'gain'
        ? -spread - Math.random() * 52 + index * 8
        : (Math.random() - 0.35) * spread;
    const y =
      direction === 'gain'
        ? 28 + Math.random() * 52 - index * 5
        : -8 + Math.random() * 58;

    return {
      id: idBase + index,
      x,
      y,
      delay: index * 0.04,
    };
  });
}

export function BalanceDisplay({ coins }: BalanceDisplayProps) {
  const previousCoinsRef = useRef(coins);
  const burstIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const [burstCoins, setBurstCoins] = useState<BurstCoin[]>([]);
  const [direction, setDirection] = useState<'gain' | 'loss' | null>(null);

  useEffect(() => {
    const previousCoins = previousCoinsRef.current;
    if (previousCoins === coins) {
      return;
    }

    const delta = coins - previousCoins;
    const nextDirection = delta > 0 ? 'gain' : 'loss';

    burstIdRef.current += MAX_BURST_COINS + 1;
    setDirection(nextDirection);
    setBurstCoins(createBurst(delta, nextDirection, burstIdRef.current));
    previousCoinsRef.current = coins;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setBurstCoins([]);
      setDirection(null);
      timeoutRef.current = null;
    }, BURST_LIFETIME_MS);
  }, [coins]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const accentClass =
    direction === 'gain'
      ? 'border-emerald-400/40 shadow-[0_0_32px_rgba(74,222,128,0.18)]'
      : direction === 'loss'
        ? 'border-rose-400/40 shadow-[0_0_32px_rgba(251,113,133,0.2)]'
        : 'border-zinc-800 shadow-xl';

  return (
    <div className="relative">
      <motion.div
        className={`balance-badge relative overflow-hidden flex items-center gap-3 rounded-full bg-zinc-900/85 px-6 py-3 ${accentClass}`}
        animate={{
          scale: direction === 'gain' ? [1, 1.08, 1] : direction === 'loss' ? [1, 0.96, 1.03, 1] : 1,
          y: direction === 'gain' ? [0, -2, 0] : direction === 'loss' ? [0, 2, 0] : 0,
        }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{
            opacity: direction ? [0, 0.95, 0] : 0,
            scale: direction === 'gain' ? [0.85, 1.25] : [1.1, 1.35],
          }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            background:
              direction === 'loss'
                ? 'radial-gradient(circle at 50% 50%, rgba(251,113,133,0.28), transparent 68%)'
                : 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.24), transparent 70%)',
          }}
        />

        <motion.span
          className="relative text-xl text-amber-400"
          aria-hidden="true"
          animate={{ rotate: direction === 'gain' ? [0, -12, 8, 0] : direction === 'loss' ? [0, 14, -10, 0] : 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          $
        </motion.span>
        <motion.span
          key={coins}
          className={`relative font-bold text-xl ${coins < 0 ? 'text-red-500' : 'text-amber-400'}`}
          initial={{ opacity: 0.5, y: direction === 'loss' ? -8 : 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {coins}
        </motion.span>

        <AnimatePresence>
          {burstCoins.map((coin) => (
            <motion.span
              key={coin.id}
              className="pointer-events-none absolute flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/70 bg-amber-300 text-xs font-black text-zinc-950 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
              initial={{
                opacity: 0,
                x: direction === 'gain' ? coin.x : 0,
                y: direction === 'gain' ? coin.y : 0,
                scale: direction === 'gain' ? 0.7 : 0.2,
              }}
              animate={{
                opacity: direction === 'gain' ? [0, 1, 0] : [1, 1, 0],
                x: direction === 'gain' ? 0 : coin.x,
                y: direction === 'gain' ? 0 : coin.y,
                scale: direction === 'gain' ? [0.7, 1.06, 0.3] : [0.4, 1, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: direction === 'gain' ? 0.7 : 0.8,
                delay: coin.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ right: 22, top: 10 }}
            >
              $
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
