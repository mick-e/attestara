"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  StatusBadge,
  ProofBadge,
  LiveIndicator,
  TurnTimeline,
  LoadingSpinner,
  ErrorState,
  Modal,
} from "@/components/ui";
import { useSession, useSubmitTurn, getOrgIdFromToken } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient, type Turn } from "@/lib/api-client";

const mockSession = {
  id: "sess_01HZN5A1B2C3D4E5F6G7H8I9J0",
  status: "active",
  buyerAgent: { id: "ag_01HZN3KQXV7YJWF8RMTG5B2P4D", name: "procurement-bot-eu" },
  sellerAgent: { id: "ag_01HZN3KQXV7YJWF8RMTG5B2P5E", name: "sales-agent-na" },
  maxTurns: 10,
  currentTurn: 3,
  createdAt: "2026-03-22T14:30:00Z",
  merkleRoot: "0x7f3a9b2e4d6c8f1a0e5b7d3c9f2a4e6b8d0c1f3a5e7b9d2c4f6a8e0b1d3c5f7",
  estimatedGas: "220,000",
  turns: [
    { id: "turn_001", agentId: "procurement-bot-eu (Buyer)", terms: { value: "\u20AC400,000", delivery: "60 days", warranty: "24 months", payment: "Net 30" }, proofStatus: "verified" as const, createdAt: "2026-03-22T14:30:00Z" },
    { id: "turn_002", agentId: "sales-agent-na (Seller)", terms: { value: "\u20AC520,000", delivery: "45 days", warranty: "12 months", payment: "Net 15" }, proofStatus: "verified" as const, createdAt: "2026-03-22T14:35:00Z" },
    { id: "turn_003", agentId: "procurement-bot-eu (Buyer)", terms: { value: "\u20AC460,000", delivery: "50 days", warranty: "18 months", payment: "Net 30" }, proofStatus: "generating" as const, createdAt: "2026-03-22T14:40:00Z" },
  ],
  proofs: [
    { circuit: "MandateBound", status: "verified" as const, timeMs: 400, turn: 1 },
    { circuit: "CredFreshness", status: "verified" as const, timeMs: 350, turn: 1 },
    { circuit: "MandateBound", status: "verified" as const, timeMs: 420, turn: 2 },
    { circuit: "ParamRange", status: "verified" as const, timeMs: 510, turn: 2 },
    { circuit: "CredFreshness", status: "verified" as const, timeMs: 380, turn: 2 },
    { circuit: "MandateBound", status: "generating" as const, timeMs: undefined, turn: 3 },
  ],
  termsComparison: {
    headers: ["Term", "Buyer (T1)", "Seller (T2)", "Buyer (T3)"],
    rows: [
      ["Value", "\u20AC400,000", "\u20AC520,000", "\u20AC460,000"],
      ["Delivery", "60 days", "45 days", "50 days"],
      ["Warranty", "24 months", "12 months", "18 months"],
      ["Payment", "Net 30", "Net 15", "Net 30"],
    ],
  },
};

function TurnSubmissionForm({ sessionId, onSubmitted }: { sessionId: string; onSubmitted: () => void }) {
  const { submitTurn, loading, error } = useSubmitTurn();
  const [termsJson, setTermsJson] = useState("{}");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    try {
      await submitTurn(sessionId, {
        agentId: formData.get("agentId") as string,
        terms: JSON.parse(termsJson),
        proofType: "Groth16",
        proof: {},
        publicSignals: {},
        signature: "pending",
      });
      onSubmitted();
      form.reset();
      setTermsJson("{}");
    } catch { /* Error displayed via hook */ }
  }

  return (
    <div className="mt-6 rounded-xl border border-navy-800 bg-navy-900 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Submit Turn</h3>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Agent ID</label>
          <input name="agentId" required className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Terms (JSON)</label>
          <textarea value={termsJson} onChange={(e) => setTermsJson(e.target.value)} rows={4} className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white font-mono outline-none focus:border-accent" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {loading ? "Submitting..." : "Submit Turn"}
        </button>
      </form>
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnsLoading, setTurnsLoading] = useState(true);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [showRedacted, setShowRedacted] = useState(true);

  const orgId = getOrgIdFromToken();

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
    apiClient.sessions.getTurns(sessionId)
      .then((res) => { setTurns(res.data); setTurnsLoading(false); })
      .catch(() => { setTurnsLoading(false); });
  }, [sessionId]);

  const { data: session, loading, error, refetch } = useSession(sessionId);

  const status = session?.status ?? mockSession.status;
  const isActive = status === "active";
  const createdAt = session?.createdAt ?? mockSession.createdAt;
  const turnCount = session?.turnCount ?? mockSession.currentTurn;
  const merkleRoot = session?.merkleRoot ?? mockSession.merkleRoot;

  const isOrgMember = session
    ? session.initiatorOrgId === orgId || session.counterpartyOrgId === orgId
    : true;

  const displayTurns = turns.length > 0
    ? turns.map((t) => {
        const isRedacted = showRedacted && t.terms && "redacted" in t.terms;
        return {
          id: t.id,
          agentId: t.agentId,
          terms: isRedacted ? { "[redacted]": "Cross-org terms hidden" } : t.terms,
          proofStatus: "verified" as const,
          createdAt: t.createdAt,
        };
      })
    : mockSession.turns;

  async function handleAbandon() {
    setAbandoning(true);
    try {
      await apiClient.sessionsExt.abandon(sessionId);
      setAbandonOpen(false);
      refetch();
    } catch { /* ignore */ } finally {
      setAbandoning(false);
    }
  }

  function handleExportPdf() {
    const content = [
      `Session Report: ${sessionId}`,
      `Status: ${status}`,
      `Created: ${new Date(createdAt).toLocaleString()}`,
      `Turn Count: ${turnCount}`,
      `Merkle Root: ${merkleRoot ?? "N/A"}`,
      "",
      "--- Turns ---",
      ...displayTurns.map((t, i) => [
        `Turn ${i + 1}: ${t.agentId}`,
        `  Terms: ${JSON.stringify(t.terms)}`,
        `  Created: ${t.createdAt}`,
      ].join("\n")),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId.slice(0, 8)}-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="py-16"><LoadingSpinner label="Loading session..." /></div>;
  if (error && !session) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/sessions" className="hover:text-white transition-colors">Sessions</Link>
        <span>/</span>
        <span className="text-white">{sessionId.slice(0, 16)}...</span>
      </div>

      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">Session #{sessionId.slice(0, 8)}</h1>
            <StatusBadge status={status} />
            {isActive && <LiveIndicator active />}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Turn {turnCount}/{mockSession.maxTurns}</span>
            <button onClick={handleExportPdf} className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              Export Report
            </button>
            {isActive && (
              <button onClick={() => setAbandonOpen(true)} className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors">
                Abandon
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <div><span className="text-gray-500">Initiator:</span>{" "}<Link href={`/agents/${session?.initiatorAgentId ?? mockSession.buyerAgent.id}`} className="text-accent hover:text-accent-hover underline">{session?.initiatorAgentId ?? mockSession.buyerAgent.name}</Link></div>
          <div><span className="text-gray-500">Counterparty:</span>{" "}<Link href={`/agents/${session?.counterpartyAgentId ?? mockSession.sellerAgent.id}`} className="text-accent hover:text-accent-hover underline">{session?.counterpartyAgentId ?? mockSession.sellerAgent.name}</Link></div>
          <div><span className="text-gray-500">Started:</span>{" "}<span className="text-white">{new Date(createdAt).toLocaleString()}</span></div>
          {session && <div><span className="text-gray-500">Type:</span>{" "}<span className="text-white">{session.sessionType}</span></div>}
        </div>
      </div>

      {isOrgMember && turns.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">View mode:</span>
          <button onClick={() => setShowRedacted(true)} className={`rounded-md px-3 py-1 text-xs transition-colors ${showRedacted ? "bg-accent text-white" : "border border-navy-800 text-gray-400 hover:text-white"}`}>Redacted</button>
          <button onClick={() => setShowRedacted(false)} className={`rounded-md px-3 py-1 text-xs transition-colors ${!showRedacted ? "bg-accent text-white" : "border border-navy-800 text-gray-400 hover:text-white"}`}>Full</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-lg border border-navy-800 bg-navy-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Negotiation Timeline</h2>
          <TurnTimeline turns={displayTurns} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Terms Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-navy-800">{mockSession.termsComparison.headers.map((h, i) => <th key={i} className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-navy-800">{mockSession.termsComparison.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "text-gray-400 font-medium" : "text-white font-mono text-xs"}`}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">ZK Proofs</h2>
            <div className="space-y-3">
              {mockSession.proofs.map((proof, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-navy-800 bg-navy-950 px-3 py-2">
                  <ProofBadge status={proof.status} circuit={proof.circuit} timeMs={proof.timeMs} />
                  <span className="text-xs text-gray-500">Turn {proof.turn}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-lg border border-accent/30 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors">Verify On-Chain</button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-navy-800 bg-navy-900 p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2"><span className="text-gray-500">Merkle Root:</span><span className="font-mono text-xs text-gray-300">{merkleRoot ? `${merkleRoot.slice(0, 10)}...${merkleRoot.slice(-4)}` : "N/A"}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-500">Est. Gas:</span><span className="font-mono text-xs text-white">{mockSession.estimatedGas}</span></div>
      </div>

      {isActive && <TurnSubmissionForm sessionId={sessionId} onSubmitted={() => { apiClient.sessions.getTurns(sessionId).then((res) => setTurns(res.data)).catch(() => {}); }} />}

      <Modal open={abandonOpen} onClose={() => setAbandonOpen(false)} title="Abandon Session" footer={
        <div className="flex justify-end gap-3">
          <button onClick={() => setAbandonOpen(false)} className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAbandon} disabled={abandoning} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/80 disabled:opacity-40 transition-colors">{abandoning ? "Abandoning..." : "Confirm Abandon"}</button>
        </div>
      }>
        <p className="text-sm text-gray-400">Are you sure you want to abandon this session? This action cannot be undone. The session will be marked as abandoned and no further turns can be submitted.</p>
      </Modal>
    </div>
  );
}
