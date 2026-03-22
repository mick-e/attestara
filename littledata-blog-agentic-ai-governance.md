# The Trust Crisis at the Heart of Enterprise AI — and Why Governance Can't Wait

*Published by Littledata | AI Risk Management & EU AI Act Compliance*

---

There is a quiet crisis unfolding inside enterprise technology. It is not a data breach. It is not a model hallucination. It is something more structural, and in many ways more dangerous: organisations are deploying AI agents that can act, commit, negotiate, and execute — and they have built almost no governance infrastructure to oversee them.

This is not a problem confined to one sector, one jurisdiction, or one type of AI. It is a systemic gap, and the evidence is mounting from every direction — regulators, researchers, and the technology industry itself.

---

## The Adoption Curve Has Outrun the Governance Curve

Start with the numbers. The Bank of England and the Financial Conduct Authority's joint survey found that 75% of UK financial services firms are now using AI — up from 58% in 2022. ISACA's 2025 research found that 51% of European IT and cybersecurity professionals identified AI-driven threats as their single greatest concern going into 2026. Yet only 14% felt their organisations were "very prepared" to manage the risks associated with generative AI.

In January 2026, the UK Parliament's Treasury Select Committee published a landmark report on AI in financial services. Its conclusion was blunt: the Bank of England, the FCA, and HM Treasury are "exposing consumers and the financial system to potentially serious harm" by adopting a "wait-and-see" approach to AI regulation. The committee found that firms lacked clarity on how existing rules applied to AI, that accountability for AI-driven harm was poorly defined, and that no AI-specific stress testing existed to assess systemic resilience.

This is the governance gap in its starkest form. Widespread adoption. Minimal oversight infrastructure. And when things go wrong — and they will — no clear framework for accountability.

---

## From Tools to Agents: Why This Changes Everything

For the first decade of enterprise AI, most deployments were essentially sophisticated tools. A model would receive an input, produce an output, and a human would decide what to do with it. The governance question, while real, was manageable: who reviewed the output, who validated the recommendation, who owned the decision.

Agentic AI fundamentally changes this structure. Agents do not just produce outputs — they take actions. They send emails, execute transactions, negotiate terms, update records, trigger downstream systems. They operate in chains, where one agent's output becomes another agent's input, often without human review at any intermediate step. And increasingly, they interact with agents deployed by other organisations, across organisational boundaries, in real time.

This is where the governance problem becomes acute. When two AI agents from competing organisations negotiate a contract, execute a financial settlement, or agree the terms of a service engagement — who is responsible for the outcome? What authority did each agent have to commit? How do you audit a decision made at machine speed by a system neither party's senior management fully understands?

The Salesforce AI Research team's recent stress-testing of agent-to-agent interactions identified a specific failure mode they call "echoing behaviour" — where two agents, both trained to be accommodating and helpful, spiral into a feedback loop of mutual agreement regardless of whether the outcome serves either party's actual interests. In low-stakes contexts this is inconvenient. In financial services, healthcare, or legal negotiations, it constitutes a governance failure with material consequences.

---

## The Regulatory Landscape Is Hardening Fast

Against this backdrop, the EU AI Act is moving from framework to enforcement reality. The prohibition on unacceptable risk AI practices came into force in February 2025. Governance obligations for general-purpose AI models took effect in August 2025. From August 2026, high-risk AI systems in financial services, healthcare, critical infrastructure, and employment must meet comprehensive compliance requirements under Article 9 — including mandatory risk management systems, technical documentation, data governance frameworks, and ongoing monitoring obligations.

Article 9 is the operational core of the Act for most enterprise deployers. It requires that high-risk AI systems have a risk management system that is "established, implemented, documented and maintained" as a continuous iterative process — not a one-time compliance exercise. It demands identification and analysis of known and foreseeable risks. It requires evaluation of risks that emerge from actual use. And it places accountability squarely on the deployer organisation, not the AI provider.

The EU's Digital Operational Resilience Act (DORA), already in force since January 2025, adds a parallel layer of obligation for financial entities — requiring mandatory technical controls, incident reporting, and direct governance of third-party technology providers, including AI and cloud vendors.

For organisations operating across the UK and EU, the compliance matrix is complex. The UK has not yet enacted a dedicated AI bill, though one is anticipated in mid-to-late 2026. The Treasury Select Committee's January 2026 report explicitly recommended that HM Treasury designate major AI and cloud providers as critical third parties under the Critical Third Parties Regime — an architectural move that would bring AI vendors under the same oversight framework as systemically important financial infrastructure.

---

## The Accountability Gap Is Not Just Regulatory — It Is Structural

There is a deeper problem beneath the regulatory layer. Even organisations that want to comply face a structural barrier: the "lack of explainability" of modern AI models directly conflicts with governance requirements.

The Senior Managers and Certification Regime (SMCR) in UK financial services requires that senior executives can demonstrate they understood and took responsibility for material decisions. But when a decision is made by an AI system — especially a large language model operating within a multi-agent pipeline — the chain of accountability becomes genuinely difficult to trace. Who is "on the hook" when an AI agent makes a commitment that causes customer harm? The model developer? The platform vendor? The integration partner? The deploying organisation? The individual manager who approved the deployment?

Innovate Finance, giving evidence to the Treasury Select Committee, testified that management in financial institutions was struggling to assess AI risk. This is not a capability gap that training alone will close. It requires purpose-built governance infrastructure: risk scoring, audit trails, deployment documentation, ongoing monitoring, and clear accountability mapping.

This is precisely the problem that structured AI risk management platforms exist to solve.

---

## Four Dimensions of AI Risk — A Framework for Enterprise Governance

Effective AI governance requires moving beyond binary assessments of whether a system is "compliant" or not. The reality is that AI risk is multi-dimensional, context-dependent, and dynamic. A model that poses minimal risk in one deployment context may pose significant risk in another, depending on the data it processes, the decisions it influences, and the oversight mechanisms in place.

A robust enterprise AI risk framework needs to evaluate at minimum four dimensions:

**Capability risk** — What can the model actually do, and what are the boundaries of that capability? This includes not just stated capabilities but emergent behaviours identified through adversarial testing. As the OWASP LLM Top 10 documents extensively, large language models are susceptible to prompt injection, training data poisoning, excessive agency, and model denial of service — risks that are poorly understood by most enterprise deployers.

**Deployment risk** — In what context is the model operating? A model deployed to assist human decision-making carries very different risk than one operating autonomously in a multi-agent pipeline. Agentic deployments — where models take real-world actions without intermediate human review — represent the highest deployment risk tier in any sensible governance framework.

**Data risk** — What data does the model access, process, and potentially expose? This encompasses training data provenance, inference-time data inputs, output handling, and the risk of model inversion attacks or membership inference. The Cloud Security Alliance's 2025 research documented cases of AI data poisoning at multiple organisations — a risk that grows as models are fine-tuned on proprietary enterprise data.

**Governance risk** — What oversight mechanisms exist? Is there documented accountability? Are there audit logs? Is there a process for incident detection and response? Has the organisation conducted the risk assessment required under EU AI Act Article 9? This dimension is where the largest gap exists across the enterprise market today.

---

## What Good AI Governance Actually Looks Like

Good AI governance is not a compliance checklist. It is an operational capability — a continuous process of risk identification, assessment, mitigation, and monitoring that evolves alongside the AI systems it oversees.

Concretely, it means:

**Before deployment:** A structured risk assessment that maps the system against the four dimensions above, identifies applicable regulatory obligations (EU AI Act category, DORA, GDPR, sector-specific rules), and documents the accountability chain for the system's outputs and actions.

**At deployment:** Technical controls that limit the system's agency to its authorised scope, audit logging that captures inputs, outputs, and actions at sufficient granularity for post-hoc review, and monitoring pipelines that flag anomalous behaviour in real time.

**In operation:** Regular re-assessment as the system's usage evolves, integration of incident reports into the risk model, and a defined process for human escalation when the system's confidence or context falls outside its validated operating envelope.

**Across the organisation:** A risk register that gives leadership visibility across all AI deployments, not just the high-profile ones. The agentic systems most likely to cause harm are often the ones that received the least governance scrutiny because they were deployed by individual teams, not as enterprise-wide initiatives.

---

## The Mid-Market Is Under-Served — and Under-Exposed

Enterprise AI governance tooling has historically been built for large organisations with dedicated AI ethics teams, legal departments, and technology compliance functions. But the majority of organisations deploying AI today are mid-market businesses that lack those resources — and that face the same regulatory obligations.

The EU AI Act does not have a mid-market exemption. DORA applies to financial entities regardless of size. The SMCR applies to regulated firms regardless of headcount. The gap between what large enterprises can afford to spend on AI governance infrastructure and what mid-market organisations can realistically deploy is a market failure — and a genuine risk exposure.

Purpose-built AI risk management platforms designed for the mid-market — combining automated risk scoring, regulatory mapping, deployment documentation, and ongoing monitoring at a price point accessible to organisations without a hundred-person compliance team — represent the structural solution to this gap.

---

## The Window Is Narrowing

The EU AI Act's August 2026 deadline for high-risk AI system compliance is not theoretical. It is seven months away. Organisations that have not yet begun their Article 9 risk management processes face a narrowing runway. Those that have begun — but are managing the process through spreadsheets, legal memos, and ad hoc documentation — face a different kind of exposure: the risk that their governance infrastructure will not withstand regulatory scrutiny when an incident occurs.

The Treasury Select Committee chair's words from January 2026 are worth sitting with: "Based on the evidence I've seen, I do not feel confident that our financial system is prepared if there was a major AI-related incident and that is worrying."

That assessment applies beyond financial services. It applies to any organisation deploying AI systems that affect material decisions — and that is now most organisations of scale.

The governance infrastructure needs to be built before the incident, not after.

---

## How Littledata Helps

Littledata is an AI risk management and EU AI Act compliance platform built specifically for mid-market organisations. Our four-dimension risk scoring model — assessing capability, deployment, data, and governance risk — gives organisations a structured, auditable view of their AI risk posture across every deployment.

We map your AI inventory against EU AI Act categories, DORA obligations, and sector-specific regulatory requirements. We generate the documentation required for Article 9 compliance. We provide ongoing monitoring and risk re-assessment as your deployments evolve. And we do it at a price point designed for organisations that cannot afford enterprise-tier consulting engagements.

The agentic AI era is here. The regulatory clock is running. The governance infrastructure that enterprise AI requires doesn't build itself.

**Find out where your organisation stands at [littledata.com](https://littledata.com)**

---

*Sources: Bank of England / FCA Joint Survey on AI in UK Financial Services; ISACA European Cybersecurity Research 2025; UK Treasury Select Committee Report on AI in Financial Services, January 2026; EU AI Act (Regulation (EU) 2024/1689); Digital Operational Resilience Act (DORA); OWASP LLM Top 10; Cloud Security Alliance AI Security Research 2025; Apollo Research AI Deception Findings 2024; Salesforce AI Research, "The A2A Semantic Layer: Building Trust into Agent-to-Agent Interaction", 2026.*

---

*Littledata is an AI risk management platform helping mid-market organisations navigate EU AI Act compliance and build enterprise-grade AI governance. Learn more at [littledata.com](https://littledata.com)*
