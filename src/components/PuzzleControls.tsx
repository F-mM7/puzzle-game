import React from 'react';

interface PuzzleControlsProps {
  onReset: () => void;
  onGenerateNew: () => void;
}

export const PuzzleControls: React.FC<PuzzleControlsProps> = ({ 
  onReset, 
  onGenerateNew 
}) => {
  return (
    <div className="control-buttons">
      <button onClick={onReset} className="reset-button">
        Reset
      </button>
      
      <button 
        onClick={onGenerateNew} 
        className="generate-button"
      >
        New
      </button>
    </div>
  );
};