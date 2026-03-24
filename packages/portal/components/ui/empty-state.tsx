interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title,
  description,
  icon = "\u2205",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-navy-800 bg-navy-900 px-6 py-16 text-center">
      <span className="mb-4 text-4xl text-gray-600">{icon}</span>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-400">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
