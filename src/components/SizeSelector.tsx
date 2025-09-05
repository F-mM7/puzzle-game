import { useState } from 'react';
import './SizeSelector.css';

interface SizeSelectorProps {
  currentSize: number;
  onSizeChange: (size: number) => void;
}

const GRID_SIZES = [
  { size: 6, label: '6×6' },
  { size: 7, label: '7×7' },
  { size: 8, label: '8×8' },
];

export const SizeSelector = ({ currentSize, onSizeChange }: SizeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentSizeInfo = GRID_SIZES.find(s => s.size === currentSize) || GRID_SIZES[0];

  const handleSizeSelect = (size: number) => {
    onSizeChange(size);
    setIsOpen(false);
  };

  return (
    <div className="size-selector">
      <button 
        className="size-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="size-label">{currentSizeInfo.label}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="size-options">
          {GRID_SIZES.map(({ size, label }) => (
            <button
              key={size}
              className={`size-option ${size === currentSize ? 'selected' : ''}`}
              onClick={() => handleSizeSelect(size)}
            >
              <span className="size-label">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};