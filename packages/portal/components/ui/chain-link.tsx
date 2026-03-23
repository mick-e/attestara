export function ChainLink({
  txHash,
  chainId = 421614,
}: {
  txHash: string;
  chainId?: number;
}) {
  const explorerBase =
    chainId === 42161
      ? "https://arbiscan.io"
      : "https://sepolia.arbiscan.io";

  return (
    <a
      href={`${explorerBase}/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover underline"
    >
      {txHash.slice(0, 6)}...{txHash.slice(-4)}
      <span className="text-xs">{"\u2197"}</span>
    </a>
  );
}
