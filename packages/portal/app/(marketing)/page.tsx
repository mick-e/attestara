import Link from "next/link";

const features = [
  {
    title: "ZK Proofs",
    description:
      "Groth16 zero-knowledge proofs let agents prove authority over mandate bounds, parameter ranges, and credential freshness without revealing sensitive terms to counterparties.",
    icon: "🔐",
  },
  {
    title: "Verifiable Credentials",
    description:
      "W3C VC 2.0-compliant credentials issued to agents define their authority and mandate scope. DID-based identity with did:ethr ensures cryptographic provenance.",
    icon: "📜",
  },
  {
    title: "On-Chain Settlement",
    description:
      "Agreed terms are settled on Arbitrum L2 via dual agent signatures, creating immutable on-chain commitment records with full auditability.",
    icon: "⛓️",
  },
  {
    title: "Cross-Org Negotiation",
    description:
      "Structured multi-turn negotiation protocol enables autonomous AI agents from different organisations to reach binding agreements without human intervention.",
    icon: "🤝",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
            Open Protocol · v0.1.0 MVP
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Cryptographic Trust for{" "}
            <span className="text-accent">AI Agent Commerce</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-navy-300">
            Attestara enables autonomous AI agents to negotiate, commit, and be
            held accountable across organisational boundaries using
            zero-knowledge proofs, W3C Verifiable Credentials, and on-chain
            settlement on Arbitrum L2.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-hover"
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-navy-700 bg-navy-900 px-8 py-3 text-base font-semibold text-white transition-colors hover:border-navy-600 hover:bg-navy-800"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">
              Everything you need for agent trust
            </h2>
            <p className="mt-3 text-navy-400">
              A complete cryptographic stack for autonomous AI agent interactions
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-navy-800 bg-navy-900 p-6 transition-colors hover:border-accent/30 hover:bg-navy-900/80"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-navy-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-accent/5 p-12 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to build trustworthy AI agents?
          </h2>
          <p className="mt-4 text-navy-300">
            Start with our free tier — 3 agents, 100 sessions per month. No
            credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Read the docs →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
