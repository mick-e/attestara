"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoadingSpinner, Modal, EmptyState } from "@/components/ui";
import { useWebhooks, useWebhookDeliveries, getOrgIdFromToken } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient, type WebhookDeliveryResponse } from "@/lib/api-client";

export default function WebhooksPage() {
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; statusCode: number } | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: webhooks, loading, refetch } = useWebhooks();
  const { data: deliveries, loading: deliveriesLoading, refetch: refetchDeliveries } = useWebhookDeliveries(selectedWebhookId ?? "");

  const orgId = getOrgIdFromToken();

  async function handleTest(webhookId: string) {
    if (!orgId) return;
    setTesting(webhookId);
    setTestResult(null);
    try {
      const result = await apiClient.webhooks.test(orgId, webhookId);
      setTestResult({ id: webhookId, ...result });
    } catch {
      setTestResult({ id: webhookId, success: false, statusCode: 0 });
    } finally {
      setTesting(null);
    }
  }

  async function handleRetry(deliveryId: string) {
    if (!orgId) return;
    setRetrying(deliveryId);
    try {
      await apiClient.webhooks.retryDelivery(orgId, deliveryId);
      refetchDeliveries();
    } catch {
      // ignore
    } finally {
      setRetrying(null);
    }
  }

  async function handleDelete(webhookId: string) {
    if (!orgId) return;
    try {
      await apiClient.webhooks.delete(orgId, webhookId);
      refetch();
      if (selectedWebhookId === webhookId) setSelectedWebhookId(null);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your organization, members, and preferences
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-navy-800 pb-3">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors">
          Organization
        </Link>
        <Link href="/settings/api-keys" className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors">
          API Keys
        </Link>
        <Link href="/settings/billing" className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors">
          Billing
        </Link>
        <span className="text-sm font-medium text-accent border-b-2 border-accent pb-3 -mb-3">
          Webhooks
        </span>
      </div>

      {/* Webhooks List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Webhooks</h2>
        {loading ? (
          <div className="py-8"><LoadingSpinner label="Loading webhooks..." /></div>
        ) : !webhooks || webhooks.length === 0 ? (
          <EmptyState
            title="No webhooks configured"
            description="Register a webhook to receive event notifications."
          />
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="rounded-lg border border-navy-800 bg-navy-900 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{wh.url}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Events: {wh.events.join(", ")} | {wh.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testing === wh.id}
                    className="rounded-md border border-navy-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {testing === wh.id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => setSelectedWebhookId(selectedWebhookId === wh.id ? null : wh.id)}
                    className="rounded-md border border-navy-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {selectedWebhookId === wh.id ? "Hide History" : "History"}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="rounded-md border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
                {testResult?.id === wh.id && (
                  <span className={`ml-3 text-xs ${testResult.success ? "text-verified" : "text-danger"}`}>
                    {testResult.success ? `OK (${testResult.statusCode})` : `Failed (${testResult.statusCode})`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery History */}
      {selectedWebhookId && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Delivery History</h2>
          {deliveriesLoading ? (
            <div className="py-8"><LoadingSpinner label="Loading deliveries..." /></div>
          ) : !deliveries || deliveries.length === 0 ? (
            <p className="text-sm text-gray-500">No deliveries recorded yet.</p>
          ) : (
            <div className="rounded-lg border border-navy-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-navy-800 bg-navy-950">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Event</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Attempts</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2 text-white">{d.event}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          d.status === "delivered" ? "text-verified bg-verified/10" :
                          d.status === "failed" ? "text-danger bg-danger/10" :
                          "text-warning bg-warning/10"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">{d.attempts}</td>
                      <td className="px-4 py-2 text-gray-400">{new Date(d.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        {d.status === "failed" && (
                          <button
                            onClick={() => handleRetry(d.id)}
                            disabled={retrying === d.id}
                            className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-40"
                          >
                            {retrying === d.id ? "Retrying..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
