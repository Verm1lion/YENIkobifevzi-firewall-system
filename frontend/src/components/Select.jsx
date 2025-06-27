import React from 'react';

const Select = ({
  value,
  onChange,
  options = [],
  placeholder,
  label,
  error,
  disabled = false,
  className = '',
  ...props
}) => {
  const selectClasses = `
    block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
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
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;