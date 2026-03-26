"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge, ChainLink, LoadingSpinner, ErrorState } from "@/components/ui";
import { useCredential, useRevokeCredential } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

const mockCredential = {
  id: "cred_01HZN4ABCDEF1234567890ABCD",
  hash: "0x3e8b2f9a1c4d6e7f0a5b8c3d9e1f2a4b6c7d8e0f1a3b5c7d9e0f2a4b6c8d0e",
  agent: "procurement-bot-eu",
  agentId: "ag_01HZN3KQXV7YJWF8RMTG5B2P4D",
  domain: "IT Equipment",
  maxValue: "500000",
  currency: "EUR",
  floor: "100000",
  ceiling: "500000",
  expiry: "2026-09-15",
  status: "active",
  ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  onChainHash:
    "0x7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  txHash:
    "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8",
  issuedAt: "2026-03-15T09:35:00Z",
  issuer: "Attestara Org #1",
};

export default function CredentialDetailPage() {
  const params = useParams();
  const credId = params.id as string;

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: credential, loading, error, refetch } = useCredential(credId);
  const { revokeCredential, loading: revoking } = useRevokeCredential();

  // Derive display values from API or mock
  const domain = credential
    ? (credential.credentialDataCached?.domain as string) || "Credential"
    : mockCredential.domain;
  const status = credential
    ? credential.revoked
      ? "revoked"
      : new Date(credential.expiry) < new Date()
        ? "expired"
        : "active"
    : mockCredential.status;
  const hash = credential?.credentialHash ?? mockCredential.hash;
  const agentId = credential?.agentId ?? mockCredential.agentId;
  const ipfsCid = credential?.ipfsCid ?? mockCredential.ipfsCid;
  const txHash = credential?.registeredTxHash ?? mockCredential.txHash;
  const issuedAt = credential?.createdAt ?? mockCredential.issuedAt;
  const expiry = credential?.expiry.split("T")[0] ?? mockCredential.expiry;

  async function handleRevoke() {
    try {
      await revokeCredential(credId);
      refetch();
    } catch {
      // handled by hook
    }
  }

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner label="Loading credential..." />
      </div>
    );
  }

  if (error && !credential) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          href="/credentials"
          className="hover:text-white transition-colors"
        >
          Credentials
        </Link>
        <span>/</span>
        <span className="text-white">{domain}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {domain}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Credential: {credId.slice(0, 20)}...
          </p>
        </div>
        <button
          onClick={handleRevoke}
          disabled={revoking || status === "revoked"}
          className="rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-40"
        >
          {revoking ? "Revoking..." : status === "revoked" ? "Revoked" : "Revoke"}
        </button>
      </div>

      {/* Credential Info */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Status
            </p>
            <StatusBadge status={status} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Agent
            </p>
            <Link
              href={`/agents/${agentId}`}
              className="text-sm text-accent hover:text-accent-hover underline"
            >
              {credential?.agentId ?? mockCredential.agent}
            </Link>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Issuer
            </p>
            <p className="text-sm text-white">{mockCredential.issuer}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Issued
            </p>
            <p className="text-sm text-white">
              {new Date(issuedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Mandate Parameters */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Mandate Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Domain
            </p>
            <p className="text-sm text-white">{domain}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Max Value
            </p>
            <p className="text-sm text-white font-mono">
              {"\u20AC"}{Number(credential?.credentialDataCached?.maxValue ?? mockCredential.maxValue).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Floor
            </p>
            <p className="text-sm text-white font-mono">
              {"\u20AC"}{Number(credential?.credentialDataCached?.floor ?? mockCredential.floor).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Ceiling
            </p>
            <p className="text-sm text-white font-mono">
              {"\u20AC"}{Number(credential?.credentialDataCached?.ceiling ?? mockCredential.ceiling).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Expiry
            </p>
            <p className="text-sm text-white">{expiry}</p>
          </div>
        </div>
      </div>

      {/* On-Chain Record */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          On-Chain Record
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Credential Hash
            </p>
            <p className="font-mono text-sm text-gray-300 break-all">
              {hash}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Schema Hash
            </p>
            <p className="font-mono text-sm text-gray-300 break-all">
              {credential?.schemaHash ?? mockCredential.onChainHash}
            </p>
          </div>
          {ipfsCid && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                IPFS CID
              </p>
              <p className="font-mono text-sm text-accent break-all">
                {ipfsCid}
              </p>
            </div>
          )}
          {txHash && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Transaction
              </p>
              <ChainLink txHash={txHash} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
