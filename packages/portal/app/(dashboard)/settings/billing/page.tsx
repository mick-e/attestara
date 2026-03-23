"use client";

import Link from "next/link";
import { StatCard } from "@/components/ui";

const plans = [
  {
    name: "Starter",
    price: "$49/mo",
    description: "For teams getting started with AI agent negotiations",
    features: ["5 agents", "100 sessions/mo", "Basic proofs", "Email support"],
    current: false,
  },
  {
    name: "Growth",
    price: "$199/mo",
    description: "For growing teams with production workloads",
    features: [
      "25 agents",
      "1,000 sessions/mo",
      "All proof types",
      "Priority support",
      "Custom credentials",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with advanced requirements",
    features: [
      "Unlimited agents",
      "Unlimited sessions",
      "All proof types",
      "Dedicated support",
      "Custom SLAs",
      "On-prem deployment",
    ],
    current: false,
  },
];

const usageStats = [
  { label: "Sessions This Month", value: 234 },
  { label: "Proofs Generated", value: 1089 },
  { label: "Active Agents", value: "5 / 25" },
  { label: "API Calls", value: "12.4K" },
];

export default function BillingPage() {
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

      {/* Current Plan */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 ${
                plan.current
                  ? "border-accent bg-accent/5"
                  : "border-navy-800 bg-navy-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {plan.name}
                </h3>
                {plan.current && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent border border-accent/20">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {plan.price}
              </p>
              <p className="mt-2 text-xs text-gray-400">{plan.description}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <span className="text-verified">{"\u2713"}</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <button
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    plan.name === "Enterprise"
                      ? "border border-navy-800 text-gray-400 hover:text-white"
                      : "bg-accent text-white hover:bg-accent-hover"
                  }`}
                >
                  {plan.name === "Enterprise"
                    ? "Contact Sales"
                    : "Upgrade Plan"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Usage This Month
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {usageStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>

      {/* Billing Info */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Billing Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Payment Method
            </p>
            <p className="text-sm text-white">
              Visa ending in 4242
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Next Invoice
            </p>
            <p className="text-sm text-white">April 1, 2026 — $199.00</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Billing Email
            </p>
            <p className="text-sm text-white">billing@acme-procurement.eu</p>
          </div>
        </div>
      </div>
    </div>
  );
}
