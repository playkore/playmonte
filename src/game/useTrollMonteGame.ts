import { useEffect, useState } from 'react';

import {
  createInitialMachineState,
  dispatchMachineEvent,
  getViewModel,
} from './gameEngine';
import type { CardIndex, DialogAction } from './types';

export function useTrollMonteGame() {
  const [machineState, setMachineState] = useState(() => createInitialMachineState());
  const viewModel = getViewModel(machineState);

  useEffect(() => {
    if (!machineState.pendingAutoTransition) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMachineState((current) => {
        const pending = current.pendingAutoTransition;
        if (!pending) {
          return current;
        }

        return dispatchMachineEvent(current, {
          type: 'auto',
          transitionId: pending.transitionId,
        });
      });
    }, machineState.pendingAutoTransition.delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [machineState.pendingAutoTransition]);

  const selectCard = (index: CardIndex) => {
    if (viewModel.gameState !== 'idle') {
      return;
    }

    setMachineState((current) =>
      dispatchMachineEvent(current, {
        type: 'card-selected',
        cardIndex: index,
      }),
    );
  };

  const handleDialogAction = (action: DialogAction) => {
    setMachineState((current) =>
      dispatchMachineEvent(current, {
        type: 'action',
        actionId: action.actionId,
      }),
    );
  };

  const resetGame = () => {
    setMachineState((current) =>
      dispatchMachineEvent(current, { type: 'action', actionId: 'play-again' }),
    );
  };

  const cancelSelection = () => {
    setMachineState((current) =>
      dispatchMachineEvent(current, { type: 'action', actionId: 'change-mind' }),
    );
  };

  return {
    ...viewModel,
    selectCard,
    cancelSelection,
    handleDialogAction,
    resetGame,
  };
}
