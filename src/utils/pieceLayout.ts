import type { Piece, Position } from '../types/puzzle';

// ピースの実際のサイズを計算
export const calculatePieceBounds = (piece: Piece, cellSize: number = 50) => {
  const minX = Math.min(...piece.cells.map(c => c.x));
  const minY = Math.min(...piece.cells.map(c => c.y));
  const maxX = Math.max(...piece.cells.map(c => c.x));
  const maxY = Math.max(...piece.cells.map(c => c.y));
  
  return {
    width: (maxX - minX + 1) * cellSize,
    height: (maxY - minY + 1) * cellSize,
    minX,
    minY,
    maxX,
    maxY
  };
};

// 2つの矩形が重複するかチェック
export const doRectsOverlap = (
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number },
  margin: number = 10
): boolean => {
  return !(
    rect1.x + rect1.width + margin <= rect2.x ||
    rect2.x + rect2.width + margin <= rect1.x ||
    rect1.y + rect1.height + margin <= rect2.y ||
    rect2.y + rect2.height + margin <= rect1.y
  );
};

// レスポンシブな配置戦略を決定
const getPlacementStrategy = (containerWidth: number, containerHeight: number, cellSize: number = 50) => {
  const boardSize = cellSize * 6 + 58; // グリッド + game-board padding(40) + grid border(6) + grid padding(10) + 調整(2)
  const controlsHeight = 80; // コントロールボタン+gap（実測値）
  const margin = 15; // 最小マージン
  
  // グリッドの位置を計算（中央配置）
  const gridCenterX = containerWidth / 2;
  const gridTop = controlsHeight;
  const gridBottom = gridTop + boardSize;
  
  // 利用可能なスペースを計算
  const sideSpace = gridCenterX - boardSize / 2 - margin;
  const bottomSpace = containerHeight - gridBottom - margin;
  
  // デスクトップ（幅1200px以上）
  if (containerWidth > 1200) {
    return {
      type: 'desktop',
      areas: [
        // 左側エリア
        {
          x: margin,
          y: gridTop,
          width: sideSpace - margin,
          height: boardSize,
          maxPieces: 6
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: sideSpace - margin,
          height: boardSize,
          maxPieces: 6
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: bottomSpace - margin,
          maxPieces: 12
        }
      ]
    };
  }
  
  // タブレット（768px-1200px）
  if (containerWidth > 768) {
    return {
      type: 'tablet',
      areas: [
        // 上側エリア（2列）
        {
          x: margin,
          y: gridTop,
          width: sideSpace - margin,
          height: boardSize,
          maxPieces: 8
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: sideSpace - margin,
          height: boardSize,
          maxPieces: 8
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: Math.max(200, bottomSpace - margin),
          maxPieces: 8
        }
      ]
    };
  }
  
  // モバイル（768px以下）
  return {
    type: 'mobile',
    areas: [
      // 下側のみ（スクロール可能エリア）
      {
        x: margin,
        y: gridBottom + margin,
        width: containerWidth - margin * 2,
        height: Math.max(400, bottomSpace - margin),
        maxPieces: 24
      }
    ]
  };
};

// グリッド配置アルゴリズム（エリア内での整列配置）
const arrangeInArea = (
  pieces: Piece[],
  area: { x: number; y: number; width: number; height: number; maxPieces: number },
  cellSize: number = 50,
  excludedArea: { x: number; y: number; width: number; height: number } | null = null
): Array<{ piece: Piece; position: Position }> => {
  const positions: Array<{ piece: Piece; position: Position }> = [];
  const occupiedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  
  // エリア内での配置パラメータ
  const padding = 15;
  let currentX = area.x;
  let currentY = area.y;
  let rowHeight = 0;
  
  for (const piece of pieces) {
    if (positions.length >= area.maxPieces) break;
    
    const bounds = calculatePieceBounds(piece, cellSize);
    
    // 次の行に移動が必要かチェック
    if (currentX + bounds.width + padding > area.x + area.width) {
      currentX = area.x;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }
    
    // エリアの高さを超える場合はスキップ
    if (currentY + bounds.height > area.y + area.height) {
      break;
    }
    
    // 位置を決定（コンテナ境界内に収める）
    const position = {
      x: Math.max(0, Math.min(currentX, area.x + area.width - bounds.width)),
      y: Math.max(0, Math.min(currentY, area.y + area.height - bounds.height))
    };
    
    // 重複チェック
    const pieceRect = {
      x: position.x,
      y: position.y,
      width: bounds.width,
      height: bounds.height
    };
    
    const hasOverlap = occupiedRects.some(rect => doRectsOverlap(pieceRect, rect, padding));
    const hasGridOverlap = excludedArea && doRectsOverlap(pieceRect, excludedArea, padding);
    
    if (!hasOverlap && !hasGridOverlap) {
      positions.push({ piece, position });
      occupiedRects.push(pieceRect);
      
      // 次の位置を更新
      currentX += bounds.width + padding;
      rowHeight = Math.max(rowHeight, bounds.height);
    }
  }
  
  return positions;
};

// 改善されたパズルピース初期位置計算
export const calculateInitialPositions = (
  pieces: Piece[],
  containerWidth: number = 1600,
  containerHeight: number = 1000,
  cellSize: number = 50,
  gridOffset: Position = { x: 0, y: 0 }
): Array<{ piece: Piece; position: Position }> => {
  // ビューポートサイズが小さすぎる場合の最小値を設定
  const effectiveWidth = Math.max(containerWidth, 600);
  const effectiveHeight = Math.max(containerHeight, 800);
  
  // 実際のグリッド領域を計算（除外領域として使用）
  const gridSize = cellSize * 6; // 6x6のグリッド
  const gridPadding = 29; // game-board padding(20) + border(1) + grid border(3) + grid padding(5)
  const gridBounds = gridOffset.x > 0 && gridOffset.y > 0 ? {
    x: gridOffset.x - gridPadding,
    y: gridOffset.y - gridPadding,
    width: gridSize + gridPadding * 2,
    height: gridSize + gridPadding * 2
  } : null;
  
  
  // 配置戦略を取得
  const strategy = getPlacementStrategy(effectiveWidth, effectiveHeight, cellSize);
  
  // 各エリアにピースを配置
  const allPositions: Array<{ piece: Piece; position: Position }> = [];
  let remainingPieces = [...pieces];
  
  for (const area of strategy.areas) {
    const piecesToPlace = remainingPieces.slice(0, area.maxPieces);
    const areaPositions = arrangeInArea(piecesToPlace, area, cellSize, gridBounds);
    
    allPositions.push(...areaPositions);
    remainingPieces = remainingPieces.slice(areaPositions.length);
  }
  
  // 配置できなかったピースのフォールバック（エラー処理）
  let fallbackY = Math.max(50, effectiveHeight - 300);
  for (const piece of remainingPieces) {
    const bounds = calculatePieceBounds(piece, cellSize);
    const fallbackX = 20 + (allPositions.length % 5) * (bounds.width + 20);
    
    allPositions.push({
      piece,
      position: {
        x: Math.max(0, Math.min(fallbackX, effectiveWidth - bounds.width)),
        y: Math.max(0, Math.min(fallbackY, effectiveHeight - bounds.height))
      }
    });
    
    if ((allPositions.length % 5) === 4) {
      fallbackY += bounds.height + 20;
    }
  }
  
  // ピースの順番を保持したまま返す
  return pieces.map(piece => {
    const found = allPositions.find(p => p.piece.id === piece.id);
    return found || { piece, position: { x: 50, y: 50 } };
  });
};