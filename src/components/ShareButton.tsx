import { useState } from 'react';
import type { SavedGameState } from '../types/storage';
import { copyShareURL } from '../utils/urlShare';
import './ShareButton.css';

interface ShareButtonProps {
  puzzle: SavedGameState;
}

export const ShareButton = ({ puzzle }: ShareButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    
    try {
      const success = await copyShareURL(puzzle);
      
      if (success) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to share puzzle:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button 
      className={`share-button ${showCopied ? 'copied' : ''}`}
      onClick={handleShare}
      disabled={isSharing}
    >
      {isSharing ? '...' : showCopied ? 'Copied!' : 'Share'}
    </button>
  );
};