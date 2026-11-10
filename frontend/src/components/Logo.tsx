import React from 'react';

/** LEVIX wordmark. */
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-logo uppercase leading-none tracking-[-0.02em] select-none ${className}`} aria-label="LEVIX">
    LEVIX
  </span>
);
