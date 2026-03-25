import Link from "next/link";

const docSections = [
  {
    title: "Quickstart",
    description:
      "Install the Attestara SDK, provision your first agent, issue a credential, and run a negotiation session in under 10 minutes.",
    icon: "🚀",
    href: "#",
    badge: "Start here",
  },
  {
    title: "SDK Reference",
    description:
      "Full API reference for the @attestara/sdk package. Covers AttestaraClient, identity manager, credential manager, prover, negotiation, and commitment APIs.",
    icon: "📦",
    href: "#",
  },
  {
    title: "API Reference",
    description:
      "REST API documentation for the Attestara Relay service. All /v1/ endpoints with request/response schemas, authentication, and error codes.",
    icon: "🔌",
    href: "#",
  },
  {
    title: "ZK Circuits",
    description:
      "Deep-dive into the four Circom circuits: MandateBound, ParameterRange, CredentialFreshness, and IdentityBinding. Includes circuit inputs and proof verification.",
    icon: "⚡",
    href: "#",
  },
  {
    title: "Smart Contracts",
    description:
      "Solidity contract documentation for AgentRegistry, CommitmentContract, CredentialRegistry, and VerifierRegistry deployed on Arbitrum.",
    icon: "⛓️",
    href: "#",
  },
  {
    title: "CLI",
    description:
      "Command reference for the attestara CLI. Covers init, identity, credential, session, negotiate, commitment, and demo commands.",
    icon: "💻",
    href: "#",
  },
];

export default function DocsPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-bold text-white">Documentation</h1>
          <p className="mt-4 text-lg text-navy-400">
            Everything you need to build with the Attestara protocol
          </p>
        </div>

        {/* Doc cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docSections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="group flex flex-col rounded-xl border border-navy-800 bg-navy-900 p-6 transition-colors hover:border-accent/40 hover:bg-navy-900/80"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-2xl transition-colors group-hover:bg-accent/20">
                  {section.icon}
                </div>
                {section.badge && (
                  <span className="rounded-full bg-verified/10 px-3 py-1 text-xs font-medium text-verified">
                    {section.badge}
                  </span>
                )}
              </div>
              <h2 className="mb-2 text-lg font-semibold text-white">
                {section.title}
              </h2>
              <p className="flex-1 text-sm leading-relaxed text-navy-400">
                {section.description}
              </p>
              <div className="mt-4 text-sm font-medium text-accent transition-colors group-hover:text-accent-hover">
                Read more →
              </div>
            </Link>
          ))}
        </div>

        {/* Additional resources */}
        <div className="mt-16 rounded-xl border border-navy-800 bg-navy-900 p-8">
          <h2 className="mb-6 text-xl font-bold text-white">
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-navy-700 bg-navy-800/50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">
                Protocol Whitepaper
              </h3>
              <p className="text-xs text-navy-400">
                Technical specification of the Attestara cryptographic trust
                protocol (v5).
              </p>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-800/50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">
                GitHub
              </h3>
              <p className="text-xs text-navy-400">
                Open-source monorepo. Contribute circuits, contracts, SDK, and
                relay server.
              </p>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-800/50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">
                Community Discord
              </h3>
              <p className="text-xs text-navy-400">
                Get help from the community and the Attestara core team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
