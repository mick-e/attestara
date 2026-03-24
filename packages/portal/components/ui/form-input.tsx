"use client";

import { forwardRef } from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ label, error, hint, id, className, ...props }, ref) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors ${
            error
              ? "border-danger bg-danger/5 focus:border-danger"
              : "border-navy-800 bg-navy-950 focus:border-accent"
          }`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  },
);
