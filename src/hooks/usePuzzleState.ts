import { useState, useCallback, useEffect } from 'react';
import type { Puzzle, Piece, Cell, Position } from '../types/puzzle';
import { calculateInitialPositions } from '../utils/pieceLayout';
import { generatePuzzle } from '../algorithms/generator';
import { saveGameState, puzzleToSavedState } from '../utils/storage';

interface UsePuzzleStateReturn {
  puzzle: Puzzle;
  defaultPositions: Map<number, Position>;
  isComplete: boolean;
  placePiece: (pieceId: number, dropX: number, dropY: number, gridX: number, gridY: number) => void;
  removePiece: (pieceId: number) => void;
  resetPuzzle: () => void;
  generateNewPuzzle: () => void;
}

export const usePuzzleState = (
  initialPuzzle: Puzzle,
  containerSize: { width: number; height: number } = { width: 1600, height: 1000 },
  gridOffset: Position = { x: 0, y: 0 },
  cellSize: number = 50
): UsePuzzleStateReturn => {
  const createPuzzleWithPositions = useCallback((basePuzzle: Puzzle): { puzzle: Puzzle, defaultPositions: Map<number, Position> } => {
    // gridOffsetが無効な場合はデフォルト値を使用
    const validGridOffset = (gridOffset.x > 0 && gridOffset.y > 0) ? gridOffset : { x: 0, y: 0 };
    
    
    const positions = calculateInitialPositions(
      basePuzzle.pieces,
      containerSize.width || 1600,
      containerSize.height || 1000,
      cellSize,
      validGridOffset
    );
    const defaultPositions = new Map<number, Position>();
    
    // グリッドを完全に初期化（重要！）
    const freshGrid = Array(basePuzzle.size).fill(null).map(() => 
      Array(basePuzzle.size).fill(null).map(() => ({ pieceId: null }))
    );
    
    const puzzle = {
      ...basePuzzle,
      grid: freshGrid, // 新しい空のグリッドを使用
      pieces: basePuzzle.pieces.map((piece, index) => {
        const position = positions[index].position;
        defaultPositions.set(piece.id, position);
        return {
          ...piece,
          screenPosition: position,  // 未配置ピースは画面座標で管理
          gridPosition: undefined,   // 初期状態では未配置
          isPlaced: false
        };
      })
    };
    
    return { puzzle, defaultPositions };
  }, [containerSize.width, containerSize.height, gridOffset, cellSize]);

  const [originalPuzzle, setOriginalPuzzle] = useState<Puzzle>(() => {
    // originalPuzzleもグリッドをクリアして保存
    const cleanGrid = Array(initialPuzzle.size).fill(null).map(() => 
      Array(initialPuzzle.size).fill(null).map(() => ({ pieceId: null }))
    );
    return {
      ...initialPuzzle,
      grid: cleanGrid
    };
  });
  
  // 初期状態では位置計算を行わず、DOM確定後に初期化
  const [puzzle, setPuzzle] = useState<Puzzle>(() => {
    const cleanGrid = Array(initialPuzzle.size).fill(null).map(() => 
      Array(initialPuzzle.size).fill(null).map(() => ({ pieceId: null }))
    );
    return {
      ...initialPuzzle,
      grid: cleanGrid, // 初期状態でもクリーンなグリッド
      pieces: initialPuzzle.pieces.map(piece => ({
        ...piece,
        screenPosition: { x: 0, y: 0 }, // 仮の位置
        gridPosition: undefined,
        isPlaced: false
      }))
    };
  });
  const [defaultPositions, setDefaultPositions] = useState<Map<number, Position>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // gridOffsetが確定したら初期化時のみピース位置を再計算
  useEffect(() => {
    console.log('初期化チェック:', {
      gridOffset,
      containerSize,
      isInitialized,
      'gridOffset有効': (gridOffset.x > 0 && gridOffset.y > 0),
      'containerSize有効': (containerSize.width > 0 && containerSize.height > 0)
    });
    
    // gridOffsetが正の値（DOM確定後）かつcontainerSizeも確定している場合のみ実行
    if ((gridOffset.x > 0 && gridOffset.y > 0) && 
        (containerSize.width > 0 && containerSize.height > 0) && 
        !isInitialized) {
      console.log('初期化実行: ピース位置を計算中...');
      const newData = createPuzzleWithPositions(originalPuzzle);
      setPuzzle(newData.puzzle);
      setDefaultPositions(newData.defaultPositions);
      setIsInitialized(true);
    }
  }, [gridOffset, containerSize, originalPuzzle, isInitialized, createPuzzleWithPositions]);

  // gridOffsetが変更された時に既存の配置済みピースの位置を更新
  useEffect(() => {
    if (isInitialized && (gridOffset.x > 0 && gridOffset.y > 0)) {
      const hasPlacedPieces = puzzle.pieces.some(piece => piece.isPlaced && piece.gridPosition);
      if (hasPlacedPieces) {
        
        // 配置済みピースの位置を強制的に再計算するためにpuzzle状態を更新
        setPuzzle(currentPuzzle => ({
          ...currentPuzzle,
          pieces: currentPuzzle.pieces.map(piece => ({ ...piece })) // 強制的にオブジェクト再作成
        }));
      }
    }
    // puzzle.piecesを依存配列に含めると無限ループが発生するため意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridOffset, isInitialized]);

  const canPlacePiece = useCallback((piece: Piece, startX: number, startY: number, grid: Cell[][]): boolean => {
    for (const cell of piece.cells) {
      const gridX = startX + cell.x;
      const gridY = startY + cell.y;
      
      if (gridX < 0 || gridX >= puzzle.size || gridY < 0 || gridY >= puzzle.size) {
        return false;
      }
      
      if (grid[gridY][gridX].pieceId !== null && grid[gridY][gridX].pieceId !== piece.id) {
        return false;
      }
    }
    return true;
  }, [puzzle.size]);

  const checkCompletion = useCallback((grid: Cell[][]) => {
    const allCellsFilled = grid.every(row => 
      row.every(cell => cell.pieceId !== null)
    );
    setIsComplete(allCellsFilled);
  }, []);

  const placePiece = useCallback((pieceId: number, _dropX: number, _dropY: number, gridX: number, gridY: number) => {
    const piece = puzzle.pieces.find(p => p.id === pieceId);
    if (!piece) return;

    const newGrid = puzzle.grid.map(row => row.map(cell => 
      cell.pieceId === pieceId ? { pieceId: null } : cell
    ));

    // Check if position is within grid bounds and if we can place at grid position
    const isInGridArea = gridX >= 0 && gridX < puzzle.size && gridY >= 0 && gridY < puzzle.size;
    
    if (isInGridArea && canPlacePiece(piece, gridX, gridY, newGrid)) {
      for (const cell of piece.cells) {
        const gx = gridX + cell.x;
        const gy = gridY + cell.y;
        if (gx >= 0 && gx < puzzle.size && gy >= 0 && gy < puzzle.size) {
          newGrid[gy][gx].pieceId = pieceId;
        }
      }


      const newPieces = puzzle.pieces.map(p => 
        p.id === pieceId 
          ? { 
              ...p, 
              gridPosition: { gridX, gridY },  // グリッド座標で配置を記録
              screenPosition: undefined,       // 画面座標はクリア
              isPlaced: true 
            }
          : p
      );

      setPuzzle({
        ...puzzle,
        grid: newGrid,
        pieces: newPieces
      });

      checkCompletion(newGrid);
    } else {
      const defaultPosition = defaultPositions.get(pieceId);
      
      const newPieces = puzzle.pieces.map(p => {
        if (p.id === pieceId) {
          const newPosition = defaultPosition || { x: 50, y: 50 };
          
          return {
            ...p,
            screenPosition: newPosition,  // 画面座標に復帰
            gridPosition: undefined,      // グリッド座標をクリア
            isPlaced: false
          };
        }
        return p;
      });

      setPuzzle({
        ...puzzle,
        grid: newGrid,
        pieces: newPieces
      });
    }
  }, [puzzle, defaultPositions, canPlacePiece, checkCompletion]);

  const removePiece = useCallback((pieceId: number) => {
    const newGrid = puzzle.grid.map(row => row.map(cell => 
      cell.pieceId === pieceId ? { pieceId: null } : cell
    ));
    
    const defaultPosition = defaultPositions.get(pieceId);
    
    const newPieces = puzzle.pieces.map(p => {
      if (p.id === pieceId) {
        return {
          ...p,
          screenPosition: defaultPosition || { x: 50, y: 50 },
          gridPosition: undefined,
          isPlaced: false
        };
      }
      return p;
    });

    setPuzzle({
      ...puzzle,
      grid: newGrid,
      pieces: newPieces
    });
    
    setIsComplete(false);
  }, [puzzle, defaultPositions]);

  const resetPuzzle = useCallback(() => {
    console.log('リセット実行:', {
      gridOffset,
      containerSize,
      'gridOffset有効': (gridOffset.x > 0 && gridOffset.y > 0),
      'containerSize有効': (containerSize.width > 0 && containerSize.height > 0)
    });
    const resetData = createPuzzleWithPositions(originalPuzzle);
    setPuzzle(resetData.puzzle);
    setDefaultPositions(resetData.defaultPositions);
    setIsComplete(false);
    setIsInitialized(true); // リセット時は初期化済みとする
  }, [originalPuzzle, createPuzzleWithPositions, gridOffset, containerSize]);

  const generateNewPuzzle = useCallback(() => {
    const basePuzzle = generatePuzzle(puzzle.size);
    // 新しいパズルのグリッドをクリア
    const cleanGrid = Array(basePuzzle.size).fill(null).map(() => 
      Array(basePuzzle.size).fill(null).map(() => ({ pieceId: null }))
    );
    const newPuzzle = {
      ...basePuzzle,
      grid: cleanGrid
    };
    
    const newData = createPuzzleWithPositions(newPuzzle);

    setOriginalPuzzle(newPuzzle);
    setPuzzle(newData.puzzle);
    setDefaultPositions(newData.defaultPositions);
    setIsComplete(false);
    setIsInitialized(true); // 新しいパズル生成時も初期化済みとする

    // 新しいパズルをLocalStorageに保存
    saveGameState(puzzleToSavedState(newPuzzle));
  }, [createPuzzleWithPositions, puzzle.size]);

  return {
    puzzle,
    defaultPositions,
    isComplete,
    placePiece,
    removePiece,
    resetPuzzle,
    generateNewPuzzle
  };
};