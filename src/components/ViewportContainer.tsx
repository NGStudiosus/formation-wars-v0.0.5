import React from 'react';
import { GameState } from '../types';
import { DebugConsole } from './DebugConsole';

interface ViewportContainerProps {
  state: GameState | any;
  onStateModified?: () => void;
  children?: React.ReactNode;
}

/**
 * ViewportContainer wraps the tactical canvas / viewport components
 * and mounts persistent overlays including the DebugConsole.
 */
export const ViewportContainer: React.FC<ViewportContainerProps> = ({
  state,
  onStateModified,
  children,
}) => {
  return (
    <div className="relative w-full h-full">
      {children}
      <DebugConsole state={state} onStateModified={onStateModified} />
    </div>
  );
};
