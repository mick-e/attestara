"""
Attestara — Professional Project Scope Document Generator
Generates a branded PDF using ReportLab with the littledata logo.
"""

import os
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, ListFlowable, ListItem,
)
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.utils import ImageReader

# ── Brand Colors ──
BRAND_BLUE = HexColor("#5BAFD6")       # littledata blue
BRAND_DARK = HexColor("#1A2B3C")       # dark navy
BRAND_LIGHT = HexColor("#F4F8FB")      # light bg
BRAND_ACCENT = HexColor("#2E86AB")     # darker accent
BRAND_GRAY = HexColor("#6B7B8D")       # body gray
BRAND_GREEN = HexColor("#27AE60")      # success
BRAND_ORANGE = HexColor("#E67E22")     # warning
TABLE_HEADER_BG = HexColor("#1A2B3C")
TABLE_ALT_ROW = HexColor("#F0F5FA")
DIVIDER_COLOR = HexColor("#D0DCE8")

LOGO_PATH = r"C:\Users\mpesb\Downloads\WIP\littledata.png"
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Attestara_Project_Scope.pdf")

PAGE_W, PAGE_H = A4
MARGIN = 25 * mm


# ═══════════════════════════════════════════════════════════════
# Styles
# ═══════════════════════════════════════════════════════════════

def build_styles():
    ss = getSampleStyleSheet()

    styles = {
        "cover_title": ParagraphStyle(
            "cover_title", parent=ss["Title"],
            fontSize=36, leading=44, textColor=BRAND_DARK,
            fontName="Helvetica-Bold", alignment=TA_LEFT,
            spaceAfter=6 * mm,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle", parent=ss["Normal"],
            fontSize=16, leading=22, textColor=BRAND_ACCENT,
            fontName="Helvetica", alignment=TA_LEFT,
            spaceAfter=4 * mm,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta", parent=ss["Normal"],
            fontSize=11, leading=16, textColor=BRAND_GRAY,
            fontName="Helvetica", alignment=TA_LEFT,
        ),
        "section_title": ParagraphStyle(
            "section_title", parent=ss["Heading1"],
            fontSize=22, leading=28, textColor=BRAND_DARK,
            fontName="Helvetica-Bold", spaceBefore=12 * mm,
            spaceAfter=4 * mm, borderPadding=(0, 0, 2 * mm, 0),
        ),
        "subsection_title": ParagraphStyle(
            "subsection_title", parent=ss["Heading2"],
            fontSize=14, leading=19, textColor=BRAND_ACCENT,
            fontName="Helvetica-Bold", spaceBefore=6 * mm,
            spaceAfter=3 * mm,
        ),
        "body": ParagraphStyle(
            "body", parent=ss["Normal"],
            fontSize=10.5, leading=15, textColor=BRAND_DARK,
            fontName="Helvetica", alignment=TA_JUSTIFY,
            spaceAfter=3 * mm,
        ),
        "body_bold": ParagraphStyle(
            "body_bold", parent=ss["Normal"],
            fontSize=10.5, leading=15, textColor=BRAND_DARK,
            fontName="Helvetica-Bold", spaceAfter=2 * mm,
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=ss["Normal"],
            fontSize=10.5, leading=15, textColor=BRAND_DARK,
            fontName="Helvetica", leftIndent=8 * mm,
            spaceAfter=1.5 * mm, bulletIndent=3 * mm,
            alignment=TA_LEFT,
        ),
        "table_header": ParagraphStyle(
            "table_header", parent=ss["Normal"],
            fontSize=9.5, leading=13, textColor=white,
            fontName="Helvetica-Bold",
        ),
        "table_cell": ParagraphStyle(
            "table_cell", parent=ss["Normal"],
            fontSize=9.5, leading=13, textColor=BRAND_DARK,
            fontName="Helvetica",
        ),
        "caption": ParagraphStyle(
            "caption", parent=ss["Normal"],
            fontSize=8.5, leading=12, textColor=BRAND_GRAY,
            fontName="Helvetica-Oblique", alignment=TA_CENTER,
            spaceAfter=4 * mm,
        ),
        "footer": ParagraphStyle(
            "footer", parent=ss["Normal"],
            fontSize=8, leading=10, textColor=BRAND_GRAY,
            fontName="Helvetica", alignment=TA_CENTER,
        ),
        "callout": ParagraphStyle(
            "callout", parent=ss["Normal"],
            fontSize=10.5, leading=15, textColor=BRAND_DARK,
            fontName="Helvetica-Oblique",
            leftIndent=6 * mm, rightIndent=6 * mm,
            spaceBefore=3 * mm, spaceAfter=4 * mm,
            borderColor=BRAND_BLUE, borderWidth=0.5,
            borderPadding=8, backColor=BRAND_LIGHT,
        ),
    }
    return styles


# ═══════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════

def section(title, styles):
    return [
        HRFlowable(width="100%", thickness=0.5, color=DIVIDER_COLOR,
                    spaceBefore=4 * mm, spaceAfter=0),
        Paragraph(title, styles["section_title"]),
    ]


def sub(title, styles):
    return [Paragraph(title, styles["subsection_title"])]


def p(text, styles, style_key="body"):
    return Paragraph(text, styles[style_key])


def bullets(items, styles):
    result = []
    for item in items:
        result.append(Paragraph(f"• {item}", styles["bullet"]))
    return result


def callout(text, styles):
    return Paragraph(text, styles["callout"])


def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row."""
    ss = build_styles()
    data = [[Paragraph(h, ss["table_header"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), ss["table_cell"]) for c in row])

    available = PAGE_W - 2 * MARGIN
    if col_widths is None:
        col_widths = [available / len(headers)] * len(headers)

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, DIVIDER_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, TABLE_ALT_ROW]),
    ]

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t


# ═══════════════════════════════════════════════════════════════
# Page templates (header/footer)
# ═══════════════════════════════════════════════════════════════

class ScopeDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame = Frame(MARGIN, MARGIN + 10 * mm, PAGE_W - 2 * MARGIN,
                      PAGE_H - 2 * MARGIN - 10 * mm, id="main")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame],
                         onPage=self._cover_page),
            PageTemplate(id="content", frames=[frame],
                         onPage=self._content_page),
        ])

    def _cover_page(self, canvas, doc):
        canvas.saveState()
        # Blue accent bar at top
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, PAGE_H - 8 * mm, PAGE_W, 8 * mm, fill=1, stroke=0)
        # Thin accent line at bottom
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, 0, PAGE_W, 3 * mm, fill=1, stroke=0)
        canvas.restoreState()

    def _content_page(self, canvas, doc):
        canvas.saveState()
        # Header line
        canvas.setStrokeColor(BRAND_BLUE)
        canvas.setLineWidth(0.8)
        canvas.line(MARGIN, PAGE_H - 15 * mm, PAGE_W - MARGIN, PAGE_H - 15 * mm)

        # Header text
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawString(MARGIN, PAGE_H - 13 * mm,
                          "Attestara — Project Scope Document")
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 13 * mm,
                               "CONFIDENTIAL")

        # Footer
        canvas.setStrokeColor(DIVIDER_COLOR)
        canvas.line(MARGIN, MARGIN + 6 * mm, PAGE_W - MARGIN, MARGIN + 6 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawString(MARGIN, MARGIN + 1 * mm,
                          f"© {date.today().year} littledata")
        canvas.drawRightString(PAGE_W - MARGIN, MARGIN + 1 * mm,
                               f"Page {doc.page}")
        canvas.restoreState()


# ═══════════════════════════════════════════════════════════════
# Document content
# ═══════════════════════════════════════════════════════════════

def build_document():
    sty = build_styles()
    elements = []

    # ── COVER PAGE ──
    elements.append(Spacer(1, 30 * mm))

    # Logo
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=55 * mm, height=16.5 * mm)
        logo.hAlign = "LEFT"
        elements.append(logo)

    elements.append(Spacer(1, 18 * mm))
    elements.append(Paragraph("Attestara", sty["cover_title"]))
    elements.append(Paragraph(
        "Cryptographic Trust Protocol for Autonomous AI Agents",
        sty["cover_subtitle"],
    ))
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="40%", thickness=1.5, color=BRAND_BLUE,
                               spaceAfter=8 * mm, hAlign="LEFT"))
    elements.append(Paragraph("PROJECT SCOPE DOCUMENT", ParagraphStyle(
        "scope_label", fontName="Helvetica-Bold", fontSize=13,
        textColor=BRAND_ACCENT, spaceAfter=12 * mm,
    )))

    meta_lines = [
        f"<b>Version:</b> 1.0",
        f"<b>Date:</b> {date.today().strftime('%d %B %Y')}",
        f"<b>Classification:</b> Confidential — Internal & Selected External Stakeholders",
        f"<b>Prepared by:</b> littledata — Product & Engineering",
        f"<b>Contact:</b> mick@littledata.ai",
    ]
    for line in meta_lines:
        elements.append(Paragraph(line, sty["cover_meta"]))
        elements.append(Spacer(1, 1.5 * mm))

    elements.append(Spacer(1, 30 * mm))

    # Confidentiality notice
    elements.append(Paragraph(
        "<i>This document contains proprietary information belonging to littledata. "
        "It is intended solely for the use of authorised recipients. Unauthorised "
        "distribution, reproduction, or disclosure is strictly prohibited.</i>",
        ParagraphStyle("conf_notice", fontName="Helvetica-Oblique",
                       fontSize=8.5, leading=12, textColor=BRAND_GRAY,
                       alignment=TA_CENTER),
    ))

    # Switch to content template after cover
    from reportlab.platypus import NextPageTemplate
    elements.append(NextPageTemplate("content"))
    elements.append(PageBreak())

    # ── TABLE OF CONTENTS ──
    elements += section("Table of Contents", sty)
    toc_items = [
        ("1", "Executive Summary"),
        ("2", "Problem Statement & Market Opportunity"),
        ("3", "Solution Overview"),
        ("4", "Core Technology"),
        ("5", "Architecture & Technical Stack"),
        ("6", "Product Roadmap & Milestones"),
        ("7", "Go-to-Market Strategy"),
        ("8", "Business Model & Financial Projections"),
        ("9", "Competitive Landscape"),
        ("10", "Legal, Intellectual Property & Compliance"),
        ("11", "Team & Advisory Board"),
        ("12", "Risk Assessment"),
        ("13", "Appendix: Glossary"),
    ]
    for num, title in toc_items:
        elements.append(Paragraph(
            f"<b>{num}.</b>&nbsp;&nbsp;&nbsp;{title}",
            ParagraphStyle("toc_item", fontName="Helvetica", fontSize=11,
                           leading=18, textColor=BRAND_DARK, leftIndent=5 * mm),
        ))
    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 1. EXECUTIVE SUMMARY
    # ════════════════════════════════════════════════
    elements += section("1. Executive Summary", sty)

    elements.append(p(
        "Attestara is an open cryptographic trust protocol that enables autonomous AI agents "
        "to negotiate, commit, and be held accountable across organisational boundaries — "
        "without requiring inter-party trust. It functions as <b>the clearing house for the "
        "AI agent economy</b>, analogous to how the London Clearing House (est. 1832) enabled "
        "trust between competing banks.",
        sty,
    ))

    elements.append(p(
        "As enterprises deploy AI agents for procurement, supply-chain negotiation, and "
        "financial transactions, a critical governance gap has emerged: no infrastructure "
        "exists to cryptographically prove that an agent had authority to act, that it "
        "operated within its mandate, or that its commitments are auditable and legally "
        "enforceable. Attestara fills this gap.",
        sty,
    ))

    elements.append(callout(
        '"When two AI agents from competing companies negotiate a $2M supply contract, '
        'neither party can currently verify the other\'s agent had authority to commit. '
        'Attestara makes that verification instant, private, and cryptographically certain."',
        sty,
    ))

    elements.append(p(
        "The protocol combines <b>zero-knowledge proofs</b> (Groth16/Circom), "
        "<b>W3C Verifiable Credentials</b> (did:ethr), and <b>smart contracts</b> "
        "(Solidity on Arbitrum L2) to deliver three guarantees: authority verification "
        "without mandate disclosure, tamper-proof negotiation audit trails, and binding "
        "on-chain commitment records.",
        sty,
    ))

    elements += sub("Key Highlights", sty)
    elements += bullets([
        "<b>Uncontested market position:</b> No production competitor addresses B2B adversarial "
        "agent negotiation with privacy-preserving mandates and binding commitments.",
        "<b>Regulatory tailwind:</b> EU AI Act Article 9 enforcement (August 2026) creates "
        "urgent compliance demand for high-risk agentic systems.",
        "<b>Market scale:</b> Global AI agents market — $5.4B (2024) → $236B (2034). "
        "Agentic commerce projected at $5T globally by 2030.",
        "<b>Open protocol, commercial infrastructure:</b> Open specification drives adoption; "
        "proprietary SDK, managed services, and enterprise tooling capture value.",
        "<b>Seed requirement:</b> €500K–€750K for 26–28 month runway to break-even.",
    ], sty)

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 2. PROBLEM STATEMENT & MARKET OPPORTUNITY
    # ════════════════════════════════════════════════
    elements += section("2. Problem Statement & Market Opportunity", sty)

    elements += sub("2.1 The Governance Gap", sty)
    elements.append(p(
        "AI agents are now autonomously negotiating contracts, committing to supply agreements, "
        "and executing financial transactions on behalf of enterprises. Yet the infrastructure "
        "to govern these interactions does not exist:",
        sty,
    ))
    elements += bullets([
        "<b>No authority verification:</b> When Agent A proposes terms to Agent B, Agent B "
        "cannot verify that Agent A has been authorised to make that proposal.",
        "<b>No mandate enforcement:</b> A principal (human or organisation) cannot cryptographically "
        "constrain what its agent is permitted to negotiate — price ceilings, delivery windows, "
        "and parameter ranges are enforced only by trust.",
        "<b>No audit trail:</b> Regulators (EU AI Act Article 9, DORA) require demonstrable "
        "governance over high-risk AI systems. Today, there is nothing to show.",
        "<b>No binding commitments:</b> Agent agreements exist only in ephemeral API calls — "
        "there is no immutable, timestamped record of what was agreed.",
    ], sty)

    elements += sub("2.2 Market Opportunity", sty)

    market_data = [
        ["Segment", "2024", "2034 (Projected)", "CAGR"],
        ["Global AI Agents", "$5.4B", "$236B", "45.8%"],
        ["Agentic Commerce", "—", "$5T (2030)", "—"],
        ["Enterprise AI Governance", "Emerging", "Fastest-growing compliance category", "—"],
    ]
    aw = PAGE_W - 2 * MARGIN
    elements.append(make_table(
        market_data[0], market_data[1:],
        col_widths=[aw * 0.28, aw * 0.18, aw * 0.36, aw * 0.18],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 1: Addressable market sizing", sty["caption"]))

    elements += sub("2.3 Regulatory Drivers", sty)
    elements += bullets([
        "<b>EU AI Act Article 9</b> — High-risk agentic systems require risk management, "
        "logging, human oversight, and transparency. Enforcement begins August 2026.",
        "<b>DORA (Digital Operational Resilience Act)</b> — In force since January 2025; "
        "mandates ICT risk governance for financial services.",
        "<b>UK Treasury Select Committee (January 2026)</b> — Called for mandatory AI "
        "governance frameworks for financial institutions.",
    ], sty)

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 3. SOLUTION OVERVIEW
    # ════════════════════════════════════════════════
    elements += section("3. Solution Overview", sty)

    elements.append(p(
        "Attestara provides a three-layer trust infrastructure for AI agent interactions:",
        sty,
    ))

    elements += sub("3.1 Credential Layer — Authority Binding", sty)
    elements.append(p(
        "Principals (organisations or authorised humans) issue <b>Authority Credentials</b> "
        "to their AI agents using the W3C Verifiable Credentials standard. Each credential "
        "cryptographically encodes the agent's negotiation mandate: maximum commitment value, "
        "allowed parameter ranges (price, quantity, delivery window), and time-bound validity.",
        sty,
    ))

    elements += sub("3.2 Zero-Knowledge Proof Layer — Private Verification", sty)
    elements.append(p(
        "At each turn of a negotiation, the acting agent generates a <b>zero-knowledge proof</b> "
        "demonstrating that its proposal falls within its mandate — without revealing the mandate "
        "itself. The counterparty verifies the proof on-chain or off-chain in milliseconds.",
        sty,
    ))
    elements.append(p("Four core ZK circuits enforce compliance:", sty))
    zk_data = [
        ["Circuit", "Purpose", "What It Proves"],
        ["MandateBound", "Value ceiling enforcement",
         "proposed_value ≤ max_value (without revealing max_value)"],
        ["ParameterRange", "Multi-dimensional constraints",
         "floor ≤ parameter ≤ ceiling for price, quantity, delivery"],
        ["CredentialFreshness", "Temporal validity",
         "Credential is valid at the current timestamp"],
        ["IdentityBinding", "Agent authentication",
         "Session key is owned by the DID in the credential"],
    ]
    elements.append(make_table(
        zk_data[0], zk_data[1:],
        col_widths=[aw * 0.20, aw * 0.30, aw * 0.50],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 2: Core ZK circuit specifications", sty["caption"]))

    elements += sub("3.3 Commitment Layer — Binding Settlement", sty)
    elements.append(p(
        "When agents reach agreement, the final terms are recorded as an immutable "
        "<b>commitment record</b> on Arbitrum (Ethereum L2). Each record includes dual "
        "signatures from both agents, anchored session hashes, and ZK proof references — "
        "creating a tamper-proof, timestamped, auditable record of what was agreed and by whom.",
        sty,
    ))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 4. CORE TECHNOLOGY
    # ════════════════════════════════════════════════
    elements += section("4. Core Technology", sty)

    elements += sub("4.1 Zero-Knowledge Proofs (Groth16 / Circom)", sty)
    elements.append(p(
        "Attestara uses <b>Groth16 proofs</b> compiled from Circom 2.x circuits. Groth16 was "
        "selected over PLONK for its smaller proof size (~192 bytes) and cheaper on-chain "
        "verification (~210K gas vs. ~300K+ for PLONK). A trusted setup ceremony with 2–5 "
        "participants secures the PoC phase, with a larger ceremony planned pre-mainnet.",
        sty,
    ))
    elements.append(p("Performance targets:", sty, "body_bold"))
    elements += bullets([
        "Proof generation: &lt; 2 seconds (browser/server)",
        "Proof verification: &lt; 250K L1-equivalent gas",
        "Session cost on Arbitrum: ~$0.06 (vs. $15+ on Ethereum mainnet)",
    ], sty)

    elements += sub("4.2 Decentralised Identity (W3C DID / Verifiable Credentials)", sty)
    elements.append(p(
        "Agent identities are anchored using <b>did:ethr</b> (ERC-1056), the most mature "
        "Ethereum-native W3C DID method. Authority Credentials follow the W3C Verifiable "
        "Credentials Data Model 2.0, managed via the Veramo framework. This ensures "
        "interoperability with the broader decentralised identity ecosystem.",
        sty,
    ))

    elements += sub("4.3 Smart Contracts (Solidity / Arbitrum)", sty)
    elements.append(p("Three core contracts form the on-chain layer:", sty))
    contracts_data = [
        ["Contract", "Responsibility"],
        ["AgentRegistry", "Maps DIDs to on-chain identities; stores agent metadata and status"],
        ["CredentialRegistry", "Anchors credential hashes; supports revocation and expiry checks"],
        ["CommitmentContract", "Records finalised agreements with dual signatures and proof references"],
    ]
    elements.append(make_table(
        contracts_data[0], contracts_data[1:],
        col_widths=[aw * 0.30, aw * 0.70],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 3: Core smart contracts", sty["caption"]))

    elements += sub("4.4 Session Anchoring", sty)
    elements.append(p(
        "Each negotiation turn is cryptographically linked to the previous one via session "
        "anchoring — a hash chain mechanism that prevents turn reordering, deletion, or "
        "injection. Session hashes are periodically anchored on-chain, creating an immutable "
        "audit trail without requiring every message to be recorded on the blockchain.",
        sty,
    ))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 5. ARCHITECTURE & TECH STACK
    # ════════════════════════════════════════════════
    elements += section("5. Architecture & Technical Stack", sty)

    elements += sub("5.1 Monorepo Structure", sty)
    elements.append(p(
        "Attestara is built as a <b>Turborepo + pnpm</b> monorepo with seven packages, "
        "each with a clearly defined responsibility:",
        sty,
    ))
    pkg_data = [
        ["Package", "Technology", "Purpose"],
        ["@attestara/types", "TypeScript", "Shared interfaces (DID, credentials, sessions, proofs)"],
        ["@attestara/contracts", "Solidity + Circom", "Smart contracts and ZK circuits (Hardhat)"],
        ["@attestara/sdk", "TypeScript (Veramo, ethers.js, snarkjs)", "Main developer SDK"],
        ["@attestara/prover", "Fastify + Worker Threads", "Managed ZK proof generation service"],
        ["@attestara/relay", "Fastify + Prisma + WebSocket", "Session relay and cross-org transport"],
        ["@attestara/cli", "Commander.js", "Command-line tools for agent and session management"],
        ["@attestara/portal", "Next.js (App Router) + Tailwind", "Dashboard, explorer, and marketing site"],
    ]
    elements.append(make_table(
        pkg_data[0], pkg_data[1:],
        col_widths=[aw * 0.24, aw * 0.32, aw * 0.44],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 4: Monorepo package structure", sty["caption"]))

    elements += sub("5.2 Infrastructure", sty)
    infra_data = [
        ["Component", "Technology", "Rationale"],
        ["Blockchain", "Arbitrum One (Ethereum L2)", "~95% gas reduction vs. mainnet"],
        ["RPC Provider", "Alchemy", "Enterprise-grade reliability and indexing"],
        ["Database", "PostgreSQL + Prisma ORM", "Relational data with type-safe queries"],
        ["Cache / Real-time", "Redis", "Session state, pub/sub, and caching"],
        ["Storage", "IPFS via Pinata", "Decentralised credential and proof archival"],
        ["Hosting", "Render", "Zero-config deployment with auto-scaling"],
        ["Testing", "Vitest + Playwright", "Unit/integration + end-to-end browser tests"],
    ]
    elements.append(make_table(
        infra_data[0], infra_data[1:],
        col_widths=[aw * 0.22, aw * 0.32, aw * 0.46],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 5: Infrastructure stack", sty["caption"]))

    elements += sub("5.3 Deployment Modes", sty)
    elements.append(p(
        "Attestara supports two deployment models to accommodate different enterprise needs:",
        sty,
    ))
    elements += bullets([
        "<b>Open DAO Mode:</b> Public protocol participation via on-chain governance. "
        "Suited for interoperable, multi-party ecosystems.",
        "<b>Bilateral P2P Mode:</b> Private deployment between two known counterparties. "
        "Suited for regulated enterprises requiring data sovereignty and compliance isolation.",
    ], sty)

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 6. PRODUCT ROADMAP & MILESTONES
    # ════════════════════════════════════════════════
    elements += section("6. Product Roadmap & Milestones", sty)

    elements += sub("6.1 MVP Phase (Months 1–4)", sty)
    elements.append(p("Three parallel development tracks:", sty))

    elements.append(p("<b>Track 1 — ZK Circuits & Smart Contracts</b>", sty, "body_bold"))
    elements += bullets([
        "Implement and test 4 Circom ZK circuits (MandateBound, ParameterRange, CredentialFreshness, IdentityBinding)",
        "Deploy AgentRegistry, CredentialRegistry, and CommitmentContract to Arbitrum testnet",
        "Conduct PoC-level trusted setup ceremony (2–5 participants)",
        "Achieve performance targets: proof gen &lt;2s, verification &lt;250K gas",
    ], sty)

    elements.append(p("<b>Track 2 — SDK & Backend Services</b>", sty, "body_bold"))
    elements += bullets([
        "Build TypeScript SDK with identity, credential, prover, negotiation, and commitment modules",
        "Deploy managed prover service (Fastify + worker threads)",
        "Deploy session relay with cross-org authorisation and WebSocket transport",
        "Python adapters for LangChain and AutoGen integration",
    ], sty)

    elements.append(p("<b>Track 3 — Portal & Developer Experience</b>", sty, "body_bold"))
    elements += bullets([
        "Launch Next.js dashboard with session monitoring, agent management, and commitment explorer",
        "Build interactive demo: end-to-end 5-turn negotiation walkthrough",
        "Publish CLI tools and developer documentation",
        "Achieve &lt;30 minute hello-world onboarding (npm install → working negotiation)",
    ], sty)

    elements += sub("6.2 Pilot Phase (Months 5–18)", sty)
    elements += bullets([
        "5–7 paid pilot engagements (€20K–€30K each) with financial services firms",
        "Production deployment on Arbitrum mainnet with audited ZK circuits",
        "Full-scale trusted setup ceremony",
        "Case study publication and reference customer programme",
        "W3C CCG Work Item submission and AAIF Trust Layer Working Group proposal",
    ], sty)

    elements += sub("6.3 Scale Phase (Months 19–36)", sty)
    elements += bullets([
        "3–4 pilot-to-SaaS conversions; target €380K SaaS ARR by Month 24",
        "Systems integrator partnerships (Deloitte, Accenture, PwC)",
        "ISO/IEC 42001 compliance mapping documentation",
        "Protocol specification donation to standards body (W3C CCG or AAIF)",
        "Geographic expansion: UK, EU, Singapore, US markets",
    ], sty)

    elements += sub("6.4 MVP Success Criteria", sty)
    success_data = [
        ["Metric", "Target"],
        ["ZK proof generation time", "< 2 seconds"],
        ["On-chain verification cost", "< 250K L1-equivalent gas"],
        ["End-to-end demo", "Complete 5-turn negotiation"],
        ["Developer onboarding", "< 30 minutes to first negotiation"],
        ["Pipeline", "3+ letters of intent for pilot engagements"],
    ]
    elements.append(make_table(
        success_data[0], success_data[1:],
        col_widths=[aw * 0.45, aw * 0.55],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 6: MVP success criteria", sty["caption"]))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 7. GO-TO-MARKET STRATEGY
    # ════════════════════════════════════════════════
    elements += section("7. Go-to-Market Strategy", sty)

    elements += sub("7.1 Beachhead Vertical: Financial Services", sty)
    elements.append(p(
        "Financial services is the primary beachhead due to three converging factors: "
        "regulatory urgency (DORA + EU AI Act), high-value multi-agent transactions, "
        "and existing clearing house mental models that make Attestara's value proposition "
        "immediately intuitive.",
        sty,
    ))

    elements += sub("7.2 Target Customer Profiles", sty)
    icp_data = [
        ["Segment", "Buyer Persona", "Pain Point"],
        ["Enterprise Financial Services", "CISO, CTO, Head of AI Governance",
         "DORA/EU AI Act compliance for agentic trading and risk systems"],
        ["Enterprise Procurement", "CPO, Digital Procurement Head",
         "Deploying Google A2A with no governance layer for adversarial negotiation"],
        ["Legal & Professional Services", "Managing Partner, Legal Tech Lead",
         "AI governance audit trails for client engagements and contract automation"],
    ]
    elements.append(make_table(
        icp_data[0], icp_data[1:],
        col_widths=[aw * 0.25, aw * 0.30, aw * 0.45],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 7: Target customer segments", sty["caption"]))

    elements += sub("7.3 Phased Sales Motion", sty)
    elements += bullets([
        "<b>Phase 0 (Months 1–6):</b> Thought leadership via technical blog series; protocol "
        "specification published on GitHub; W3C CCG submission preparation.",
        "<b>Phase 1 (Months 6–18):</b> 5–7 paid pilot engagements with case studies; "
        "direct enterprise sales with integration support (€1,500/day).",
        "<b>Phase 2 (Months 18–36):</b> SaaS self-serve scale; systems integrator "
        "partnerships; standards body recognition driving inbound demand.",
    ], sty)

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 8. BUSINESS MODEL & FINANCIALS
    # ════════════════════════════════════════════════
    elements += section("8. Business Model & Financial Projections", sty)

    elements += sub("8.1 Revenue Streams", sty)
    rev_data = [
        ["Stream", "Model", "Pricing"],
        ["Enterprise SDK Licence", "Annual subscription",
         "€6K–€22K/year (tiered by agent count)"],
        ["Managed Prover Service", "Usage-based SaaS",
         "€500–€9,000/month (tiered by session volume)"],
        ["Professional Services", "Project-based",
         "€20K–€30K per pilot; €1,500/day integration"],
        ["Advisory Retainers", "Monthly retainer",
         "Custom pricing for ongoing governance advisory"],
    ]
    elements.append(make_table(
        rev_data[0], rev_data[1:],
        col_widths=[aw * 0.25, aw * 0.25, aw * 0.50],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 8: Revenue model", sty["caption"]))

    elements += sub("8.2 Financial Projections (Base Case)", sty)
    fin_data = [
        ["Metric", "Year 1", "Year 2", "Year 3"],
        ["Revenue", "€102K", "€351K", "€1,073K"],
        ["Customers", "5", "23", "64"],
        ["SaaS ARR", "—", "€380K", "€1,350K"],
        ["Revenue Mix", "89% services", "54% SaaS / 46% services", "72% SaaS / 28% services"],
    ]
    elements.append(make_table(
        fin_data[0], fin_data[1:],
        col_widths=[aw * 0.22, aw * 0.26, aw * 0.26, aw * 0.26],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 9: 36-month financial projections (base case)", sty["caption"]))

    elements += sub("8.3 Seed Funding Requirement", sty)
    elements.append(p(
        "Seeking <b>€500K–€750K</b> seed investment for 26–28 months of runway to break-even (Month 30–33):",
        sty,
    ))
    fund_data = [
        ["Allocation", "Amount", "% of Total"],
        ["Product Development", "€200K", "30%"],
        ["Engineering Hires (Year 2)", "€180K", "27%"],
        ["Legal & Compliance", "€95K", "14%"],
        ["Go-to-Market", "€75K", "11%"],
        ["Infrastructure", "€50K", "7%"],
        ["Contingency Buffer", "€75K", "11%"],
    ]
    elements.append(make_table(
        fund_data[0], fund_data[1:],
        col_widths=[aw * 0.40, aw * 0.30, aw * 0.30],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 10: Seed funding allocation", sty["caption"]))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 9. COMPETITIVE LANDSCAPE
    # ════════════════════════════════════════════════
    elements += section("9. Competitive Landscape", sty)

    elements.append(p(
        "Attestara occupies an <b>uncontested market position</b>. Existing players address "
        "adjacent problems but none deliver the combination of authority verification, "
        "privacy-preserving mandate enforcement, and binding commitment settlement:",
        sty,
    ))

    comp_data = [
        ["Player", "What They Solve", "What They Don't Solve"],
        ["Google A2A", "Agent interoperability and discovery",
         "Authority enforcement, adversarial negotiation, binding commitments"],
        ["Visa / Mastercard Agent Payments", "Consumer agent checkout and payments",
         "B2B adversarial negotiation, mandate privacy, cross-org governance"],
        ["Salesforce Agentforce", "Agent capability discovery and routing",
         "Cryptographic verifiability, ZK mandate proofs, on-chain settlement"],
        ["Fetch.ai / SNET", "Decentralised agent marketplaces",
         "Enterprise compliance, ZK authority proofs, regulatory readiness"],
        ["Existing IAM (Okta, Auth0)", "User identity and access management",
         "Agent-to-agent authority delegation, mandate-bound negotiation"],
    ]
    elements.append(make_table(
        comp_data[0], comp_data[1:],
        col_widths=[aw * 0.22, aw * 0.39, aw * 0.39],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 11: Competitive positioning", sty["caption"]))

    elements.append(callout(
        "Attestara is the only solution that combines all three: ZK-backed authority "
        "verification without mandate disclosure, privacy-preserving adversarial negotiation, "
        "and cryptographically binding on-chain commitment settlement.",
        sty,
    ))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 10. LEGAL, IP & COMPLIANCE
    # ════════════════════════════════════════════════
    elements += section("10. Legal, Intellectual Property & Compliance", sty)

    elements += sub("10.1 IP & Licensing Strategy", sty)
    ip_data = [
        ["Asset", "Licence", "Rationale"],
        ["Protocol Specification", "CC BY 4.0", "Maximise adoption; anyone can implement"],
        ["ZK Circuits Library", "MIT", "Zero friction for commercial integration"],
        ["Reference SDK", "LGPL v3", "Open use; modifications must be shared"],
        ["Enterprise SDK", "Proprietary", "Commercial licence with SLA and support"],
        ["Prover Service & Portal", "SaaS ToS", "Managed infrastructure; usage-based"],
    ]
    elements.append(make_table(
        ip_data[0], ip_data[1:],
        col_widths=[aw * 0.25, aw * 0.20, aw * 0.55],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 12: IP licensing matrix", sty["caption"]))

    elements += sub("10.2 Trademark & Patents", sty)
    elements += bullets([
        '<b>Trademark:</b> "Attestara" registered in Gibraltar, EU, UK, and US.',
        "<b>Patents:</b> Defensive filings planned on ZK mandate proofs and dual-signature "
        "session anchoring (within 12 months of public disclosure).",
        "<b>Fork Defence:</b> Protocol specification to be donated to a standards body "
        "(W3C CCG or AAIF) with supermajority governance. Trademark prevents competing "
        "forks from using the Attestara name.",
    ], sty)

    elements += sub("10.3 Entity & Jurisdiction", sty)
    elements.append(p(
        "Jurisdiction-neutral design, with <b>Gibraltar CLG</b> (Company Limited by Guarantee) "
        "as the preferred entity structure for the MVP phase, leveraging Gibraltar's existing "
        "DLT Provider framework and regulatory clarity for blockchain-based services.",
        sty,
    ))

    elements += sub("10.4 Regulatory Compliance", sty)
    elements += bullets([
        "<b>EU AI Act:</b> Attestara provides the technical infrastructure for Article 9 "
        "compliance — risk management, logging, human oversight, and transparency for agentic systems.",
        "<b>DORA:</b> Commitment records and audit trails satisfy ICT risk governance requirements.",
        "<b>eIDAS:</b> Legal enforceability of agent digital signatures requires external counsel opinion.",
    ], sty)

    elements += sub("10.5 Security Audit", sty)
    elements.append(p(
        "Pre-mainnet ZK circuit audit by <b>Trail of Bits or Zellic</b> (estimated €60K–€120K) "
        "is a non-negotiable requirement before production deployment. This is budgeted within "
        "the legal and compliance allocation.",
        sty,
    ))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 11. TEAM & ADVISORY BOARD
    # ════════════════════════════════════════════════
    elements += section("11. Team & Advisory Board", sty)

    elements += sub("11.1 Core Team", sty)
    elements.append(p(
        "The project is led by the littledata product and engineering team, with deep "
        "expertise in AI governance, enterprise SaaS, and compliance tooling — demonstrated "
        "through production deployments of littledata.ai (AI risk platform) and bhapi.ai "
        "(family AI governance).",
        sty,
    ))

    elements += sub("11.2 Planned Advisory Board", sty)
    advisory_data = [
        ["Domain", "Profile", "Contribution"],
        ["ZK Cryptography", "Academic researcher (Groth16/PLONK/STARKs)",
         "Circuit design review; trusted setup ceremony oversight"],
        ["Financial Market Infrastructure", "Former clearing house / post-trade executive",
         "Product-market fit validation; customer introductions"],
        ["EU AI Act & Policy", "Former Commission official or RegTech lawyer",
         "Regulatory positioning; compliance certification guidance"],
        ["Enterprise Procurement", "CPO / Head of AI Governance at major enterprise",
         "Reference customer; product feedback; procurement workflow validation"],
    ]
    elements.append(make_table(
        advisory_data[0], advisory_data[1:],
        col_widths=[aw * 0.22, aw * 0.35, aw * 0.43],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 13: Advisory board plan", sty["caption"]))

    elements += sub("11.3 Key Hires (Year 2)", sty)
    elements += bullets([
        "<b>ZK Circuit Contractor (Month 1–4):</b> Specialist Circom/Groth16 developer "
        "for circuit implementation and optimisation.",
        "<b>Senior Backend Engineer (Month 10–12):</b> SDK and infrastructure scaling.",
        "<b>Developer Relations (Month 14–16):</b> Documentation, community, and "
        "integration support.",
    ], sty)

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 12. RISK ASSESSMENT
    # ════════════════════════════════════════════════
    elements += section("12. Risk Assessment", sty)

    risk_data = [
        ["Risk", "Severity", "Likelihood", "Mitigation"],
        ["ZK circuit vulnerability discovered post-deployment",
         "Critical", "Low",
         "Pre-mainnet audit by Trail of Bits/Zellic; bug bounty programme; circuit versioning"],
        ["Regulatory uncertainty on AI agent legal status",
         "High", "Medium",
         "External counsel engagement; eIDAS analysis; Gibraltar DLT framework alignment"],
        ["Large platform (Google, Microsoft) enters space",
         "High", "Medium",
         "Open protocol creates switching cost moat; standards body donation locks interoperability"],
        ["Enterprise sales cycle exceeds projections",
         "Medium", "High",
         "Professional services revenue bridges gap; pilot-to-SaaS conversion focus"],
        ["Trusted setup ceremony compromise",
         "Critical", "Very Low",
         "Multi-party ceremony design; eventual migration to PLONK (no trusted setup)"],
        ["Developer adoption below targets",
         "Medium", "Medium",
         "&lt;30min onboarding target; interactive demo; Python adapters for ML ecosystem"],
        ["Key person dependency (ZK expertise)",
         "Medium", "Medium",
         "Document all circuit designs; contractor knowledge transfer; advisory board backup"],
    ]
    elements.append(make_table(
        risk_data[0], risk_data[1:],
        col_widths=[aw * 0.28, aw * 0.12, aw * 0.14, aw * 0.46],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 14: Risk register", sty["caption"]))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════
    # 13. APPENDIX: GLOSSARY
    # ════════════════════════════════════════════════
    elements += section("13. Appendix: Glossary", sty)

    glossary = [
        ["Term", "Definition"],
        ["Authority Credential", "A W3C Verifiable Credential encoding an agent's negotiation mandate (value limits, parameter ranges, validity period)"],
        ["Commitment Record", "An immutable on-chain record of a finalised agent-to-agent agreement, including dual signatures and ZK proof references"],
        ["DID (Decentralised Identifier)", "A W3C standard for self-sovereign digital identity; Attestara uses did:ethr (ERC-1056)"],
        ["DORA", "Digital Operational Resilience Act — EU regulation mandating ICT risk governance for financial services (in force January 2025)"],
        ["EU AI Act", "European Union regulation on artificial intelligence; Article 9 covers high-risk AI system requirements (enforcement August 2026)"],
        ["Groth16", "A zero-knowledge proof system producing compact proofs (~192 bytes) with efficient on-chain verification"],
        ["Mandate", "The set of constraints defining what an agent is authorised to negotiate (price ceilings, parameter ranges, time limits)"],
        ["Session Anchoring", "A hash chain mechanism linking negotiation turns cryptographically, preventing reordering or tampering"],
        ["Verifiable Credential (VC)", "A tamper-evident, cryptographically verifiable digital credential following the W3C standard"],
        ["Zero-Knowledge Proof (ZKP)", "A cryptographic method enabling one party to prove a statement is true without revealing the underlying data"],
    ]
    elements.append(make_table(
        glossary[0], glossary[1:],
        col_widths=[aw * 0.28, aw * 0.72],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Table 15: Glossary of key terms", sty["caption"]))

    elements.append(Spacer(1, 20 * mm))
    elements.append(HRFlowable(width="30%", thickness=1, color=BRAND_BLUE,
                               spaceAfter=6 * mm))
    elements.append(Paragraph(
        "<b>End of Document</b>",
        ParagraphStyle("end", fontName="Helvetica-Bold", fontSize=11,
                       textColor=BRAND_GRAY, alignment=TA_CENTER),
    ))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        "For questions or further information, contact <b>mick@littledata.ai</b>",
        ParagraphStyle("contact_end", fontName="Helvetica", fontSize=10,
                       textColor=BRAND_GRAY, alignment=TA_CENTER),
    ))

    return elements


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

def main():
    doc = ScopeDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN + 10 * mm,
        bottomMargin=MARGIN + 8 * mm,
        title="Attestara — Project Scope Document",
        author="littledata",
        subject="Cryptographic Trust Protocol for Autonomous AI Agents",
    )

    elements = build_document()
    doc.build(elements)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Pages: {doc.page}")


if __name__ == "__main__":
    main()
