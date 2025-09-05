import type { GeneratorPiece } from './types';
import { COLOR_PALETTE } from '../../constants/colors';

const shuffleArray = <T>(array: readonly T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const assignUniqueColors = (pieces: GeneratorPiece[]): void => {
  const shuffledColors = shuffleArray(COLOR_PALETTE);
  
  pieces.forEach((piece, index) => {
    if (index < shuffledColors.length) {
      piece.color = shuffledColors[index] as string;
    } else {
      piece.color = shuffledColors[index % shuffledColors.length] as string;
    }
  });
};