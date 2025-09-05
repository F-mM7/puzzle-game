import { DancingLinks, type ProblemSolver } from 'dancing-links';
import type { GeneratorState } from './types';
import { parseCell } from './utils';

const puzzleToExactCoverMatrix = (state: GeneratorState) => {
  const gridSize = state.size;
  const totalCells = gridSize * gridSize;
  
  const constraints: string[] = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      constraints.push(`cell_${x}_${y}`);
    }
  }
  
  for (let i = 0; i < state.pieces.length; i++) {
    constraints.push(`piece_${i}`);
  }
  
  return { constraints, totalCells };
};

const addPiecePlacements = (
  solver: ProblemSolver<string, 'simple'>,
  state: GeneratorState,
  constraintMap: Map<string, number>
) => {
  let rowIndex = 0;
  const addedRows: string[] = [];
  
  for (let pieceIndex = 0; pieceIndex < state.pieces.length; pieceIndex++) {
    const piece = state.pieces[pieceIndex];
    
    const cells = Array.from(piece.cells).map(parseCell);
    const minX = Math.min(...cells.map(c => c.x));
    const minY = Math.min(...cells.map(c => c.y));
    const normalizedCells = cells.map(c => ({ x: c.x - minX, y: c.y - minY }));
    
    for (let startY = 0; startY < state.size; startY++) {
      for (let startX = 0; startX < state.size; startX++) {
        const occupiedCells: number[] = [];
        let canPlace = true;
        
        for (const { x: pieceX, y: pieceY } of normalizedCells) {
          const gridX = startX + pieceX;
          const gridY = startY + pieceY;
          
          if (gridX < 0 || gridX >= state.size || gridY < 0 || gridY >= state.size) {
            canPlace = false;
            break;
          }
          
          const cellConstraintKey = `cell_${gridX}_${gridY}`;
          const cellIndex = constraintMap.get(cellConstraintKey);
          if (cellIndex !== undefined) {
            occupiedCells.push(cellIndex);
          }
        }
        
        if (canPlace && occupiedCells.length > 0) {
          const pieceConstraintKey = `piece_${pieceIndex}`;
          const pieceConstraintIndex = constraintMap.get(pieceConstraintKey);
          
          if (pieceConstraintIndex !== undefined) {
            const activeConstraints = [...occupiedCells, pieceConstraintIndex];
            const rowName = `piece_${pieceIndex}_at_${startX}_${startY}`;
            
            solver.addSparseConstraint(rowName, activeConstraints);
            addedRows.push(rowName);
            
            rowIndex++;
          }
        }
      }
    }
  }
  
  return rowIndex;
};

export const hasUniqueSolution = (state: GeneratorState): boolean => {
  const { constraints } = puzzleToExactCoverMatrix(state);
  
  const constraintMap = new Map<string, number>();
  constraints.forEach((constraint, index) => {
    constraintMap.set(constraint, index);
  });
  
  const dlx = new DancingLinks<string>();
  const solver = dlx.createSolver({ columns: constraints.length });
  
  addPiecePlacements(solver, state, constraintMap);
  
  const solutions = solver.find(2);
  const solutionCount = solutions.length;
  
  return solutionCount === 1;
};