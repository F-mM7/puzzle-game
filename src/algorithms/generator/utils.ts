import type { Puzzle, Piece, Position } from '../../types/puzzle';
import type { GeneratorPiece, GeneratorState } from './types';
import { getEvaluationBase } from './config';

export const cellKey = (x: number, y: number): string => `${x},${y}`;

export const parseCell = (key: string): Position => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

const areAdjacent = (cell1: string, cell2: string): boolean => {
  const { x: x1, y: y1 } = parseCell(cell1);
  const { x: x2, y: y2 } = parseCell(cell2);
  
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
};

const arePiecesAdjacent = (piece1: GeneratorPiece, piece2: GeneratorPiece): boolean => {
  for (const cell1 of piece1.cells) {
    for (const cell2 of piece2.cells) {
      if (areAdjacent(cell1, cell2)) {
        return true;
      }
    }
  }
  return false;
};

export const getAdjacentPairs = (pieces: GeneratorPiece[]): [number, number][] => {
  const pairs: [number, number][] = [];
  
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (arePiecesAdjacent(pieces[i], pieces[j])) {
        pairs.push([i, j]);
      }
    }
  }
  
  return pairs;
};

export const calculatePairScore = (
  piece1: GeneratorPiece, 
  piece2: GeneratorPiece,
  base?: number
): number => {
  const evaluationBase = base ?? getEvaluationBase();
  const x = piece1.cells.size;
  const y = piece2.cells.size;
  return Math.pow(evaluationBase, -x) + Math.pow(evaluationBase, -y);
};

export const selectPairByScore = (
  pieces: GeneratorPiece[], 
  adjacentPairs: [number, number][],
  base?: number
): [number, number] => {
  const scores = adjacentPairs.map(([i, j]) => 
    calculatePairScore(pieces[i], pieces[j], base)
  );
  
  const adjustedScores = scores;
  
  const totalScore = adjustedScores.reduce((sum, score) => sum + score, 0);
  const cumulativeProbs = [];
  let cumulative = 0;
  
  for (const score of adjustedScores) {
    cumulative += score / totalScore;
    cumulativeProbs.push(cumulative);
  }
  
  const random = Math.random();
  const selectedIndex = cumulativeProbs.findIndex(prob => random <= prob);
  
  return adjacentPairs[selectedIndex >= 0 ? selectedIndex : adjacentPairs.length - 1];
};

export const mergePieces = (piece1: GeneratorPiece, piece2: GeneratorPiece, newId: number): GeneratorPiece => {
  const mergedCells = new Set([...piece1.cells, ...piece2.cells]);
  
  return {
    id: newId,
    cells: mergedCells,
    color: '#TEMPORARY'
  };
};

export const haveSameShape = (piece1: GeneratorPiece, piece2: GeneratorPiece): boolean => {
  if (piece1.cells.size !== piece2.cells.size) return false;
  
  const cells1 = Array.from(piece1.cells).map(parseCell);
  const cells2 = Array.from(piece2.cells).map(parseCell);
  
  const minX1 = Math.min(...cells1.map(c => c.x));
  const minY1 = Math.min(...cells1.map(c => c.y));
  const minX2 = Math.min(...cells2.map(c => c.x));
  const minY2 = Math.min(...cells2.map(c => c.y));
  
  const normalized1 = cells1.map(c => `${c.x - minX1},${c.y - minY1}`).sort();
  const normalized2 = cells2.map(c => `${c.x - minX2},${c.y - minY2}`).sort();
  
  return normalized1.every((coord, i) => coord === normalized2[i]);
};


export const generatorPieceToRegularPiece = (genPiece: GeneratorPiece): Piece => {
  const cells: Position[] = Array.from(genPiece.cells).map(parseCell);
  
  const minX = Math.min(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  
  const normalizedCells = cells.map(cell => ({
    x: cell.x - minX,
    y: cell.y - minY
  }));
  
  return {
    id: genPiece.id,
    cells: normalizedCells,
    color: genPiece.color,
    screenPosition: undefined,
    gridPosition: undefined,
    isPlaced: false
  };
};

export const generatorStateToPuzzle = (state: GeneratorState): Puzzle => {
  const regularPieces = state.pieces.map(generatorPieceToRegularPiece);
  
  return {
    size: state.size,
    grid: Array(state.size).fill(null).map(() => 
      Array(state.size).fill(null).map(() => ({ pieceId: null }))
    ),
    pieces: regularPieces
  };
};