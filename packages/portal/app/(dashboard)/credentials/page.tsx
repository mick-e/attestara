"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, Modal } from "@/components/ui";

interface Credential {
  id: string;
  agent: string;
  domain: string;
  maxValue: string;
  currency: string;
  expiry: string;
  status: string;
}

const mockCredentials: Credential[] = [
  {
    id: "cred_01HZN4ABCDEF1234567890ABCD",
    agent: "procurement-bot-eu",
    domain: "IT Equipment",
    maxValue: "500000",
    currency: "EUR",
    expiry: "2026-09-15",
    status: "active",
  },
  {
    id: "cred_01HZN4EFGHIJ1234567890EFGH",
    agent: "procurement-bot-eu",
    domain: "Cloud Services",
    maxValue: "200000",
    currency: "EUR",
    expiry: "2026-06-30",
    status: "active",
  },
  {
    id: "cred_01HZN4KLMNOP1234567890IJKL",
    agent: "sales-agent-na",
    domain: "SaaS Licensing",
    maxValue: "1000000",
    currency: "USD",
    expiry: "2026-12-31",
    status: "active",
  },
  {
    id: "cred_01HZN4QRSTUV1234567890MNOP",
    agent: "logistics-negotiator",
    domain: "Freight Services",
    maxValue: "750000",
    currency: "EUR",
    expiry: "2026-08-20",
    status: "active",
  },
  {
    id: "cred_01HZN4WXYZAB1234567890QRST",
    agent: "procurement-bot-eu",
    domain: "Office Supplies",
    maxValue: "50000",
    currency: "EUR",
    expiry: "2026-02-28",
    status: "expired",
  },
  {
    id: "cred_01HZN4CDEFGH1234567890UVWX",
    agent: "vendor-assessment-v1",
    domain: "Consulting",
    maxValue: "300000",
    currency: "EUR",
    expiry: "2026-03-01",
    status: "expired",
  },
];

const mockAgentNames = [
  "procurement-bot-eu",
  "sales-agent-na",
  "compliance-checker",
  "logistics-negotiator",
  "vendor-assessment-v1",
];

const currencies = ["EUR", "USD", "GBP", "CHF"];

const columns = [
  {
    key: "agent" as const,
    label: "Agent",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm text-white">{String(v)}</span>
    ),
  },
  {
    key: "domain" as const,
    label: "Domain",
    sortable: true,
    render: (_: unknown, row: Credential) => (
      <Link
        href={`/credentials/${row.id}`}
        className="text-sm font-medium text-accent hover:text-accent-hover underline"
      >
        {row.domain}
      </Link>
    ),
  },
  {
    key: "maxValue" as const,
    label: "Max Value",
    sortable: true,
    render: (_: unknown, row: Credential) => (
      <span className="font-mono text-sm text-white">
        {row.currency === "EUR"
          ? "\u20AC"
          : row.currency === "GBP"
            ? "\u00A3"
            : "$"}
        {Number(row.maxValue).toLocaleString()}
      </span>
    ),
  },
  {
    key: "expiry" as const,
    label: "Expiry",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm text-gray-400">{String(v)}</span>
    ),
  },
  {
    key: "status" as const,
    label: "Status",
    sortable: true,
    render: (v: unknown) => <StatusBadge status={String(v)} />,
  },
  {
    key: "id" as const,
    label: "Actions",
    render: (_: unknown, row: Credential) => (
      <Link
        href={`/credentials/${row.id}`}
        className="text-xs text-gray-400 hover:text-white transition-colors"
      >
        View
      </Link>
    ),
  },
];

interface WizardData {
  agent: string;
  domain: string;
  maxValue: string;
  currency: string;
  expiry: string;
  floor: string;
  ceiling: string;
}

const defaultWizard: WizardData = {
  agent: "",
  domain: "",
  maxValue: "",
  currency: "EUR",
  expiry: "",
  floor: "",
  ceiling: "",
};

export default function CredentialsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardData>(defaultWizard);
  const [issued, setIssued] = useState(false);
  const [credHash, setCredHash] = useState("");

  function resetWizard() {
    setStep(1);
    setForm(defaultWizard);
    setIssued(false);
    setCredHash("");
    setWizardOpen(false);
  }

  function handleConfirm() {
    // Simulate credential issuance
    const hash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
    setCredHash(hash);
    setIssued(true);
    setStep(5);
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!form.agent;
      case 2:
        return !!form.domain && !!form.maxValue;
      case 3:
        return !!form.expiry;
      case 4:
        return true;
      default:
        return false;
    }
  }

  const stepTitles = [
    "Select Agent",
    "Define Mandate",
    "Set Expiry & Ranges",
    "Review",
    "Complete",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credentials</h1>
          <p className="mt-1 text-sm text-gray-400">
            Issue and manage verifiable credentials for your agents
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Issue Credential
        </button>
      </div>

      <DataTable
        columns={columns}
        data={mockCredentials as unknown as Record<string, unknown>[]}
      />

      {/* Issuance Wizard */}
      <Modal
        open={wizardOpen}
        onClose={resetWizard}
        title={`Issue Credential — Step ${step}: ${stepTitles[step - 1]}`}
        footer={
          <div className="flex items-center justify-between">
            {/* Step indicators */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full ${
                    s <= step ? "bg-accent" : "bg-navy-800"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              {step > 1 && !issued && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              )}
              {issued ? (
                <button
                  onClick={resetWizard}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  Done
                </button>
              ) : step === 4 ? (
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  Confirm &amp; Issue
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Step 1: Select Agent */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              Select Agent
            </label>
            <select
              value={form.agent}
              onChange={(e) => setForm({ ...form, agent: e.target.value })}
              className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            >
              <option value="">Choose an agent...</option>
              {mockAgentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 2: Define Mandate */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Domain
              </label>
              <input
                type="text"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="e.g. IT Equipment, Cloud Services"
                className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Max Value
                </label>
                <input
                  type="number"
                  value={form.maxValue}
                  onChange={(e) =>
                    setForm({ ...form, maxValue: e.target.value })
                  }
                  placeholder="500000"
                  className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Expiry & Parameter Ranges */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Floor Value (optional)
                </label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="Minimum acceptable"
                  className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Ceiling Value (optional)
                </label>
                <input
                  type="number"
                  value={form.ceiling}
                  onChange={(e) =>
                    setForm({ ...form, ceiling: e.target.value })
                  }
                  placeholder="Maximum acceptable"
                  className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Floor and ceiling define the acceptable range for ZK proof
              parameter validation.
            </p>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-navy-800 bg-navy-950 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Agent</span>
                <span className="text-sm text-white">{form.agent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Domain</span>
                <span className="text-sm text-white">{form.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Max Value</span>
                <span className="text-sm text-white font-mono">
                  {form.currency === "EUR" ? "\u20AC" : "$"}
                  {Number(form.maxValue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Expiry</span>
                <span className="text-sm text-white">{form.expiry}</span>
              </div>
              {form.floor && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Floor</span>
                  <span className="text-sm text-white font-mono">
                    {Number(form.floor).toLocaleString()}
                  </span>
                </div>
              )}
              {form.ceiling && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Ceiling</span>
                  <span className="text-sm text-white font-mono">
                    {Number(form.ceiling).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Issuing this credential will generate a verifiable credential
              hash and anchor it on-chain.
            </p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && issued && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-verified/10 text-verified text-2xl">
              {"\u2713"}
            </div>
            <p className="text-sm text-white">
              Credential issued successfully
            </p>
            <div className="rounded-lg border border-navy-800 bg-navy-950 p-3">
              <p className="text-xs text-gray-400 mb-1">Credential Hash</p>
              <p className="font-mono text-xs text-accent break-all">
                {credHash}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
