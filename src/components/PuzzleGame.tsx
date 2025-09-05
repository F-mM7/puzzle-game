import React, { useState, useEffect } from 'react';
import { DraggablePiece } from './DraggablePiece';
import { PuzzleGrid } from './PuzzleGrid';
import { PuzzleControls } from './PuzzleControls';
import { ShareButton } from './ShareButton';
import { CompletionMessage } from './CompletionMessage';
import { usePuzzleState } from '../hooks/usePuzzleState';
import { useGridLayout } from '../hooks/useGridLayout';
import type { Puzzle } from '../types/puzzle';
import { puzzleToSavedState } from '../utils/storage';
import './PuzzleGame.css';

interface PuzzleGameProps {
  initialPuzzle: Puzzle;
}

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ initialPuzzle }) => {
  const getCellSize = (containerWidth: number) => {
    if (containerWidth <= 480) return 35;
    if (containerWidth <= 768) return 40;
    return 50;
  };

  const [cellSize, setCellSize] = useState(() => getCellSize(1200));
  const { gridOffset, containerSize, gridRef, containerRef, updateGridOffset } = useGridLayout();
  
  useEffect(() => {
    if (containerSize.width > 0) {
      const newCellSize = getCellSize(containerSize.width);
      if (newCellSize !== cellSize) {
        setCellSize(newCellSize);
      }
    }
  }, [containerSize.width, cellSize]);
  
  const {
    puzzle,
    isComplete,
    placePiece,
    removePiece,
    resetPuzzle,
    generateNewPuzzle
  } = usePuzzleState(initialPuzzle, containerSize, gridOffset, cellSize);

  const handlePlacePiece = (
    pieceId: number,
    dropX: number,
    dropY: number,
    gridX: number,
    gridY: number
  ) => {
    placePiece(pieceId, dropX, dropY, gridX, gridY);
  };

  // 現在のパズルを共有用データに変換
  const currentSavedState = puzzleToSavedState(puzzle);

  return (
    <div className="puzzle-game">
      <div className="puzzle-header">
        <PuzzleControls 
          onReset={resetPuzzle}
          onGenerateNew={generateNewPuzzle}
        />
        <ShareButton puzzle={currentSavedState} />
      </div>

      <div className="game-container" ref={containerRef}>
        <div className="game-board">
          <PuzzleGrid 
            ref={gridRef}
            grid={puzzle.grid}
            cellSize={cellSize}
            onLayoutComplete={updateGridOffset}
          />
          <CompletionMessage isComplete={isComplete} />
        </div>

        <div className="pieces-layer">
          {puzzle.pieces.map(piece => (
            <DraggablePiece
              key={piece.id}
              piece={piece}
              cellSize={cellSize}
              onPlace={handlePlacePiece}
              onRemove={removePiece}
              gridOffset={gridOffset}
            />
          ))}
        </div>
      </div>
    </div>
  );
};