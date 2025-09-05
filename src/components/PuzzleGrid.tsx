import { forwardRef, useLayoutEffect, useRef } from 'react';
import type { Cell } from '../types/puzzle';

interface PuzzleGridProps {
  grid: Cell[][];
  cellSize: number;
  onLayoutComplete?: () => void;
}

export const PuzzleGrid = forwardRef<HTMLDivElement, PuzzleGridProps>(
  ({ grid, cellSize, onLayoutComplete }, ref) => {
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    
    useLayoutEffect(() => {
      if (onLayoutComplete && ref && typeof ref !== 'function' && ref.current) {
        const firstCell = ref.current.querySelector('.grid-cell') as HTMLElement;
        
        if (firstCell) {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }
          
          resizeObserverRef.current = new ResizeObserver(() => {
            onLayoutComplete();
          });
          
          resizeObserverRef.current.observe(firstCell);
        }
      }
      
      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, [cellSize, onLayoutComplete, ref]);
    return (
      <div ref={ref} className="puzzle-grid">
        {grid.map((row, y) => (
          <div key={y} className="grid-row">
            {row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`grid-cell ${cell.pieceId ? 'occupied' : ''}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell.pieceId ? `var(--piece-${cell.pieceId})` : 'transparent'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

PuzzleGrid.displayName = 'PuzzleGrid';