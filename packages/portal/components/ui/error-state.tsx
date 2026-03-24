interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 px-6 py-16 text-center">
      <span className="mb-4 text-4xl text-danger">{"\u26A0"}</span>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
