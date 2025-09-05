import type { SavedGameState, URLPuzzleData } from '../types/storage';
import { colorToIndex, indexToColor } from '../constants/colors';

// 座標をパックした数値に変換 (y * gridSize + x)
const packCoordinate = (x: number, y: number, gridSize: number): number => {
  return y * gridSize + x;
};

// パックされた数値を座標に復元
const unpackCoordinate = (packed: number, gridSize: number): { x: number; y: number } => {
  const y = Math.floor(packed / gridSize);
  const x = packed % gridSize;
  return { x, y };
};

/**
 * SavedGameStateをURL形式に変換
 */
const convertToURL = (state: SavedGameState): URLPuzzleData => {
  return {
    s: state.puzzleSize,
    p: state.pieces.map(piece => ({
      // IDは配列インデックスで代用するため省略
      c: piece.cells.map(cell => packCoordinate(cell.x, cell.y, state.puzzleSize)),
      cl: colorToIndex(piece.color)
    }))
  };
};

/**
 * URL形式をSavedGameStateに復元
 */
const restoreFromURL = (data: URLPuzzleData): SavedGameState => {
  return {
    version: '2.0.0',
    puzzleSize: data.s,
    pieces: data.p.map((piece, index) => ({
      id: index, // 配列インデックスをIDとして使用
      cells: piece.c.map(packed => unpackCoordinate(packed, data.s)),
      color: indexToColor(piece.cl)
    }))
  };
};

/**
 * データをバイナリ形式に変換してURL-safe Base64エンコード
 */
const encodeToBinary = (data: URLPuzzleData): string => {
  // バイナリ書き込み用のバッファを作成
  const pieces = data.p;
  const maxCellsPerPiece = Math.max(...pieces.map(p => p.c.length));
  
  // 概算サイズ: size(1) + pieces数(1) + pieces data (packed:1 + coords + 拡張時+1)
  // デルタ圧縮により座標データは削減されるが、余裕をもって推定
  const estimatedSize = 2 + pieces.length * (2 + maxCellsPerPiece * 2); // 拡張とデルタのマーカーを考慮
  const buffer = new ArrayBuffer(estimatedSize);
  const view = new DataView(buffer);
  let offset = 0;

  // グリッドサイズ
  view.setUint8(offset++, data.s);
  
  // ピース数
  view.setUint8(offset++, pieces.length);
  
  // 各ピースのデータ（IDは配列順序で代用）
  for (const piece of pieces) {
    // ビットパッキング: colorIndex(4bit) + cellCount(4bit) → 1byte
    if (piece.c.length >= 15) {
      // セル数が15以上の場合: 拡張形式
      const packedByte = (piece.cl << 4) | 15; // 15を特別値として使用
      view.setUint8(offset++, packedByte);
      view.setUint8(offset++, piece.c.length); // 実際のセル数を次のバイトに
    } else {
      // セル数が15未満の場合: 標準形式
      const packedByte = (piece.cl << 4) | piece.c.length;
      view.setUint8(offset++, packedByte);
    }
    
    // 座標データ（デルタ圧縮）
    if (piece.c.length > 0) {
      // ソートして連続性を最大化
      const sortedCoords = [...piece.c].sort((a, b) => a - b);
      
      // 最初の座標は絶対値として保存
      view.setUint8(offset++, sortedCoords[0]);
      
      // 2番目以降は差分（デルタ）として保存
      for (let i = 1; i < sortedCoords.length; i++) {
        const delta = sortedCoords[i] - sortedCoords[i - 1];
        
        if (delta < 128) {
          // 正の小さな差分 (0-127): 1byte
          view.setUint8(offset++, delta);
        } else {
          // 大きな差分 (128+): 特殊マーカー + 実際の値
          view.setUint8(offset++, 128); // マーカー
          view.setUint8(offset++, delta - 128);
        }
      }
    }
  }
  
  // 実際に使用したサイズにトリム
  const trimmedBuffer = buffer.slice(0, offset);
  const uint8Array = new Uint8Array(trimmedBuffer);
  
  // URL-safe Base64エンコード
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * URL-safe Base64デコードしてバイナリデータを復元
 */
const decodeFromBinary = (encoded: string): URLPuzzleData | null => {
  try {
    // URL-safe Base64デコード
    const padding = '='.repeat((4 - encoded.length % 4) % 4);
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + padding;
    const binary = atob(base64);
    
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    
    const view = new DataView(uint8Array.buffer);
    let offset = 0;
    
    // グリッドサイズ
    const size = view.getUint8(offset++);
    
    // ピース数
    const pieceCount = view.getUint8(offset++);
    
    const pieces = [];
    for (let i = 0; i < pieceCount; i++) {
      // ビットパッキング解除: 1byte → colorIndex(4bit) + cellCount(4bit)
      const packedByte = view.getUint8(offset++);
      const colorIndex = (packedByte >> 4) & 0x0F; // 上位4bitを取得
      let cellCount = packedByte & 0x0F;           // 下位4bitを取得
      
      if (cellCount === 15) {
        // 拡張形式: 次のバイトから実際のセル数を読み取り
        cellCount = view.getUint8(offset++);
      }
      
      // 座標データ（デルタ圧縮を復元）
      const cells = [];
      if (cellCount > 0) {
        // 最初の座標は絶対値
        const firstCoord = view.getUint8(offset++);
        cells.push(firstCoord);
        
        // 2番目以降は差分から復元
        let prevCoord = firstCoord;
        for (let j = 1; j < cellCount; j++) {
          const deltaOrMarker = view.getUint8(offset++);
          
          let delta;
          if (deltaOrMarker === 128) {
            // 大きな差分の場合、次のバイトから実際の差分を読み取り
            delta = 128 + view.getUint8(offset++);
          } else {
            // 小さな差分 (0-127)
            delta = deltaOrMarker;
          }
          
          const coord = prevCoord + delta;
          cells.push(coord);
          prevCoord = coord;
        }
      }
      
      pieces.push({ cl: colorIndex, c: cells }); // IDは配列順序で代用
    }
    
    return { s: size, p: pieces };
  } catch (error) {
    console.error('Failed to decode binary data:', error);
    return null;
  }
};

/**
 * パズルデータを共有用URLに変換
 */
export const encodePuzzleToURL = (puzzle: SavedGameState): string => {
  try {
    const optimized = convertToURL(puzzle);
    const encoded = encodeToBinary(optimized);
    
    const baseURL = window.location.origin + window.location.pathname;
    return `${baseURL}#p=${encoded}`;
  } catch (error) {
    console.error('Failed to encode puzzle to URL:', error);
    return window.location.href;
  }
};

/**
 * URLハッシュからパズルデータを復元
 */
export const decodePuzzleFromURL = (): SavedGameState | null => {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#p=')) {
      return null;
    }

    const encoded = hash.substring(3); // '#p='を除去
    
    // バイナリ形式での復元
    const urlData = decodeFromBinary(encoded);
    if (urlData) {
      return restoreFromURL(urlData);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to decode puzzle from URL:', error);
    return null;
  }
};

/**
 * URLを現在のパズルなしの状態にクリア
 */
export const clearURLPuzzle = (): void => {
  if (window.location.hash.startsWith('#p=')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
};

/**
 * 共有用URLをクリップボードにコピー
 */
export const copyShareURL = async (puzzle: SavedGameState): Promise<boolean> => {
  try {
    const shareURL = encodePuzzleToURL(puzzle);
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareURL);
    } else {
      // フォールバック: 古いブラウザ対応
      const textArea = document.createElement('textarea');
      textArea.value = shareURL;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    return true;
  } catch (error) {
    console.error('Failed to copy share URL:', error);
    return false;
  }
};