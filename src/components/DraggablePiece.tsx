import React, { useState, useEffect, useCallback } from 'react';
import type { Piece } from '../types/puzzle';
import { getPieceScreenPosition, screenToGrid, isGridOffsetInitialized } from '../utils/coordinates';
import './DraggablePiece.css';

interface DraggablePieceProps {
  piece: Piece;
  cellSize?: number;
  onPlace: (pieceId: number, x: number, y: number, gridX: number, gridY: number) => void;
  onRemove: (pieceId: number) => void;
  gridOffset?: { x: number; y: number };
}

export const DraggablePiece: React.FC<DraggablePieceProps> = ({ 
  piece, 
  cellSize = 50, 
  onPlace,
  onRemove,
  gridOffset = { x: 0, y: 0 }
}) => {
  const [position, setPosition] = useState(() => 
    getPieceScreenPosition(piece, gridOffset, cellSize)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const minX = Math.min(...piece.cells.map(c => c.x));
  const minY = Math.min(...piece.cells.map(c => c.y));
  const maxX = Math.max(...piece.cells.map(c => c.x));
  const maxY = Math.max(...piece.cells.map(c => c.y));
  const width = (maxX - minX + 1) * cellSize;
  const height = (maxY - minY + 1) * cellSize;

  useEffect(() => {
    const newPosition = getPieceScreenPosition(piece, gridOffset, cellSize);
    setPosition(newPosition);
  }, [piece, gridOffset, cellSize]);

  const [clickStartTime, setClickStartTime] = useState(0);

  const startDrag = (clientX: number, clientY: number) => {
    const now = Date.now();
    setClickStartTime(now);
    
    const currentPos = getPieceScreenPosition(piece, gridOffset, cellSize);
    setPosition(currentPos);
    
    setIsDragging(true);
    setDragOffset({
      x: clientX - currentPos.x,
      y: clientY - currentPos.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    setPosition({
      x: clientX - dragOffset.x,
      y: clientY - dragOffset.y
    });
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updatePosition(e.clientX, e.clientY);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      updatePosition(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  }, [updatePosition]);

  const endDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    setIsDragging(false);

    const clickDuration = Date.now() - clickStartTime;
    
    if (clickDuration < 200 && piece.isPlaced) {
      const currentX = clientX - dragOffset.x;
      const currentY = clientY - dragOffset.y;
      const startX = position.x;
      const startY = position.y;
      const distance = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
      if (distance < 5) {
        onRemove(piece.id);
        return;
      }
    }

    const currentX = clientX - dragOffset.x;
    const currentY = clientY - dragOffset.y;

    // gridOffsetが未初期化の場合は座標変換をスキップして現在の位置に配置
    if (!isGridOffsetInitialized(gridOffset)) {
      onPlace(piece.id, currentX, currentY, 0, 0);
      return;
    }

    // 新しい座標変換関数を使用してグリッド座標を計算
    const gridPos = screenToGrid({ x: currentX, y: currentY }, gridOffset, cellSize, piece);

    onPlace(piece.id, currentX, currentY, gridPos.gridX, gridPos.gridY);
  }, [isDragging, dragOffset.x, dragOffset.y, clickStartTime, piece, position.x, position.y, cellSize, gridOffset, onRemove, onPlace]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    endDrag(e.clientX, e.clientY);
  }, [endDrag]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      endDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  }, [endDrag]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const displayPosition = isDragging ? position : getPieceScreenPosition(piece, gridOffset, cellSize);

  // gridOffsetが未初期化かつピースが配置済みの場合は描画を遅延
  const shouldHide = !isGridOffsetInitialized(gridOffset) && piece.isPlaced;

  return (
    <div
      className={`draggable-piece ${piece.isPlaced ? 'placed' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${displayPosition.x}px`,
        top: `${displayPosition.y}px`,
        opacity: shouldHide ? 0 : (piece.isPlaced ? 1 : (isDragging ? 0.8 : 1)),
        zIndex: isDragging ? 1000 : (piece.isPlaced ? 10 : 1),
        pointerEvents: shouldHide ? 'none' : 'none'
      }}
    >
      <svg width={width} height={height} style={{ pointerEvents: 'none' }}>
        {piece.cells.map((cell, index) => (
          <rect
            key={index}
            x={(cell.x - minX) * cellSize + 2}
            y={(cell.y - minY) * cellSize + 2}
            width={cellSize - 4}
            height={cellSize - 4}
            fill={piece.color}
            stroke="#333"
            strokeWidth="2"
            style={{ pointerEvents: 'auto', cursor: piece.isPlaced ? 'pointer' : (isDragging ? 'grabbing' : 'grab') }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
        ))}
      </svg>
    </div>
  );
};