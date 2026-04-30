"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingSpinner, StatCard } from "@/components/ui";
import { useBillingUsage, useBillingPlan } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

export default function BillingPage() {
  const [topupAmount, setTopupAmount] = useState(100);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMessage, setTopupMessage] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: usage, loading: usageLoading, refetch: refetchUsage } = useBillingUsage();
  const { data: plan, loading: planLoading, refetch: refetchPlan } = useBillingPlan();

  const loading = usageLoading || planLoading;

  async function handleTopup() {
    setTopupLoading(true);
    setTopupMessage("");
    try {
      const result = await apiClient.billing.topup(topupAmount);
      setTopupMessage(result.message);
      refetchUsage();
      refetchPlan();
    } catch (err) {
      setTopupMessage(err instanceof Error ? err.message : "Top up failed");
    } finally {
      setTopupLoading(false);
    }
  }

  const creditsUsed = plan?.creditsUsed ?? 0;
  const creditsTotal = plan?.credits ?? 1000;
  const creditsRemaining = usage?.creditsRemaining ?? creditsTotal - creditsUsed;
  const usagePct = creditsTotal > 0 ? Math.min((creditsUsed / creditsTotal) * 100, 100) : 0;

  if (loading) return <div className="py-12"><LoadingSpinner label="Loading billing..." /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-gray-400">
          Pay-per-use billing, credit balance, and usage tracking
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-navy-800 pb-3">
        <Link
          href="/settings"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          Organization
        </Link>
        <Link
          href="/settings/api-keys"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          API Keys
        </Link>
        <span className="text-sm font-medium text-accent border-b-2 border-accent pb-3 -mb-3">
          Billing
        </span>
      </div>

      {/* Plan Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Plan" value={plan?.plan ?? "starter"} />
        <StatCard label="Credits Used" value={String(creditsUsed)} />
        <StatCard label="Credits Remaining" value={String(creditsRemaining)} />
        <StatCard label="Renews" value={plan?.renewsAt ? new Date(plan.renewsAt).toLocaleDateString() : "--"} />
      </div>

      {/* Usage Bar */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Credit Usage</h3>
        <div className="h-4 rounded-full bg-navy-800 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${usagePct > 90 ? "bg-danger" : usagePct > 70 ? "bg-warning" : "bg-accent"}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{creditsUsed} used</span>
          <span>{creditsTotal} total</span>
        </div>
      </div>

      {/* Usage Breakdown */}
      {usage && usage.usage.length > 0 && (
        <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Usage Breakdown</h3>
          <div className="space-y-3">
            {usage.usage.map((m) => (
              <div key={m.metric} className="flex items-center justify-between">
                <span className="text-sm text-white capitalize">{m.metric.replace(/_/g, " ")}</span>
                <span className="text-sm font-mono text-gray-400">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Up */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Top Up Credits</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Credits</label>
            <input
              type="number"
              min={1}
              max={100000}
              value={topupAmount}
              onChange={(e) => setTopupAmount(Number(e.target.value))}
              className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleTopup}
            disabled={topupLoading || topupAmount < 1}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            {topupLoading ? "Processing..." : "Top Up"}
          </button>
        </div>
        {topupMessage && (
          <p className="mt-3 text-sm text-gray-400">{topupMessage}</p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Credits are used for API calls, proof generations, and commitment submissions.
          Live payment processing is not yet enabled.
        </p>
      </div>
    </div>
  );
}
