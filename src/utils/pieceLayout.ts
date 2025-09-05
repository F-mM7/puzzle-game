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
          width: Math.max(50, sideSpace - margin),
          height: boardSize,
          maxPieces: 6
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: Math.max(50, sideSpace - margin),
          height: boardSize,
          maxPieces: 6
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: Math.max(100, Math.min(bottomSpace - margin, containerHeight - (gridBottom + margin * 2))),
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
          width: Math.max(50, sideSpace - margin),
          height: boardSize,
          maxPieces: 8
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: Math.max(50, sideSpace - margin),
          height: boardSize,
          maxPieces: 8
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: Math.max(150, Math.min(bottomSpace - margin, containerHeight - (gridBottom + margin * 2))),
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
        height: Math.max(200, Math.min(bottomSpace - margin, containerHeight - (gridBottom + margin * 2))),
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
    
    // 位置を決定（エリア境界内に収める）
    // ピースがエリアからはみ出さない最大位置を計算
    const maxX = area.x + area.width - bounds.width;
    const maxY = area.y + area.height - bounds.height;
    
    // エリアがピースより小さい場合は、エリアの左上に配置
    const clampedMaxX = Math.max(area.x, maxX);
    const clampedMaxY = Math.max(area.y, maxY);
    
    const position = {
      x: Math.max(area.x, Math.min(currentX, clampedMaxX)),
      y: Math.max(area.y, Math.min(currentY, clampedMaxY))
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
  // 実際のコンテナサイズが小さい場合はそれを尊重する
  const effectiveWidth = containerWidth > 0 ? Math.max(containerWidth, 400) : 1600;
  const effectiveHeight = containerHeight > 0 ? Math.max(containerHeight, 600) : 1000;
  
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
  
  // エリアが小さすぎる場合は有効なエリアのみを使用
  const validAreas = strategy.areas.filter(area => area.width > 50 && area.height > 50);
  
  // 各エリアにピースを配置
  const allPositions: Array<{ piece: Piece; position: Position }> = [];
  let remainingPieces = [...pieces];
  
  for (const area of validAreas) {
    const piecesToPlace = remainingPieces.slice(0, area.maxPieces);
    const areaPositions = arrangeInArea(piecesToPlace, area, cellSize, gridBounds);
    
    allPositions.push(...areaPositions);
    remainingPieces = remainingPieces.slice(areaPositions.length);
  }
  
  // 配置できなかったピースのフォールバック（エラー処理）
  const margin = 20;
  let fallbackY = Math.max(50, effectiveHeight - 200); // より控えめな開始位置
  const columnsPerRow = 3;
  
  for (let i = 0; i < remainingPieces.length; i++) {
    const piece = remainingPieces[i];
    const bounds = calculatePieceBounds(piece, cellSize);
    const column = i % columnsPerRow;
    const row = Math.floor(i / columnsPerRow);
    
    // 列位置を計算
    const fallbackX = margin + column * (bounds.width + margin);
    
    // 行位置を計算（画面下にはみ出さないよう制限）
    const rowY = fallbackY + row * (bounds.height + margin);
    
    // 境界チェックを厳格にして、確実に画面内に収める
    // ピースがコンテナからはみ出さない最大位置を計算
    const maxX = effectiveWidth - bounds.width - margin;
    const maxY = effectiveHeight - bounds.height - margin;
    
    // コンテナがピースより小さい場合の安全な位置
    const clampedMaxX = Math.max(margin, maxX);
    const clampedMaxY = Math.max(50, maxY);
    
    // 画面下にはみ出る場合は、利用可能な高さ内で重ねて配置
    const finalY = Math.min(rowY, clampedMaxY);
    
    allPositions.push({
      piece,
      position: {
        x: Math.max(margin, Math.min(fallbackX, clampedMaxX)),
        y: Math.max(50, finalY)
      }
    });
  }
  
  // ピースの順番を保持したまま返す
  return pieces.map(piece => {
    const found = allPositions.find(p => p.piece.id === piece.id);
    return found || { piece, position: { x: 50, y: 50 } };
  });
};