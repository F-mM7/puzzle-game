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
const getPlacementStrategy = (containerWidth: number, containerHeight: number, cellSize: number = 50, pieceBounds: Array<{ width: number; height: number }> = []) => {
  const boardSize = cellSize * 6 + 58; // グリッド + game-board padding(40) + grid border(6) + grid padding(10) + 調整(2)
  const controlsHeight = 60; // コントロールバーの高さ（縮小したので調整）
  const margin = 15; // 最小マージン
  
  // グリッドの位置を計算（中央配置）
  const gridCenterX = containerWidth / 2;
  const gridTop = controlsHeight;
  const gridBottom = gridTop + boardSize;
  
  // 利用可能なスペースを計算
  const sideSpace = gridCenterX - boardSize / 2 - margin;
  const bottomSpace = containerHeight - gridBottom - margin;
  
  // ピースの最大サイズを計算
  const maxPieceWidth = Math.max(...pieceBounds.map(b => b.width), 150);
  const maxPieceHeight = Math.max(...pieceBounds.map(b => b.height), 150);
  
  // デスクトップ（幅1200px以上）
  if (containerWidth > 1200) {
    const leftWidth = Math.min(sideSpace - margin, maxPieceWidth * 2 + margin * 3);
    const rightWidth = Math.min(sideSpace - margin, maxPieceWidth * 2 + margin * 3);
    // 下側エリアは実際の利用可能高さをフル活用
    const bottomHeight = Math.max(100, bottomSpace - margin);
    
    return {
      type: 'desktop',
      areas: [
        // 左側エリア
        {
          x: Math.max(margin, gridCenterX - boardSize / 2 - leftWidth - margin),
          y: gridTop,
          width: leftWidth,
          height: boardSize,
          maxPieces: 8,
          priority: 1
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: rightWidth,
          height: boardSize,
          maxPieces: 8,
          priority: 2
        },
        // 下側エリア（実際の利用可能高さをフル活用）
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: bottomHeight,
          maxPieces: 16,
          priority: 3
        }
      ]
    };
  }
  
  // タブレット（768px-1200px）
  if (containerWidth > 768) {
    const bottomHeight = Math.min(containerHeight - gridBottom - margin * 2, maxPieceHeight * 3 + margin * 4);
    
    // サイドスペースが狭い場合は下部のみ使用
    if (sideSpace < maxPieceWidth + margin * 2) {
      return {
        type: 'tablet',
        areas: [
          // 下側エリアのみ
          {
            x: margin,
            y: gridBottom + margin,
            width: containerWidth - margin * 2,
            height: bottomHeight,
            maxPieces: 24,
            priority: 1
          }
        ]
      };
    }
    
    const sideWidth = Math.min(sideSpace - margin, maxPieceWidth * 1.5 + margin * 2);
    
    return {
      type: 'tablet',
      areas: [
        // 左側エリア
        {
          x: Math.max(margin, gridCenterX - boardSize / 2 - sideWidth - margin),
          y: gridTop,
          width: sideWidth,
          height: boardSize,
          maxPieces: 6,
          priority: 1
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: sideWidth,
          height: boardSize,
          maxPieces: 6,
          priority: 2
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: Math.max(100, containerHeight - gridBottom - margin * 2),
          maxPieces: 16,
          priority: 3
        }
      ]
    };
  }
  
  // モバイル（768px以下）
  // 実際の利用可能高さをフル活用
  const mobileBottomHeight = Math.max(150, containerHeight - gridBottom - margin * 2);
  
  return {
    type: 'mobile',
    areas: [
      // 下側のみ（実際の利用可能高さをフル活用）
      {
        x: margin,
        y: gridBottom + margin,
        width: containerWidth - margin * 2,
        height: mobileBottomHeight,
        maxPieces: 24,
        priority: 1
      }
    ]
  };
};

// スマートグリッド配置アルゴリズム（エリア内での最適配置）
const arrangeInArea = (
  pieces: Piece[],
  area: { x: number; y: number; width: number; height: number; maxPieces: number; priority?: number },
  cellSize: number = 50,
  excludedArea: { x: number; y: number; width: number; height: number } | null = null
): Array<{ piece: Piece; position: Position }> => {
  const positions: Array<{ piece: Piece; position: Position }> = [];
  const occupiedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  
  // エリア内での配置パラメータ
  const minPadding = 8;
  const maxPadding = 20;
  
  // ピースをサイズでソート（大きいものから配置）
  const sortedPieces = [...pieces].sort((a, b) => {
    const boundsA = calculatePieceBounds(a, cellSize);
    const boundsB = calculatePieceBounds(b, cellSize);
    return (boundsB.width * boundsB.height) - (boundsA.width * boundsA.height);
  });
  
  // グリッド配置を試みる
  let currentX = area.x;
  let currentY = area.y;
  let rowHeight = 0;
  let placedInRow = 0;
  
  for (const piece of sortedPieces) {
    if (positions.length >= area.maxPieces) break;
    
    const bounds = calculatePieceBounds(piece, cellSize);
    
    // 適応的なパディング
    const pieceArea = bounds.width * bounds.height;
    const maxArea = cellSize * cellSize * 16;
    const paddingRatio = Math.min(1, pieceArea / maxArea);
    const padding = minPadding + (maxPadding - minPadding) * paddingRatio;
    
    // 配置試行
    let placed = false;
    
    // 次の行に移動が必要かチェック
    if (currentX + bounds.width > area.x + area.width) {
      currentX = area.x;
      currentY += rowHeight + padding;
      rowHeight = 0;
      placedInRow = 0;
    }
    
    // エリアの高さを超える場合は次の行を試す
    if (currentY + bounds.height > area.y + area.height) {
      // まだ配置可能ピース数に余裕がある場合のみ、最小間隔で次の行を試す
      if (positions.length < area.maxPieces - 3 && rowHeight > 0) {
        currentX = area.x;
        currentY += minPadding;
        rowHeight = 0;
        placedInRow = 0;
        // 再度同じピースで試す
        continue;
      } else {
        // 配置できない場合はスキップ
        continue;
      }
    }
      
    // 候補位置
    const candidatePosition = {
      x: Math.min(currentX, Math.max(area.x, area.x + area.width - bounds.width)),
      y: Math.min(currentY, Math.max(area.y, area.y + area.height - bounds.height))
    };
    
    // 重複チェック用の矩形
    const pieceRect = {
      x: candidatePosition.x,
      y: candidatePosition.y,
      width: bounds.width,
      height: bounds.height
    };
    
    // 重複チェック
    const hasOverlap = occupiedRects.some(rect => doRectsOverlap(pieceRect, rect, padding / 2));
    const hasGridOverlap = excludedArea && doRectsOverlap(pieceRect, excludedArea, padding);
    
    if (!hasOverlap && !hasGridOverlap) {
      positions.push({ piece, position: candidatePosition });
      occupiedRects.push(pieceRect);
      
      // 次の位置を更新
      currentX = candidatePosition.x + bounds.width + padding;
      rowHeight = Math.max(rowHeight, bounds.height);
      placedInRow++;
      placed = true;
    }
    
    // 配置できなかった場合、次の位置を試す
    if (!placed) {
      // 現在の行にスペースがある場合は少しずらす
      if (currentX + bounds.width + padding * 2 <= area.x + area.width) {
        currentX += padding;
      } else {
        // 次の行へ
        currentX = area.x;
        currentY += rowHeight + padding;
        rowHeight = 0;
        placedInRow = 0;
      }
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
  const effectiveWidth = containerWidth > 0 ? Math.max(containerWidth, 400) : 1600;
  const effectiveHeight = containerHeight > 0 ? Math.max(containerHeight, 600) : 1000;
  
  // すべてのピースのサイズを事前計算
  const pieceBounds = pieces.map(piece => calculatePieceBounds(piece, cellSize));
  
  // 実際のグリッド領域を計算（除外領域として使用）
  const gridSize = cellSize * 6; // 6x6のグリッド
  const gridPadding = 35; // game-board padding + border + margin
  const gridBounds = gridOffset.x > 0 && gridOffset.y > 0 ? {
    x: gridOffset.x - gridPadding,
    y: gridOffset.y - gridPadding,
    width: gridSize + gridPadding * 2,
    height: gridSize + gridPadding * 2
  } : {
    // グリッド位置が不明な場合は中央に仮定
    x: effectiveWidth / 2 - gridSize / 2 - gridPadding,
    y: 80, // controlsHeight
    width: gridSize + gridPadding * 2,
    height: gridSize + gridPadding * 2
  };
  
  // 配置戦略を取得（ピースサイズ情報を渡す）
  const strategy = getPlacementStrategy(effectiveWidth, effectiveHeight, cellSize, pieceBounds);
  
  // エリアが小さすぎる場合は有効なエリアのみを使用
  const validAreas = strategy.areas
    .filter(area => area.width > 30 && area.height > 30)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999)); // 優先度順にソート
  
  // 各エリアにピースを配置
  const allPositions: Array<{ piece: Piece; position: Position }> = [];
  const placedPieceIds = new Set<number>();
  
  // ピースを形状の複雑さでソート（複雑なものを先に配置）
  const sortedPieces = [...pieces].sort((a, b) => {
    const indexA = pieces.indexOf(a);
    const indexB = pieces.indexOf(b);
    const boundsA = pieceBounds[indexA];
    const boundsB = pieceBounds[indexB];
    const complexityA = a.cells.length * (boundsA.width + boundsA.height);
    const complexityB = b.cells.length * (boundsB.width + boundsB.height);
    return complexityB - complexityA;
  });
  
  for (const area of validAreas) {
    const unplacedPieces = sortedPieces.filter(p => !placedPieceIds.has(p.id));
    if (unplacedPieces.length === 0) break;
    
    const piecesToPlace = unplacedPieces.slice(0, area.maxPieces);
    const areaPositions = arrangeInArea(piecesToPlace, area, cellSize, gridBounds);
    
    areaPositions.forEach(pos => {
      allPositions.push(pos);
      placedPieceIds.add(pos.piece.id);
    });
  }
  
  // 配置できなかったピースのフォールバック（改善版）
  const unplacedPieces = pieces.filter(p => !placedPieceIds.has(p.id));
  if (unplacedPieces.length > 0) {
    const margin = 15;
    const safeZoneTop = gridBounds.y + gridBounds.height + margin;
    const availableHeight = effectiveHeight - safeZoneTop - margin;
    
    // 動的な列数計算（より綾密に）
    const avgPieceWidth = pieceBounds.reduce((sum, b) => sum + b.width, 0) / pieceBounds.length;
    const columnsPerRow = Math.max(1, Math.floor((effectiveWidth - margin * 2) / (avgPieceWidth + margin)));
    
    // グリッド配置でフォールバックエリアを最大限活用
    let currentX = margin;
    let currentY = safeZoneTop;
    let rowHeight = 0;
    
    for (const piece of unplacedPieces) {
      const bounds = calculatePieceBounds(piece, cellSize);
      const padding = 10;
      
      // 次の行に移動が必要かチェック
      if (currentX + bounds.width > effectiveWidth - margin) {
        currentX = margin;
        currentY += rowHeight + padding;
        rowHeight = 0;
      }
      
      // 画面下端を超えないように調整
      const maxY = Math.max(safeZoneTop, effectiveHeight - bounds.height - margin);
      const finalY = Math.min(currentY, maxY);
      
      // 幅の調整
      const maxX = Math.max(margin, effectiveWidth - bounds.width - margin);
      const finalX = Math.min(currentX, maxX);
      
      const position = {
        x: finalX,
        y: finalY
      };
      
      allPositions.push({ piece, position });
      placedPieceIds.add(piece.id);
      
      // 次の位置を更新
      currentX += bounds.width + padding;
      rowHeight = Math.max(rowHeight, bounds.height);
    }
  }
  
  // ピースの元の順番を保持して返す
  return pieces.map(piece => {
    const found = allPositions.find(p => p.piece.id === piece.id);
    if (!found) {
      // 万が一配置できなかった場合の最終フォールバック
      const bounds = calculatePieceBounds(piece, cellSize);
      const safeX = Math.min(50, Math.max(20, effectiveWidth - bounds.width - 20));
      const safeY = Math.min(100, Math.max(50, effectiveHeight - bounds.height - 20));
      return { piece, position: { x: safeX, y: safeY } };
    }
    return found;
  });
};