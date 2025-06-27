import React from 'react';

const Card = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;