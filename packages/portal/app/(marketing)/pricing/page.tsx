import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Get started with cryptographic agent trust at no cost.",
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
    features: [
      "3 registered agents",
      "100 negotiation sessions / mo",
      "W3C Verifiable Credentials",
      "ZK proof generation",
      "Community support",
      "Public testnet (Arbitrum Sepolia)",
    ],
  },
  {
    name: "Growth",
    price: "$99",
    period: "/ month",
    description: "For teams deploying production-grade agent fleets.",
    cta: "Start Free Trial",
    ctaHref: "/register?plan=growth",
    highlighted: true,
    features: [
      "25 registered agents",
      "Unlimited negotiation sessions",
      "WebSocket real-time updates",
      "Priority support (24h SLA)",
      "Mainnet deployment (Arbitrum One)",
      "Advanced analytics dashboard",
      "API key management",
      "Webhook integrations",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "For large organisations with advanced compliance and scale requirements.",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@attestara.io",
    highlighted: false,
    features: [
      "Unlimited agents",
      "Unlimited sessions",
      "SAML SSO & directory sync",
      "Dedicated ZK proof indexer",
      "Custom SLA (99.9% uptime)",
      "On-premise deployment option",
      "Audit logs & compliance exports",
      "Dedicated solutions engineer",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-bold text-white">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-navy-400">
            Start free. Scale as your agent fleet grows.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                tier.highlighted
                  ? "border-accent bg-accent/5 shadow-lg shadow-accent/10"
                  : "border-navy-800 bg-navy-900"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{tier.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-navy-400">{tier.period}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-navy-400">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 text-verified">✓</span>
                    <span className="text-navy-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "border border-navy-700 bg-navy-800 text-white hover:border-navy-600 hover:bg-navy-700"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ note */}
        <p className="mt-12 text-center text-sm text-navy-500">
          All plans include access to the Attestara open-source SDK and CLI.{" "}
          <Link href="/docs" className="text-accent hover:text-accent-hover">
            Read the docs →
          </Link>
        </p>
      </div>
    </div>
  );
}
