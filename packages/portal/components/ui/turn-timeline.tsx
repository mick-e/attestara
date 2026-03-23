import { ProofBadge } from "./proof-badge";

interface Turn {
  id: string;
  agentId: string;
  terms: Record<string, unknown>;
  proofStatus: string;
  createdAt: string;
}

export function TurnTimeline({ turns }: { turns: Turn[] }) {
  if (turns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No negotiation turns yet
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-0 h-full w-px bg-navy-800" />

      <div className="space-y-6">
        {turns.map((turn, i) => (
          <div key={turn.id} className="relative">
            {/* Dot */}
            <div
              className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ${
                i === 0
                  ? "border-accent bg-accent/20"
                  : "border-navy-800 bg-navy-950"
              }`}
            />

            <div className="rounded-lg border border-navy-800 bg-navy-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {turn.agentId}
                </span>
                <time className="text-xs text-gray-500">
                  {new Date(turn.createdAt).toLocaleString()}
                </time>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                {Object.entries(turn.terms)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <span key={k} className="mr-3">
                      <span className="text-gray-500">{k}:</span>{" "}
                      {String(v)}
                    </span>
                  ))}
              </div>

              <div className="mt-2">
                <ProofBadge
                  status={
                    turn.proofStatus as
                      | "generating"
                      | "verified"
                      | "on-chain"
                      | "failed"
                  }
                  circuit="turn"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
