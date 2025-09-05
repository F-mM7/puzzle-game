import type { Puzzle } from '../../types/puzzle';
import type { GeneratorState } from './types';
import { assignUniqueColors } from './colors';
import {
  cellKey,
  getAdjacentPairs,
  selectPairByScore,
  mergePieces,
  generatorStateToPuzzle,
} from './utils';
import { hasUniqueSolution } from './solver';

const createInitialState = (size: number = 6): GeneratorState => {
  const pieces = [];
  let id = 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pieces.push({
        id,
        cells: new Set([cellKey(x, y)]),
        color: '#TEMPORARY',
      });
      id++;
    }
  }

  return {
    pieces,
    size,
    nextId: id,
  };
};

/**
 * ピースの併合処理を1回実行し、新しい状態を返す
 * @param state 現在のジェネレータ状態
 * @returns 併合後の新しい状態、または併合不可の場合はnull
 */
const performMergeStep = (state: GeneratorState): GeneratorState | null => {
  const adjacentPairs = getAdjacentPairs(state.pieces);

  if (adjacentPairs.length === 0) {
    return null; // 併合不可
  }

  const [index1, index2] = selectPairByScore(state.pieces, adjacentPairs);
  const piece1 = state.pieces[index1];
  const piece2 = state.pieces[index2];

  const mergedPiece = mergePieces(piece1, piece2, state.nextId);

  const newPieces = state.pieces
    .filter((_, i) => i !== index1 && i !== index2)
    .concat([mergedPiece]);

  return {
    pieces: newPieces,
    size: state.size,
    nextId: state.nextId + 1,
  };
};

export const generatePuzzle = (size: number = 6): Puzzle => {
  let state = createInitialState(size);

  // サイズに応じた無条件併合回数を設定
  const targetUnconditionalMerges =
    size === 8
      ? 45 // 8x8: 64ピース → 45回併合
      : size === 7
        ? 34 // 7x7: 49ピース → 34回併合
        : 24; // その他(6x6): 24回併合

  // 無条件併合フェーズ
  let unconditionalMerges = 0;
  while (unconditionalMerges < targetUnconditionalMerges) {
    const newState = performMergeStep(state);
    if (newState === null) {
      break; // これ以上併合できない
    }
    state = newState;
    unconditionalMerges++;
  }

  // 条件付き併合フェーズ（一意解チェック付き）
  while (true) {
    const newState = performMergeStep(state);
    if (newState === null) {
      break; // これ以上併合できない
    }

    if (hasUniqueSolution(newState)) {
      assignUniqueColors(newState.pieces);
      return generatorStateToPuzzle(newState);
    }

    state = newState;
  }

  assignUniqueColors(state.pieces);
  return generatorStateToPuzzle(state);
};
