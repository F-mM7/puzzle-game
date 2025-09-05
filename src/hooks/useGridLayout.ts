import { useState, useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import type { Position } from '../types/puzzle';

interface UseGridLayoutReturn {
  gridOffset: Position;
  containerSize: { width: number; height: number };
  gridRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  updateGridOffset: () => void;
}

export const useGridLayout = (): UseGridLayoutReturn => {
  const [gridOffset, setGridOffset] = useState<Position>({ x: -1, y: -1 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  const updateGridOffset = useCallback(() => {
    if (gridRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setContainerSize({
        width: containerRect.width,
        height: containerRect.height
      });
      
      const firstCell = gridRef.current.querySelector('.grid-cell');
      if (firstCell) {
        const firstCellRect = firstCell.getBoundingClientRect();
        const offset = {
          x: firstCellRect.left - containerRect.left,
          y: firstCellRect.top - containerRect.top
        };
        setGridOffset(offset);
        isInitializedRef.current = true;
      }
    }
  }, []);

  useEffect(() => {
    const initialSetup = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateGridOffset();
        });
      });
    };

    initialSetup();
    window.addEventListener('resize', updateGridOffset);
    window.addEventListener('scroll', updateGridOffset);
    
    return () => {
      window.removeEventListener('resize', updateGridOffset);
      window.removeEventListener('scroll', updateGridOffset);
    };
  }, [updateGridOffset]);

  return {
    gridOffset,
    containerSize,
    gridRef,
    containerRef,
    updateGridOffset
  };
};