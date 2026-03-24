export function LoadingSpinner({
  size = "md",
  label,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-accent/30 border-t-accent ${sizeClasses[size]}`}
      />
      {label && <p className="text-sm text-gray-400">{label}</p>}
    </div>
  );
}
