"use client";

import { forwardRef } from "react";

interface FormTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormTextArea = forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  function FormTextArea({ label, error, hint, id, className, ...props }, ref) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-md border px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors ${
            error
              ? "border-danger bg-danger/5 focus:border-danger"
              : "border-navy-800 bg-navy-950 focus:border-accent"
          }`}
          rows={4}
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
