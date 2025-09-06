import { useState, useEffect } from 'react';
import { PuzzleGame } from './components/PuzzleGame';
import { generatePuzzle } from './algorithms/generator';
import { loadGameState, saveGameState, puzzleToSavedState } from './utils/storage';
import { decodePuzzleFromURL, clearURLPuzzle } from './utils/urlShare';
import type { Puzzle } from './types/puzzle';
import type { SavedGameState } from './types/storage';
import './App.css';

// 保存データからPuzzleオブジェクトを復元
const restorePuzzleFromSaved = (savedState: SavedGameState): Puzzle => {
  return {
    pieces: savedState.pieces.map(piece => ({
      ...piece,
      isPlaced: false,
      gridPosition: undefined,
      screenPosition: undefined // usePuzzleStateで位置計算される
    })),
    grid: Array(savedState.puzzleSize).fill(null).map(() => 
      Array(savedState.puzzleSize).fill(null).map(() => ({ pieceId: null }))
    ),
    size: savedState.puzzleSize
  };
};

function App() {
  const [gridSize, setGridSize] = useState(6);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化時にURLまたはLocalStorageから復元
  useEffect(() => {
    if (isInitialized) return;

    // 1. URLから復元を試行
    const urlPuzzleData = decodePuzzleFromURL();
    if (urlPuzzleData) {
      const restoredPuzzle = restorePuzzleFromSaved(urlPuzzleData);
      setGridSize(urlPuzzleData.puzzleSize);
      setCurrentPuzzle(restoredPuzzle);
      
      // LocalStorageに保存
      saveGameState(urlPuzzleData);
      
      // URLをクリア
      clearURLPuzzle();
      
      setIsInitialized(true);
      return;
    }

    // 2. LocalStorageから復元を試行
    const savedState = loadGameState();
    if (savedState) {
      const restoredPuzzle = restorePuzzleFromSaved(savedState);
      setGridSize(savedState.puzzleSize);
      setCurrentPuzzle(restoredPuzzle);
      setIsInitialized(true);
      return;
    }

    // 3. 新規パズル生成
    const newPuzzle = generatePuzzle(6);
    setCurrentPuzzle(newPuzzle);
    setIsInitialized(true);
  }, [isInitialized]);

  const handleSizeChange = (newSize: number) => {
    setGridSize(newSize);
    const newPuzzle = generatePuzzle(newSize);
    setCurrentPuzzle(newPuzzle);

    // サイズ変更時も保存する
    saveGameState(puzzleToSavedState(newPuzzle));
  };

  // 初期化完了まで何も表示しない
  if (!isInitialized || !currentPuzzle) {
    return <div className="app">Loading...</div>;
  }
  
  return (
    <div className="app">
      <main className="app-main">
        <PuzzleGame 
          initialPuzzle={currentPuzzle} 
          currentSize={gridSize}
          onSizeChange={handleSizeChange}
          key={`${gridSize}-${currentPuzzle.pieces.length}`} 
        />
      </main>
    </div>
  );
}

export default App;