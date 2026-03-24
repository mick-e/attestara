"use client";

import { forwardRef } from "react";

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  function FormSelect(
    { label, error, hint, id, options, placeholder, className, ...props },
    ref,
  ) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-md border px-3 py-2 text-sm text-white outline-none transition-colors ${
            error
              ? "border-danger bg-danger/5 focus:border-danger"
              : "border-navy-800 bg-navy-950 focus:border-accent"
          }`}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-gray-500">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  },
);
