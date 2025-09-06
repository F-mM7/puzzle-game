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
const getPlacementStrategy = (containerWidth: number, containerHeight: number, cellSize: number = 50, pieceBounds: Array<{ width: number; height: number }> = [], gridOffset: Position = { x: 0, y: 0 }) => {
  const boardSize = cellSize * 6 + 58; // グリッド + game-board padding(40) + grid border(6) + grid padding(10) + 調整(2)
  const margin = 15; // 最小マージン
  
  // グリッドの実際の位置を使用（gridOffsetが有効な場合）
  const gridCenterX = gridOffset.x > 0 ? gridOffset.x + (cellSize * 3) : containerWidth / 2;
  const gridTop = gridOffset.y > 0 ? gridOffset.y : Math.max(50, containerHeight / 2 - boardSize / 2);
  const gridBottom = gridTop + boardSize;
  
  // 利用可能なスペースを計算
  const sideSpace = gridCenterX - boardSize / 2 - margin;
  const topSpace = gridTop - margin; // グリッド上部の利用可能スペース
  const bottomSpace = containerHeight - gridBottom - margin;
  
  // ピースの最大サイズを計算
  const maxPieceWidth = Math.max(...pieceBounds.map(b => b.width), 150);
  const maxPieceHeight = Math.max(...pieceBounds.map(b => b.height), 150);
  
  console.log('=== 配置戦略計算 ===');
  console.log(`コンテナサイズ: ${containerWidth}x${containerHeight}`);
  console.log(`グリッドオフセット: (${gridOffset.x}, ${gridOffset.y})`);
  console.log(`グリッド位置: 中央X=${gridCenterX}, 上=${gridTop}, 下=${gridBottom}`);
  console.log(`利用可能スペース: 横=${sideSpace}, 上=${topSpace}, 下=${bottomSpace}`);
  console.log(`最大ピースサイズ: ${maxPieceWidth}x${maxPieceHeight}`);
  
  // デスクトップ（幅1200px以上）
  if (containerWidth > 1200) {
    const leftWidth = Math.min(sideSpace - margin, maxPieceWidth * 2 + margin * 3);
    const rightWidth = Math.min(sideSpace - margin, maxPieceWidth * 2 + margin * 3);
    // 下側エリアは実際の利用可能高さをフル活用
    const bottomHeight = Math.max(100, bottomSpace);
    
    console.log('配置戦略: デスクトップ');
    console.log(`左エリア幅: ${leftWidth}, 右エリア幅: ${rightWidth}`);
    console.log(`下エリア高さ: ${bottomHeight}`);
    
    return {
      type: 'desktop',
      areas: [
        // 上側エリア（グリッドより上の全幅）
        {
          x: margin,
          y: margin,
          width: containerWidth - margin * 2,
          height: Math.max(50, topSpace),
          maxPieces: 8,
          priority: 1
        },
        // 左側エリア
        {
          x: Math.max(margin, gridCenterX - boardSize / 2 - leftWidth - margin),
          y: gridTop,
          width: leftWidth,
          height: boardSize,
          maxPieces: 6,
          priority: 2
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: rightWidth,
          height: boardSize,
          maxPieces: 6,
          priority: 3
        },
        // 下側エリア（実際の利用可能高さをフル活用）
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: bottomHeight,
          maxPieces: 12,
          priority: 4
        }
      ]
    };
  }
  
  // タブレット（768px-1200px）
  if (containerWidth > 768) {
    const bottomHeight = Math.max(100, bottomSpace);
    
    console.log('配置戦略: タブレット');
    console.log(`下エリア高さ候補: ${bottomHeight}`);
    
    // サイドスペースが狭い場合は下部のみ使用
    if (sideSpace < maxPieceWidth + margin * 2) {
      console.log('サイドスペース不足のため上部と下部を使用');
      return {
        type: 'tablet',
        areas: [
          // 上側エリア
          {
            x: margin,
            y: margin,
            width: containerWidth - margin * 2,
            height: Math.max(50, topSpace),
            maxPieces: 10,
            priority: 1
          },
          // 下側エリアのみ
          {
            x: margin,
            y: gridBottom + margin,
            width: containerWidth - margin * 2,
            height: bottomHeight,
            maxPieces: 14,
            priority: 2
          }
        ]
      };
    }
    
    const sideWidth = Math.min(sideSpace - margin, maxPieceWidth * 1.5 + margin * 2);
    
    return {
      type: 'tablet',
      areas: [
        // 上側エリア
        {
          x: margin,
          y: margin,
          width: containerWidth - margin * 2,
          height: Math.max(50, topSpace),
          maxPieces: 6,
          priority: 1
        },
        // 左側エリア
        {
          x: Math.max(margin, gridCenterX - boardSize / 2 - sideWidth - margin),
          y: gridTop,
          width: sideWidth,
          height: boardSize,
          maxPieces: 4,
          priority: 2
        },
        // 右側エリア
        {
          x: gridCenterX + boardSize / 2 + margin,
          y: gridTop,
          width: sideWidth,
          height: boardSize,
          maxPieces: 4,
          priority: 3
        },
        // 下側エリア
        {
          x: margin,
          y: gridBottom + margin,
          width: containerWidth - margin * 2,
          height: Math.max(100, bottomSpace),
          maxPieces: 12,
          priority: 4
        }
      ]
    };
  }
  
  // モバイル（768px以下）
  // 実際の利用可能高さをフル活用
  const mobileBottomHeight = Math.max(150, bottomSpace);
  
  console.log('配置戦略: モバイル');
  console.log(`下エリア高さ: ${mobileBottomHeight}`);
  
  return {
    type: 'mobile',
    areas: [
      // 上側エリア（上部スペース活用）
      {
        x: margin,
        y: margin,
        width: containerWidth - margin * 2,
        height: Math.max(50, topSpace),
        maxPieces: 12,
        priority: 1
      },
      // 下側のみ（実際の利用可能高さをフル活用）
      {
        x: margin,
        y: gridBottom + margin,
        width: containerWidth - margin * 2,
        height: mobileBottomHeight,
        maxPieces: 12,
        priority: 2
      }
    ]
  };
};

// 改善されたグリッド配置アルゴリズム（安定版）
const arrangeInArea = (
  pieces: Piece[],
  area: { x: number; y: number; width: number; height: number; maxPieces: number; priority?: number },
  cellSize: number = 50,
  excludedArea: { x: number; y: number; width: number; height: number } | null = null
): Array<{ piece: Piece; position: Position }> => {
  console.log(`\n--- エリア内配置開始 (優先度: ${area.priority}) ---`);
  console.log(`エリア: x=${area.x}, y=${area.y}, 幅=${area.width}, 高さ=${area.height}`);
  console.log(`最大ピース数: ${area.maxPieces}, 配置候補ピース数: ${pieces.length}`);
  
  const positions: Array<{ piece: Piece; position: Position }> = [];
  const occupiedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  
  const padding = 12;
  
  // ピースをサイズでソート
  const sortedPieces = [...pieces].sort((a, b) => {
    const boundsA = calculatePieceBounds(a, cellSize);
    const boundsB = calculatePieceBounds(b, cellSize);
    return (boundsB.width * boundsB.height) - (boundsA.width * boundsA.height);
  });
  
  // 行ベースの配置でスペースを最大限活用
  let currentX = area.x;
  let currentY = area.y;
  let rowHeight = 0;
  
  for (const piece of sortedPieces) {
    if (positions.length >= area.maxPieces) {
      console.log(`エリアの最大ピース数に到達`);
      break;
    }
    
    const bounds = calculatePieceBounds(piece, cellSize);
    
    // 次の行に移動が必要かチェック
    if (currentX + bounds.width > area.x + area.width) {
      console.log(`ピース${piece.id}: 行幅を超えるため次の行へ`);
      currentX = area.x;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }
    
    // エリアの高さを超える場合はスキップ
    if (currentY + bounds.height > area.y + area.height) {
      console.log(`ピース${piece.id}: エリア高さを超えるためスキップ (現在Y=${currentY}, ピース高=${bounds.height}, エリア下端=${area.y + area.height})`);
      break; // エリアの高さを超えたら終了
    }
    
    // 位置を決定（エリア内に収める）
    const position = {
      x: Math.min(currentX, Math.max(area.x, area.x + area.width - bounds.width)),
      y: Math.min(currentY, Math.max(area.y, area.y + area.height - bounds.height))
    };
    
    // 重複チェック用の矩形
    const pieceRect = {
      x: position.x,
      y: position.y,
      width: bounds.width,
      height: bounds.height
    };
    
    // 重複チェック
    const hasOverlap = occupiedRects.some(rect => doRectsOverlap(pieceRect, rect, padding));
    const hasGridOverlap = excludedArea && doRectsOverlap(pieceRect, excludedArea, padding);
    
    if (!hasOverlap && !hasGridOverlap) {
      console.log(`ピース${piece.id}: 配置成功 (${position.x}, ${position.y})`);
      positions.push({ piece, position });
      occupiedRects.push(pieceRect);
      
      // 次の位置を更新
      currentX = position.x + bounds.width + padding;
      rowHeight = Math.max(rowHeight, bounds.height);
    } else {
      console.log(`ピース${piece.id}: 重複のためスキップ (ピース重複:${hasOverlap}, グリッド重複:${hasGridOverlap})`);
    }
  }
  
  console.log(`エリア内配置結果: ${positions.length}個配置`);
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
  console.log('\n========== ピース初期配置計算開始 ==========');
  console.log(`入力パラメータ:`);
  console.log(`  コンテナ: ${containerWidth}x${containerHeight}`);
  console.log(`  セルサイズ: ${cellSize}`);
  console.log(`  グリッドオフセット: (${gridOffset.x}, ${gridOffset.y})`);
  console.log(`  ピース数: ${pieces.length}`);
  
  // ビューポートサイズが小さすぎる場合の最小値を設定
  const effectiveWidth = containerWidth > 0 ? Math.max(containerWidth, 400) : 1600;
  const effectiveHeight = containerHeight > 0 ? Math.max(containerHeight, 600) : 1000;
  console.log(`実効コンテナサイズ: ${effectiveWidth}x${effectiveHeight}`);
  
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
  
  // 配置戦略を取得（ピースサイズ情報とグリッドオフセットを渡す）
  const strategy = getPlacementStrategy(effectiveWidth, effectiveHeight, cellSize, pieceBounds, gridOffset);
  
  // エリアが小さすぎる場合は有効なエリアのみを使用
  const validAreas = strategy.areas
    .filter(area => area.width > 30 && area.height > 30)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999)); // 優先度順にソート
  
  console.log(`\n有効な配置エリア数: ${validAreas.length}`);
  validAreas.forEach((area, i) => {
    console.log(`  エリア${i+1} (優先度${area.priority}): (${area.x}, ${area.y}) サイズ:${area.width}x${area.height} 最大${area.maxPieces}個`);
  });
  
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
    if (unplacedPieces.length === 0) {
      console.log('すべてのピースが配置済み');
      break;
    }
    
    console.log(`\n未配置ピース: ${unplacedPieces.length}個`);
    const piecesToPlace = unplacedPieces.slice(0, area.maxPieces);
    const areaPositions = arrangeInArea(piecesToPlace, area, cellSize, gridBounds);
    
    areaPositions.forEach(pos => {
      allPositions.push(pos);
      placedPieceIds.add(pos.piece.id);
    });
  }
  
  // 改善されたフォールバック配置（安定版）
  const unplacedPieces = pieces.filter(p => !placedPieceIds.has(p.id));
  if (unplacedPieces.length > 0) {
    console.log(`\n警告: ${unplacedPieces.length}個のピースがエリア内に配置できず、フォールバック配置を使用`);
    console.log(`未配置ピースID: ${unplacedPieces.map(p => p.id).join(', ')}`);
    
    const margin = 20;
    const padding = 12;
    const safeZoneTop = Math.max(gridBounds.y + gridBounds.height + margin, 100);
    console.log(`フォールバックエリア: Y=${safeZoneTop}から開始`);
    
    // シンプルな行ベース配置で重複回避
    let currentX = margin;
    let currentY = safeZoneTop;
    let rowHeight = 0;
    
    for (const piece of unplacedPieces) {
      const bounds = calculatePieceBounds(piece, cellSize);
      
      // 次の行に移動が必要かチェック
      if (currentX + bounds.width > effectiveWidth - margin) {
        currentX = margin;
        currentY += rowHeight + padding;
        rowHeight = 0;
      }
      
      // 画面境界内に収める
      const maxX = Math.max(margin, effectiveWidth - bounds.width - margin);
      const maxY = Math.max(safeZoneTop, effectiveHeight - bounds.height - margin);
      
      const position = {
        x: Math.min(currentX, maxX),
        y: Math.min(currentY, maxY)
      };
      
      console.log(`ピース${piece.id}: フォールバック位置 (${position.x}, ${position.y})`);
      allPositions.push({ piece, position });
      placedPieceIds.add(piece.id);
      
      // 次の位置を更新
      currentX += bounds.width + padding;
      rowHeight = Math.max(rowHeight, bounds.height);
    }
  }
  
  // ピースの元の順番を保持して返す
  console.log(`\n最終結果: ${placedPieceIds.size}/${pieces.length}個のピースを配置`);
  console.log('========== ピース初期配置計算終了 ==========\n');
  
  return pieces.map(piece => {
    const found = allPositions.find(p => p.piece.id === piece.id);
    if (!found) {
      // 万が一配置できなかった場合の最終フォールバック
      console.log(`エラー: ピース${piece.id}の位置が見つからず、緊急フォールバック位置を使用`);
      const bounds = calculatePieceBounds(piece, cellSize);
      const safeX = Math.max(20, Math.min(50, effectiveWidth - bounds.width - 20));
      const safeY = Math.max(50, Math.min(100, effectiveHeight - bounds.height - 20));
      return { piece, position: { x: safeX, y: safeY } };
    }
    return found;
  });
};