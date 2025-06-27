import React from 'react';

const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  className = '',
  ...props
}) => {
  const inputClasses = `
    block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400
    focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
    ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;