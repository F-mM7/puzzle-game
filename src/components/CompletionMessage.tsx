import React from 'react';

interface CompletionMessageProps {
  isComplete: boolean;
}

export const CompletionMessage: React.FC<CompletionMessageProps> = ({ isComplete }) => {
  if (!isComplete) return null;
  
  return (
    <div className="completion-message">
      🎉 PUZZLE COMPLETED!
    </div>
  );
};