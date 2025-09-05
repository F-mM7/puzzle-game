export interface GeneratorPiece {
  id: number;
  cells: Set<string>; // "x,y" 形式のセル座標
  color: string;
}

export interface GeneratorState {
  pieces: GeneratorPiece[];
  size: number;
  nextId: number;
}