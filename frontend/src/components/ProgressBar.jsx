import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ value, color = '#007bff', height = '8px', className = '' }) => {
  return (
    <div className={`progress-bar-container ${className}`} style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{
          width: `${value}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
};

export default ProgressBar;