#!/usr/bin/env python3
"""Generate professional PDF for Attestara Competitive Analysis.
Matches the styling of Attestara_Project_Scope.pdf (littledata branding).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from datetime import datetime
import os

# --- Colours (matching reference PDF) ---
NAVY = HexColor('#1a1a2e')
DARK_BLUE = HexColor('#16213e')
ACCENT_BLUE = HexColor('#0f3460')
HIGHLIGHT = HexColor('#e94560')
LIGHT_GREY = HexColor('#f5f5f5')
MID_GREY = HexColor('#666666')
DARK_GREY = HexColor('#333333')
TABLE_HEADER_BG = HexColor('#1a1a2e')
TABLE_ALT_BG = HexColor('#f8f9fa')
TABLE_BORDER = HexColor('#dee2e6')
GREEN_CHECK = HexColor('#28a745')
RED_X = HexColor('#dc3545')
AMBER = HexColor('#ffc107')

LOGO_PATH = os.path.join('C:', os.sep, 'claude', 'littledata-mvp', 'docs', 'littledata.png')
OUTPUT_PATH = os.path.join('C:', os.sep, 'claude', 'attestara', 'Attestara_Competitive_Analysis.pdf')

PAGE_W, PAGE_H = A4
LEFT_MARGIN = 2.0 * cm
RIGHT_MARGIN = 2.0 * cm
TOP_MARGIN = 2.5 * cm
BOTTOM_MARGIN = 2.5 * cm


# --- Cover page drawn via onPage callback (absolute canvas coordinates) ---
def draw_cover_page(canvas, doc):
    """Full-page cover matching reference PDF style."""
    c = canvas
    c.saveState()

    # Navy background (full page)
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Accent bar at top
    c.setFillColor(HIGHLIGHT)
    c.rect(0, PAGE_H - 8*mm, PAGE_W, 8*mm, fill=1, stroke=0)

    # Logo with white background pad (logo PNG is not transparent)
    if os.path.exists(LOGO_PATH):
        logo_w, logo_h = 80, 24
        logo_x = LEFT_MARGIN
        logo_y = PAGE_H - 45*mm
        pad = 6  # white padding around logo

        # White rounded rect behind logo
        c.setFillColor(white)
        c.roundRect(logo_x - pad, logo_y - pad,
                    logo_w + 2*pad, logo_h + 2*pad,
                    4, fill=1, stroke=0)

        c.drawImage(LOGO_PATH, logo_x, logo_y, width=logo_w, height=logo_h,
                   preserveAspectRatio=True, mask='auto')

    # Title block
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 36)
    c.drawString(LEFT_MARGIN, PAGE_H - 100*mm, 'Attestara')

    c.setFont('Helvetica', 14)
    c.drawString(LEFT_MARGIN, PAGE_H - 115*mm,
                 'Cryptographic Trust Protocol for Autonomous AI Agents')

    # Accent line
    c.setStrokeColor(HIGHLIGHT)
    c.setLineWidth(3)
    c.line(LEFT_MARGIN, PAGE_H - 125*mm, LEFT_MARGIN + 80*mm, PAGE_H - 125*mm)

    # Subtitle
    c.setFont('Helvetica-Bold', 20)
    c.setFillColor(white)
    c.drawString(LEFT_MARGIN, PAGE_H - 145*mm, 'COMPETITIVE ANALYSIS')

    c.setFont('Helvetica', 13)
    c.drawString(LEFT_MARGIN, PAGE_H - 160*mm,
                 'Market Fit Validation and Strategic Opportunity Assessment')

    # Metadata block
    y = PAGE_H - 200*mm
    c.setFont('Helvetica', 10)
    c.setFillColor(HexColor('#aaaaaa'))
    meta = [
        ('Version:', '1.0'),
        ('Date:', '24 March 2026'),
        ('Classification:', 'Confidential \u2014 Internal & Selected External Stakeholders'),
        ('Prepared by:', 'littledata \u2014 Product & Engineering'),
        ('Contact:', 'mick@littledata.ai'),
    ]
    for label, value in meta:
        c.setFont('Helvetica-Bold', 10)
        c.drawString(LEFT_MARGIN, y, label)
        c.setFont('Helvetica', 10)
        c.drawString(LEFT_MARGIN + 90, y, value)
        y -= 16

    # Confidentiality notice
    y -= 20
    c.setFont('Helvetica-Oblique', 8)
    c.setFillColor(HexColor('#888888'))
    c.drawString(LEFT_MARGIN, y,
                 'This document contains proprietary information belonging to littledata. '
                 'It is intended solely for the use of authorised')
    c.drawString(LEFT_MARGIN, y - 12,
                 'recipients. Unauthorised distribution, reproduction, or disclosure is strictly prohibited.')

    c.restoreState()


class ThreatBadge(Flowable):
    """Inline threat level badge."""
    def __init__(self, level, width=120, height=18):
        super().__init__()
        self.level = level.upper()
        self.width = width
        self.height = height
        self._colors = {
            'NEGLIGIBLE': HexColor('#28a745'),
            'LOW': HexColor('#20c997'),
            'LOW-MEDIUM': HexColor('#ffc107'),
            'MEDIUM': HexColor('#fd7e14'),
            'HIGH': HexColor('#dc3545'),
        }

    def draw(self):
        color = self._colors.get(self.level, MID_GREY)
        self.canv.setFillColor(color)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)
        self.canv.setFillColor(white)
        self.canv.setFont('Helvetica-Bold', 9)
        tw = pdfmetrics.stringWidth(self.level, 'Helvetica-Bold', 9)
        self.canv.drawString((self.width - tw) / 2, 5, self.level)


# --- Styles ---
def create_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'DocTitle', parent=styles['Title'],
        fontSize=22, leading=28, textColor=NAVY,
        spaceAfter=6*mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'H1', parent=styles['Heading1'],
        fontSize=18, leading=24, textColor=NAVY,
        spaceBefore=10*mm, spaceAfter=5*mm, fontName='Helvetica-Bold',
        borderWidth=0, borderPadding=0,
    ))
    styles.add(ParagraphStyle(
        'H2', parent=styles['Heading2'],
        fontSize=14, leading=18, textColor=ACCENT_BLUE,
        spaceBefore=7*mm, spaceAfter=3*mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'H3', parent=styles['Heading3'],
        fontSize=11, leading=15, textColor=DARK_BLUE,
        spaceBefore=4*mm, spaceAfter=2*mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'BodyText2', parent=styles['BodyText'],
        fontSize=10, leading=14.5, textColor=DARK_GREY,
        alignment=TA_JUSTIFY, spaceAfter=3*mm, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'Quote', parent=styles['BodyText'],
        fontSize=10, leading=14, textColor=ACCENT_BLUE,
        leftIndent=15*mm, rightIndent=10*mm, spaceBefore=3*mm, spaceAfter=3*mm,
        fontName='Helvetica-Oblique', borderWidth=0,
        borderColor=HIGHLIGHT, borderPadding=5,
    ))
    styles.add(ParagraphStyle(
        'BulletItem', parent=styles['BodyText'],
        fontSize=10, leading=14.5, textColor=DARK_GREY,
        leftIndent=12*mm, bulletIndent=6*mm, spaceAfter=2*mm,
        fontName='Helvetica', alignment=TA_LEFT,
        bulletFontName='Helvetica', bulletFontSize=10,
    ))
    styles.add(ParagraphStyle(
        'CompetitorMeta', parent=styles['BodyText'],
        fontSize=9.5, leading=13, textColor=MID_GREY,
        leftIndent=5*mm, spaceAfter=1.5*mm, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'ThreatLevel', parent=styles['BodyText'],
        fontSize=10, leading=14, textColor=DARK_GREY,
        spaceBefore=2*mm, spaceAfter=4*mm, fontName='Helvetica-Bold',
        leftIndent=5*mm,
    ))
    styles.add(ParagraphStyle(
        'Sources', parent=styles['BodyText'],
        fontSize=7.5, leading=10, textColor=MID_GREY,
        alignment=TA_LEFT, fontName='Helvetica-Oblique',
        spaceBefore=5*mm,
    ))
    styles.add(ParagraphStyle(
        'TOCEntry', parent=styles['BodyText'],
        fontSize=11, leading=18, textColor=DARK_GREY,
        leftIndent=8*mm, fontName='Helvetica', spaceAfter=1*mm,
    ))
    styles.add(ParagraphStyle(
        'TOCTitle', parent=styles['Heading1'],
        fontSize=18, leading=24, textColor=NAVY,
        spaceBefore=5*mm, spaceAfter=8*mm, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=8, textColor=MID_GREY, fontName='Helvetica',
    ))
    return styles


# --- Header / Footer ---
def header_footer(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(HIGHLIGHT)
    canvas.setLineWidth(1.5)
    canvas.line(LEFT_MARGIN, PAGE_H - 18*mm, PAGE_W - RIGHT_MARGIN, PAGE_H - 18*mm)

    # Header text
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(LEFT_MARGIN, PAGE_H - 16*mm, 'Attestara \u2014 Competitive Analysis')
    canvas.drawRightString(PAGE_W - RIGHT_MARGIN, PAGE_H - 16*mm, 'CONFIDENTIAL')

    # Footer
    canvas.setStrokeColor(TABLE_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_MARGIN, 18*mm, PAGE_W - RIGHT_MARGIN, 18*mm)

    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(LEFT_MARGIN, 12*mm, '\u00a9 2026 littledata')
    canvas.drawCentredString(PAGE_W / 2, 12*mm, f'Page {doc.page}')

    # Logo in footer
    if os.path.exists(LOGO_PATH):
        canvas.drawImage(LOGO_PATH, PAGE_W - RIGHT_MARGIN - 50, 10*mm,
                        width=50, height=15, preserveAspectRatio=True, mask='auto')

    canvas.restoreState()


# --- Table helpers ---
def make_competitor_table(data, col_widths=None):
    """Create a styled comparison table."""
    if col_widths is None:
        avail = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN
        col_widths = [avail / len(data[0])] * len(data[0])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('LEADING', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    # Alternate row shading
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ALT_BG))

    t.setStyle(TableStyle(style_cmds))
    return t


# --- Build Document ---
def build_document():
    styles = create_styles()
    story = []

    # Cover page — content drawn by onPage callback; just need a spacer + page break
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # Table of Contents
    story.append(Paragraph('Table of Contents', styles['TOCTitle']))
    toc_items = [
        '1.\u2003Executive Summary',
        '2.\u2003Market Context and Size',
        '3.\u2003Competitive Landscape Overview',
        '4.\u2003Competitor Deep Dives',
        '5.\u2003Competitive Gap Analysis',
        '6.\u2003Unique Differentiators',
        '7.\u2003Market Opportunity Segmentation',
        '8.\u2003Threat Assessment',
        '9.\u2003Strategic Positioning Recommendations',
        '10.\u2003Market Timing Assessment',
        '11.\u2003Summary: Market Fit Validation',
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles['TOCEntry']))
    story.append(PageBreak())

    # --- Section 1: Executive Summary ---
    story.append(Paragraph('1. Executive Summary', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph(
        'The market for AI agent trust infrastructure is moving faster than most observers anticipated. '
        'In the space of twelve months, Visa, Mastercard, Google, Salesforce, PayPal, and a cohort of '
        'identity-focused startups have all entered the agentic trust space with competing frameworks. '
        'This activity validates the problem Attestara is designed to solve \u2014 but critically, none of the '
        'existing approaches address the specific problem at the protocol\u2019s core: '
        '<b>cryptographically-enforced, privacy-preserving trust for adversarial cross-organisational '
        'agent negotiation</b>.',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'The competitive landscape splits clearly into two categories that collectively fail to cover the full '
        'problem space. Consumer and commerce-focused protocols (Visa TAP, Mastercard Agent Pay, PayPal ACP) '
        'solve identity and payment authorisation for B2C agent transactions. Enterprise interoperability protocols '
        '(Google A2A, Anthropic MCP, IBM ACP) solve agent-to-agent communication and capability discovery within '
        'cooperative multi-agent systems. Neither category addresses the B2B adversarial negotiation context \u2014 '
        'where two agents representing competing organisations must reach binding, enforceable, privacy-preserving '
        'agreements without requiring inter-party trust.',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'This is Attestara\u2019s market. It is uncontested, structurally necessary, and growing rapidly as agentic '
        'AI moves into procurement, supply chain, financial services, and legal contracting contexts.',
        styles['BodyText2']
    ))

    # --- Section 2: Market Context ---
    story.append(Paragraph('2. Market Context and Size', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph('2.1 The Agentic AI Market', styles['H2']))
    story.append(Paragraph(
        'The global AI agents market was valued at <b>$5.4 billion in 2024</b> and is projected to reach '
        '<b>$236 billion by 2034</b>, according to World Economic Forum analysis. Gartner projects that by 2026, '
        'over 40% of enterprise workflows will involve autonomous agents, with at least 15% of enterprise work '
        'decisions made autonomously by 2028.',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'The agentic commerce segment alone is projected by McKinsey to produce up to <b>$1 trillion</b> in '
        'orchestrated US retail revenue by 2030 and up to <b>$5 trillion globally</b> \u2014 figures cited by FIS '
        'in January 2026 when announcing its joint agentic commerce infrastructure with Visa and Mastercard.',
        styles['BodyText2']
    ))

    # Market sizing table
    market_data = [
        ['Segment', '2024', '2034 (Projected)', 'CAGR'],
        ['Global AI Agents', '$5.4B', '$236B', '45.8%'],
        ['Agentic Commerce', '\u2014', '$5T (2030)', '\u2014'],
        ['Enterprise AI Governance', 'Emerging', 'Fastest-growing compliance category', '\u2014'],
    ]
    avail = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN
    t = make_competitor_table(market_data, [avail*0.30, avail*0.15, avail*0.35, avail*0.20])
    story.append(t)
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph('2.2 The Identity and Trust Governance Gap', styles['H2']))
    story.append(Paragraph(
        'Despite this market scale, the governance infrastructure is nascent. According to HID Global\u2019s PKI '
        'Market Study, only <b>15% of organisations</b> have begun deploying digital certificates for AI agents. '
        'A SailPoint survey found that <b>80% of IT professionals</b> have observed AI agents acting unexpectedly '
        'or performing unauthorised actions. Only 14% of European organisations feel \u201cvery prepared\u201d to manage '
        'generative AI risks (ISACA, 2025).',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'The trust and governance gap is the primary barrier to broader agentic AI adoption. According to a survey '
        'of enterprise decision-makers, <b>81% say they would entrust AI with critical operations \u2014 provided '
        'trust frameworks are in place</b>.',
        styles['BodyText2']
    ))

    story.append(Paragraph('2.3 Regulatory Tailwind', styles['H2']))
    story.append(Paragraph(
        'The EU AI Act\u2019s Article 9 requirements for high-risk AI systems take effect from <b>August 2026</b>. '
        'DORA has been in force since January 2025. The UK Treasury Select Committee\u2019s January 2026 report '
        'explicitly called for AI-specific stress testing and mandatory designation of AI providers as critical '
        'third parties. Every major regulatory development in the AI governance space is pushing enterprises toward '
        'the kind of structured, auditable, accountable agent deployment that Attestara is designed to underpin.',
        styles['BodyText2']
    ))

    # --- Section 3: Competitive Landscape Overview ---
    story.append(PageBreak())
    story.append(Paragraph('3. Competitive Landscape Overview', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph(
        'The competitive landscape can be mapped across two axes: <b>scope</b> (consumer vs enterprise B2B) and '
        '<b>trust depth</b> (identity/authentication vs cryptographic commitment and privacy-preserving negotiation).',
        styles['BodyText2']
    ))

    # Positioning map as a styled table
    pos_data = [
        ['', 'Consumer Commerce', 'Enterprise B2B Negotiation'],
        ['HIGH Trust Depth\n(ZK / Cryptographic)', '', '\u2605 ATTESTARA\n(Target Position)'],
        ['LOW Trust Depth\n(Identity / Auth Only)',
         'Visa TAP\nMastercard Agent Pay\nTrulioo KYA',
         'Google A2A\nAnthropic MCP\nSalesforce Agent Cards\nStrata Maverics\nHID PKI'],
    ]
    avail = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN
    pos_t = Table(pos_data, colWidths=[avail*0.30, avail*0.35, avail*0.35])
    pos_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BACKGROUND', (0, 1), (0, -1), HexColor('#e8edf2')),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('LEADING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (2, 1), (2, 1), HexColor('#fff3e0')),
        ('TEXTCOLOR', (2, 1), (2, 1), HIGHLIGHT),
        ('FONTNAME', (2, 1), (2, 1), 'Helvetica-Bold'),
    ]))
    story.append(pos_t)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        'Attestara occupies the top-right quadrant \u2014 deep cryptographic trust infrastructure for enterprise '
        'B2B adversarial negotiation \u2014 which is currently <b>unoccupied by any production-deployed protocol</b>.',
        styles['BodyText2']
    ))

    # --- Section 4: Competitor Deep Dives ---
    story.append(PageBreak())
    story.append(Paragraph('4. Competitor Deep Dives', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    competitors = [
        {
            'name': '4.1 Google Agent2Agent Protocol (A2A)',
            'meta': [
                '<b>Category:</b> Enterprise interoperability protocol',
                '<b>Launch:</b> April 2025, donated to Linux Foundation June 2025',
                '<b>Governance:</b> Linux Foundation, 150+ partner organisations including AWS, Microsoft, Salesforce, SAP, Cisco, IBM',
                '<b>Status:</b> Production v0.3 \u2014 adopted by Adobe, S&amp;P Global, Tyson Foods, Gordon Food Service',
            ],
            'does': 'A2A standardises how AI agents discover each other, exchange information, and coordinate actions across organisational boundaries. Its core mechanism is the Agent Card \u2014 a JSON file advertising an agent\u2019s capabilities, skills, endpoints, and authentication requirements.',
            'doesnt': 'A2A explicitly does not address adversarial negotiation, binding commitment, or privacy-preserving authority proofs. Agent Cards are self-asserted \u2014 any agent can claim any capability without cryptographic verification. There is no settlement layer, no commitment record, and no mechanism for agents representing competing interests to reach binding agreements.',
            'relationship': 'A2A is the most likely communication substrate that Attestara sessions would operate over. This is a <b>partnership opportunity</b>, not a competition.',
            'threat': 'LOW',
            'threat_note': 'Different problem space; potential integration partner',
        },
        {
            'name': '4.2 Anthropic Model Context Protocol (MCP)',
            'meta': [
                '<b>Category:</b> Agent-to-tools connectivity protocol',
                '<b>Launch:</b> November 2024 (Anthropic), donated to AAIF under Linux Foundation December 2025',
                '<b>Governance:</b> AI Alliance Interoperability Foundation (AAIF)',
                '<b>Status:</b> Widely deployed as de facto standard for LLM-to-tool connectivity',
            ],
            'does': 'MCP solves the \u201cNxM problem\u201d for agent-tool connectivity \u2014 standardising how LLM-based agents connect to external data sources and tools. It is explicitly vertical (agent-to-tools) rather than horizontal (agent-to-agent).',
            'doesnt': 'MCP has no trust, negotiation, or commitment components. It connects agents to tools; it does not address how agents representing competing organisations should negotiate.',
            'relationship': 'MCP governs the tools an agent uses internally; Attestara governs the trust infrastructure when that agent interacts externally. Complementary, not competing.',
            'threat': 'NEGLIGIBLE',
            'threat_note': 'Different problem space entirely',
        },
        {
            'name': '4.3 Salesforce Agent Cards (Agentforce)',
            'meta': [
                '<b>Category:</b> Agent capability metadata / discovery',
                '<b>Launch:</b> 2024\u20132025 as part of Agentforce platform',
                '<b>Status:</b> Adopted as foundational concept by Google A2A',
            ],
            'does': 'Salesforce pioneered the Agent Card concept \u2014 a lightweight JSON contract communicating an agent\u2019s capabilities, identity, compliance tags, and Trust Score. Adopted by Google in the A2A specification.',
            'doesnt': 'Agent Cards are self-asserted metadata, not cryptographically verifiable. No mandate enforcement mechanism and no commitment records. Salesforce has identified the adversarial negotiation problem but Agent Cards do not solve it.',
            'relationship': 'Simultaneously a competitor (enterprise agent trust space) and a potential integration target. Attestara Authority Credentials could extend Agent Cards with cryptographic verifiability.',
            'threat': 'MEDIUM',
            'threat_note': 'Salesforce is aware of the problem and has resources; monitoring required',
        },
        {
            'name': '4.4 Visa Trusted Agent Protocol (TAP)',
            'meta': [
                '<b>Category:</b> Consumer agentic commerce identity and payment authorisation',
                '<b>Launch:</b> October 2025',
                '<b>Partners:</b> Microsoft, Nuvei, Shopify, Stripe, Worldpay, Akamai, Cloudflare',
                '<b>Status:</b> Live pilots; APAC and Europe pilots Q1 2026',
            ],
            'does': 'TAP enables merchants to distinguish legitimate AI agents from malicious bots and process agent-initiated purchases securely. It signals agent intent, recognises the consumer behind the agent, and transmits payment credentials.',
            'doesnt': 'TAP is explicitly a consumer commerce protocol. No mechanism for B2B adversarial negotiation, no ZK privacy layer, no mandate enforcement beyond payment authorisation, and no settlement infrastructure for complex multi-term agreements.',
            'relationship': 'Adjacent market; potential integration for the payment settlement components of Attestara\u2019s commitment layer.',
            'threat': 'LOW',
            'threat_note': 'Adjacent market; potential payment integration partner',
        },
        {
            'name': '4.5 Mastercard Agent Pay',
            'meta': [
                '<b>Category:</b> Consumer agentic payments / tokenisation',
                '<b>Launch:</b> April 2025',
                '<b>Partners:</b> Microsoft, Braintree, Checkout.com; FIS partnership January 2026',
                '<b>Status:</b> Pilot environments; FIS bank issuer integration live January 2026',
            ],
            'does': 'Mastercard Agent Pay introduces Agentic Tokens \u2014 an extension of existing tokenisation infrastructure binding payment credentials to specific agents for specific purposes.',
            'doesnt': 'Payment authorisation protocol, not negotiation trust. No ZK layer, no commitment settlement contract, and no mechanism for complex multi-term B2B agreements.',
            'relationship': 'Payment network focus; potential settlement layer integration partner.',
            'threat': 'LOW',
            'threat_note': 'Payment network focus',
        },
        {
            'name': '4.6 Vouched Agent Checkpoint / Know Your Agent (KYA)',
            'meta': [
                '<b>Category:</b> Agent identity verification and permissioning',
                '<b>Launch:</b> Agent Shield May 2025; Agent Checkpoint February 2026',
                '<b>Technology:</b> MCP-I (identity extension), Know That AI registry, Identiclaw permissions',
                '<b>Status:</b> Production deployment; Worldpay integration',
            ],
            'does': 'Full suite of agent identification and permissioning for website operators. KYA framework includes a public registry, limited-permission delegation, and identity standards built on MCP.',
            'doesnt': 'No ZK proof layer, no adversarial negotiation capability, no cross-organisational commitment settlement. Validates that an agent represents who it claims, but does not address authority verification or mandate privacy.',
            'relationship': 'Vouched solves identity verification; Attestara solves authority verification, negotiation integrity, and commitment binding. Adjacent but distinct. Potential data integration partner.',
            'threat': 'MEDIUM',
            'threat_note': 'Adjacent problem space; could expand into Attestara territory',
        },
        {
            'name': '4.7 Trulioo Digital Agent Passport (DAP) / KYA',
            'meta': [
                '<b>Category:</b> Agent identity and trust framework',
                '<b>Launch:</b> 2025 in collaboration with PayOS',
                '<b>Technology:</b> Digital Agent Passport \u2014 tamper-resistant identity token',
                '<b>Status:</b> Worldpay integration for agent checkout verification',
            ],
            'does': 'Creates a standardised identity token for AI agents, grounding agent identity in KYB verification of the organisation behind the agent. Creates accountability by tying agent actions to verified organisational identity.',
            'doesnt': 'Identity token, not a negotiation protocol. No mandate scope, ZK-backed authority proofs, adversarial negotiation dynamics, or smart contract commitment settlement. Trust model is centralised.',
            'relationship': 'Identity layer competitor; could integrate as KYB data source for Attestara\u2019s registration process.',
            'threat': 'LOW-MEDIUM',
            'threat_note': 'Identity layer competitor; potential KYB integration',
        },
        {
            'name': '4.8 Strata Maverics \u2014 Agentic Identity Platform',
            'meta': [
                '<b>Category:</b> Enterprise IAM for AI agents',
                '<b>Launch:</b> 2025',
                '<b>Technology:</b> OIDC, SPIFFE/SPIRE X.509, Zero Trust, ephemeral agent provisioning',
                '<b>Status:</b> Enterprise product, early adoption',
            ],
            'does': 'Applies Zero Trust identity principles to AI agents \u2014 treating agents as first-class identities with authentication, authorisation, and auditability. Provides just-in-time agent provisioning and runtime access control.',
            'doesnt': 'Governs agents\u2019 access to internal systems within an organisation. No cross-organisational trust, adversarial negotiation, ZK privacy proofs, or binding commitment. IAM-centric, not decentralised.',
            'relationship': 'Maverics is the internal governance layer; Attestara is the external negotiation trust layer. Complementary. Potential enterprise integration/partnership.',
            'threat': 'LOW',
            'threat_note': 'Different scope; potential partnership',
        },
        {
            'name': '4.9 HID Global PKI for AI Agents',
            'meta': [
                '<b>Category:</b> PKI certificate infrastructure extended to agents',
                '<b>Status:</b> Emerging proposal / early adoption; 15% of organisations beginning agent certificate deployment',
            ],
            'does': 'Extending certificate infrastructure to AI agents using established X.509 mechanisms. Proposed Agent Name Service (ANS, IETF draft) maps agent identities to verified capabilities, cryptographic keys, and endpoints.',
            'doesnt': 'Cannot express nuanced authority delegation in a machine-enforceable, privacy-preserving form. No ZK layer, no mandate scope encoding, no commitment settlement, and no adversarial negotiation support.',
            'relationship': 'PKI could underpin key management components. The ANS proposal aligns with Attestara\u2019s DID approach. Attestara extends well beyond PKI\u2019s capability.',
            'threat': 'LOW',
            'threat_note': 'Infrastructure layer; potential underpinning technology',
        },
        {
            'name': '4.10 Academic Research: DID + VC for AI Agents',
            'meta': [
                '<b>Key work:</b> Rodriguez Garzon et al. (2025), arXiv preprint \u201cAI Agents with Decentralised Identifiers and Verifiable Credentials\u201d',
            ],
            'does': 'Validated the DID + VC approach for AI agent identity, demonstrating technical feasibility of ledger-anchored agent DIDs with third-party-issued Verifiable Credentials.',
            'doesnt': 'Explicitly identifies limitations when \u201can agent\u2019s LLM is in sole charge to control security procedures\u201d \u2014 directly validating Attestara\u2019s architectural decision to separate identity/authority from negotiation behaviour.',
            'relationship': 'Attestara builds directly on this research and moves it from academic prototype to production protocol with ZK proof extension, smart contract commitment, and dual governance mode.',
            'threat': 'NEGLIGIBLE',
            'threat_note': 'NEGLIGIBLE as competitor; HIGH as validation of technical approach',
        },
    ]

    threat_colors = {
        'NEGLIGIBLE': '#28a745',
        'LOW': '#20c997',
        'LOW-MEDIUM': '#ffc107',
        'MEDIUM': '#fd7e14',
        'HIGH': '#dc3545',
    }

    for comp in competitors:
        story.append(KeepTogether([
            Paragraph(comp['name'], styles['H2']),
        ]))
        for m in comp['meta']:
            story.append(Paragraph(m, styles['CompetitorMeta']))
        story.append(Spacer(1, 2*mm))

        story.append(Paragraph('<b>What it does:</b>', styles['H3']))
        story.append(Paragraph(comp['does'], styles['BodyText2']))

        story.append(Paragraph('<b>What it doesn\u2019t do:</b>', styles['H3']))
        story.append(Paragraph(comp['doesnt'], styles['BodyText2']))

        story.append(Paragraph('<b>Relationship to Attestara:</b>', styles['H3']))
        story.append(Paragraph(comp['relationship'], styles['BodyText2']))

        tc = threat_colors.get(comp['threat'], '#666666')
        story.append(Paragraph(
            f'Threat level: <font color="{tc}"><b>{comp["threat"]}</b></font> \u2014 {comp["threat_note"]}',
            styles['ThreatLevel']
        ))
        story.append(HRFlowable(width='100%', thickness=0.5, color=TABLE_BORDER, spaceAfter=3*mm, spaceBefore=2*mm))

    # --- Section 5: Gap Analysis ---
    story.append(PageBreak())
    story.append(Paragraph('5. Competitive Gap Analysis', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph(
        'The following table maps each competitor against Attestara\u2019s core capability dimensions:',
        styles['BodyText2']
    ))

    # Use symbols
    Y = '\u2713'  # check
    N = '\u2717'  # x
    P = '\u25cb'  # partial circle

    gap_data = [
        ['Capability', 'Attestara', 'Google\nA2A', 'Visa\nTAP', 'MC\nAgent Pay', 'Vouched\nKYA', 'Trulioo\nDAP', 'Strata\nMaverics', 'SF Agent\nCards'],
        ['Agent Identity (DID)', Y+' Full', P+' Partial', P+' Partial', P+' Partial', Y+' Full', Y+' Full', Y+' Full', P+' Partial'],
        ['Authority Mandate', Y+' Full', N+' None', N+' None', P+' Pay only', N+' None', N+' None', P+' Access', P+' Self-asserted'],
        ['ZK Privacy Proofs', Y+' Full', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None'],
        ['Adversarial Negotiation', Y+' Full', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None'],
        ['Binding Commitment', Y+' On-chain', N+' None', P+' Pay only', P+' Pay only', N+' None', N+' None', N+' None', N+' None'],
        ['Cross-org B2B Trust', Y+' Full', Y+' Full', N+' B2C', N+' B2C', P+' Partial', P+' Partial', N+' Internal', P+' Partial'],
        ['Tamper-proof Audit', Y+' On-chain', N+' None', P+' Pay recs', P+' Pay recs', P+' Partial', P+' Partial', Y+' Full', N+' None'],
        ['DAO Governance', Y+' Full', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None', N+' None'],
        ['P2P Bilateral Mode', Y+' Full', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
        ['EU AI Act Alignment', Y+' Built-in', N+' None', N+' None', N+' None', P+' Partial', P+' Partial', P+' Partial', N+' None'],
        ['Regulatory Interface', Y+' Built-in', N+' None', P+' Fin regs', P+' Fin regs', N+' None', N+' None', N+' None', N+' None'],
        ['Open / Decentralised', Y+' Full', Y+' Full', N+' Visa', N+' MC', N+' Vouched', N+' Trulioo', N+' Strata', N+' SF'],
    ]

    avail = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN
    cw = [avail*0.16] + [avail*0.105]*8
    gap_table = Table(gap_data, colWidths=cw, repeatRows=1)

    gap_style = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 6.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 6),
        ('LEADING', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, TABLE_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        # Attestara column highlight
        ('BACKGROUND', (1, 1), (1, -1), HexColor('#e8f5e9')),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
    ]
    for i in range(1, len(gap_data)):
        if i % 2 == 0:
            gap_style.append(('BACKGROUND', (0, i), (0, i), TABLE_ALT_BG))
            gap_style.append(('BACKGROUND', (2, i), (-1, i), TABLE_ALT_BG))

    gap_table.setStyle(TableStyle(gap_style))
    story.append(gap_table)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        '<b>Key finding:</b> Attestara is the only protocol in the landscape that combines ZK privacy proofs, '
        'adversarial negotiation support, on-chain commitment settlement, and open decentralised governance. '
        'Every competitor addresses at most two of these four dimensions.',
        styles['BodyText2']
    ))

    # --- Section 6: Unique Differentiators ---
    story.append(PageBreak())
    story.append(Paragraph('6. Unique Differentiators', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    differentiators = [
        ('6.1 The Only ZK-Backed Authority Protocol',
         'Every competitor relies on self-asserted or traditionally-signed authority claims. Attestara is the '
         'only proposed protocol where authority claims are backed by ZK proofs \u2014 meaning a counterparty can '
         'verify the claim is true without the agent revealing its full negotiating mandate. This is not an '
         'incremental improvement; it is a fundamentally different trust model that enables a new class of '
         'interactions between genuinely competing organisations.'),
        ('6.2 Adversarial Negotiation Context',
         'The entire competitive landscape is built on a cooperative assumption: agents are working toward a '
         'shared goal. The echoing behaviour problem identified by Salesforce\u2019s own research is a direct '
         'consequence of this assumption. Attestara is designed specifically for the adversarial context \u2014 '
         'where agents represent competing interests, where strategic information asymmetry has value, and where '
         'the outcome of negotiation materially affects both parties. No other protocol addresses this context.'),
        ('6.3 Binding Commitment Architecture',
         'Neither payment authorisation records (Visa/Mastercard) nor task completion records (Google A2A) '
         'produce a binding, tamper-proof, cryptographically-verifiable record of the negotiation process. '
         'Attestara\u2019s on-chain Commitment Contract creates this record. In B2B contracts, financial agreements, '
         'and regulated transactions, this is the difference between a conversation and a legal commitment.'),
        ('6.4 Dual Governance Architecture',
         'The market is split between proprietary, centralised protocols and open protocols with single governance '
         'structures. Attestara\u2019s P2P bilateral mode allows enterprises to deploy full cryptographic trust '
         'infrastructure without joining any external registry \u2014 meeting the needs of regulated financial '
         'institutions. The DAO mode serves open ecosystems. No competitor offers both.'),
        ('6.5 Regulatory-First Architecture',
         'Attestara incorporates EU AI Act Article 9, DORA, and Senior Managers regime requirements from the '
         'ground up. Every session produces Article 9-compliant documentation. Every commitment record is an '
         'Article 12-compliant audit log. Every escalation mechanism is an Article 14 human oversight implementation.'),
    ]

    for title, body in differentiators:
        story.append(Paragraph(title, styles['H2']))
        story.append(Paragraph(body, styles['BodyText2']))

    # --- Section 7: Market Opportunity Segmentation ---
    story.append(PageBreak())
    story.append(Paragraph('7. Market Opportunity Segmentation', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph('7.1 Primary Target: Enterprise B2B Adversarial Negotiation', styles['H2']))
    story.append(Paragraph(
        'This is Attestara\u2019s differentiated, uncontested market:',
        styles['BodyText2']
    ))

    segments = [
        ('<b>Procurement and Supply Chain</b> \u2014 Large enterprises deploying procurement agents to negotiate '
         'with supplier agents. Current pilot deployments (Tyson Foods / Gordon Food Service using A2A) demonstrate '
         'the infrastructure layer is already being built \u2014 but without trust, authority enforcement, or binding '
         'commitment. Attestara fills this gap.'),
        ('<b>Financial Services Contracting</b> \u2014 Investment banking mandates, credit facility negotiations, '
         'derivatives term sheets, repo agreements. The ISDA master agreement model maps cleanly onto Attestara\u2019s '
         'negotiation rail architecture.'),
        ('<b>Legal Services and Contract Negotiation</b> \u2014 M&amp;A due diligence, commercial contract negotiation, '
         'employment terms. High-value contexts where accountability and audit trail are as important as the outcome.'),
        ('<b>Insurance and Reinsurance</b> \u2014 Policy term negotiation between insurer agents and broker/reinsurer '
         'agents \u2014 a segment currently reliant on manual Lloyd\u2019s-style processes explicitly targeted for AI automation.'),
    ]
    for seg in segments:
        story.append(Paragraph(seg, styles['BulletItem'], bulletText='\u2022'))

    story.append(Paragraph('7.2 Secondary: Open Agentic Commerce Infrastructure', styles['H2']))
    story.append(Paragraph(
        'As agentic commerce scales toward complex B2B commerce \u2014 multi-vendor contracts, subscription '
        'services, complex pricing arrangements \u2014 the need for Attestara\u2019s deeper trust infrastructure '
        'will emerge. This is a 3\u20135 year horizon opportunity.',
        styles['BodyText2']
    ))

    story.append(Paragraph('7.3 Tertiary: Regulatory Compliance Infrastructure', styles['H2']))
    story.append(Paragraph(
        'EU AI Act Article 9 requires documented, ongoing risk management systems for high-risk agentic AI. '
        'Attestara\u2019s credential and audit infrastructure can be positioned as compliance infrastructure \u2014 '
        'creating a natural integration with Littledata\u2019s AI governance platform and opening a '
        'regulatory-driven sales motion.',
        styles['BodyText2']
    ))

    # --- Section 8: Threat Assessment ---
    story.append(PageBreak())
    story.append(Paragraph('8. Threat Assessment', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    threats = [
        ('8.1 Google A2A Expansion', 'MEDIUM',
         'Google extends A2A to include authority enforcement and ZK-backed credentials.',
         '<b>Probability:</b> Medium-term (2\u20133 years). Google\u2019s explicit design principle of \u201copaque agents\u201d '
         'cuts against the transparency required for ZK proof verification. Structural inertia makes rapid expansion unlikely.',
         '<b>Mitigation:</b> Establish Attestara as the authoritative ZK negotiation layer before A2A reaches this problem space. '
         'Pursue A2A integration as a complement to forestall competition narrative.'),
        ('8.2 Salesforce Deep Protocol Development', 'MEDIUM',
         'Salesforce builds a proprietary deep trust protocol extending Agent Cards with ZK proofs and commitment settlement.',
         '<b>Probability:</b> Medium. Salesforce has the research capability and enterprise distribution. However, a proprietary '
         'solution would be locked to Agentforce \u2014 creating an opening for an open, interoperable alternative.',
         '<b>Mitigation:</b> Position explicitly as the open, ecosystem-agnostic alternative. Engage Salesforce early on potential '
         'integration/licensing.'),
        ('8.3 Payment Network Expansion into B2B', 'LOW-MEDIUM',
         'Visa or Mastercard expand agentic infrastructure from consumer checkout into B2B negotiation and contracting.',
         '<b>Probability:</b> Low-medium near term. Both networks are focused on consumer agentic commerce in 2026. B2B negotiation '
         'requires fundamentally different architecture from payment authorisation.',
         '<b>Mitigation:</b> Attestara\u2019s open architecture and regulatory compliance positioning create structural advantages '
         'that a proprietary payment-network solution cannot easily replicate.'),
        ('8.4 Emerging Blockchain-Native Competitors', 'HIGH',
         'Web3-native projects build ZK-based agent trust protocols on existing blockchain infrastructure.',
         '<b>Probability:</b> High \u2014 the most likely near-term competitive threat. Projects in the ZK space '
         '(StarkWare, Aztec, Polygon) have the technical capability.',
         '<b>Mitigation:</b> Attestara\u2019s chain-agnostic design, enterprise regulatory alignment, and dual DAO/P2P '
         'governance model are deliberate differentiators. Enterprise compliance positioning (EU AI Act, DORA) is '
         'difficult for Web3-native projects to replicate credibly.'),
    ]

    for title, level, scenario, prob, mitigation in threats:
        tc = threat_colors.get(level, '#666666')
        story.append(Paragraph(title, styles['H2']))
        story.append(Paragraph(f'<b>Scenario:</b> {scenario}', styles['BodyText2']))
        story.append(Paragraph(prob, styles['BodyText2']))
        story.append(Paragraph(mitigation, styles['BodyText2']))
        story.append(Paragraph(
            f'Threat level: <font color="{tc}"><b>{level}</b></font>',
            styles['ThreatLevel']
        ))
        story.append(HRFlowable(width='100%', thickness=0.5, color=TABLE_BORDER, spaceAfter=2*mm))

    # --- Section 9: Strategic Recommendations ---
    story.append(PageBreak())
    story.append(Paragraph('9. Strategic Positioning Recommendations', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    recommendations = [
        ('9.1 Lead with the Problem, Not the Technology',
         'The ZK proof and blockchain components are engineering decisions, not the product story. The product story is: '
         '<i>AI agents are making binding commitments your organisation will be legally and regulatorily accountable for, '
         'without any infrastructure to verify they had authority to do so.</i> That resonates with CISOs, CLOs, and '
         'compliance leaders. The cryptographic mechanism is the credibility behind the solution.'),
        ('9.2 Pursue A2A Integration Explicitly',
         'The Google A2A ecosystem (150 organisations, Linux Foundation governance) is the most likely deployment substrate. '
         'Positioning Attestara as the trust layer that A2A-based systems need dramatically expands the addressable market '
         'and removes a potential competitive conflict with the most well-resourced adjacent actor.'),
        ('9.3 Target Regulated Industries First',
         'Financial services (DORA, SMCR, EU AI Act), insurance, legal, and procurement in regulated sectors have both '
         'the highest need for Attestara\u2019s capabilities and the most immediate regulatory driver. These are the beachhead markets.'),
        ('9.4 Engage Standards Bodies Early',
         'Contributing Attestara\u2019s credential schema, ZK circuit specifications, and governance architecture to W3C, '
         'IETF, and the AAIF establishes legitimacy and positions Attestara as the reference implementation. This is the '
         'same strategy Google used with A2A \u2014 donate to a neutral body, become the default implementation.'),
        ('9.5 Littledata Integration as Go-To-Market Channel',
         'Littledata\u2019s EU AI Act compliance platform creates a natural cross-sell. An enterprise completing its Article 9 '
         'risk assessment for a procurement agent deployment needs exactly the governance infrastructure Attestara provides. '
         'The compliance buyer and the Attestara buyer are frequently the same person.'),
    ]

    for title, body in recommendations:
        story.append(Paragraph(title, styles['H2']))
        story.append(Paragraph(body, styles['BodyText2']))

    # --- Section 10: Market Timing ---
    story.append(PageBreak())
    story.append(Paragraph('10. Market Timing Assessment', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph('<b>Why now is right:</b>', styles['H3']))
    timing_now = [
        'The problem is newly recognised (Salesforce stress-testing Q1 2026; UK Treasury Committee January 2026; Fortune article March 2026)',
        'Adjacent infrastructure (A2A, MCP, Visa TAP) is being built but the trust gap is explicitly acknowledged',
        'Regulatory deadlines (EU AI Act August 2026, DORA in force) create urgency',
        'No production competitor is in the ZK adversarial negotiation space',
    ]
    for item in timing_now:
        story.append(Paragraph(item, styles['BulletItem'], bulletText='\u2022'))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('<b>Why waiting is dangerous:</b>', styles['H3']))
    timing_risk = [
        'Google\u2019s A2A ecosystem is growing at speed \u2014 50 partners at launch (April 2025) to 150+ by July 2025; the window is measured in months, not years',
        'Salesforce has explicitly identified the problem; their next product cycle could include a response',
        'First-mover advantage in protocol standards is decisive \u2014 the protocol adopted first becomes the standard (MCP as immediate precedent)',
    ]
    for item in timing_risk:
        story.append(Paragraph(item, styles['BulletItem'], bulletText='\u2022'))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        '<b>Verdict:</b> The market timing is optimal. The problem is validated, the infrastructure layer is being built, '
        'the regulatory driver is live, and the specific problem Attestara solves is uncontested. The eighteen-month window '
        'before major platforms potentially close the gap represents the critical opportunity period for Attestara\u2019s '
        'establishment as the default standard.',
        styles['BodyText2']
    ))

    # --- Section 11: Summary ---
    story.append(PageBreak())
    story.append(Paragraph('11. Summary: Market Fit Validation', styles['H1']))
    story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4*mm))

    story.append(Paragraph(
        'Attestara addresses a real, growing, and currently unserved problem. The competitive analysis validates '
        'market fit across five dimensions:',
        styles['BodyText2']
    ))

    validations = [
        ('<b>1. Problem Validation:</b> Multiple well-resourced actors (Salesforce, Visa, Mastercard, Google, the UK Parliament) '
         'have independently identified the agentic trust problem. None have solved the adversarial cross-organisational negotiation '
         'problem Attestara targets.'),
        ('<b>2. Competitive White Space:</b> The ZK-backed adversarial negotiation and binding commitment segment is genuinely '
         'unoccupied. No production protocol provides ZK mandate proofs, adversarial negotiation rails, and on-chain commitment '
         'settlement in a single architecture.'),
        ('<b>3. Market Scale:</b> $236 billion AI agents market by 2034; $5 trillion in global agentic commerce by 2030; and a '
         'B2B negotiation segment orders of magnitude larger by transaction value.'),
        ('<b>4. Regulatory Tailwind:</b> Every major AI governance regulatory development creates structural demand for exactly '
         'the kind of auditable, accountable, authority-bounded agent infrastructure Attestara provides.'),
        ('<b>5. Timing:</b> The market is in the window between problem recognition and competitive response. The infrastructure '
         'layer is being standardised; the trust layer is the next frontier, and that frontier is currently empty.'),
    ]
    for v in validations:
        story.append(Paragraph(v, styles['BulletItem'], bulletText='\u2022'))

    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(
        '<b>The risk is not that the market doesn\u2019t exist. The risk is speed of execution.</b>',
        styles['BodyText2']
    ))

    # Sources
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=TABLE_BORDER, spaceAfter=3*mm))
    story.append(Paragraph(
        '<b>Sources:</b> World Economic Forum AI Agents Market Analysis, 2026; Gartner Top Strategic Technology '
        'Trends 2025; ISACA European Cybersecurity Research 2025; HID Global PKI Market Study 2025; Visa Investor '
        'Relations / Trusted Agent Protocol announcements 2025\u20132026; Mastercard Agent Pay launch documentation 2025; '
        'Google Agent2Agent Protocol specification and Linux Foundation governance documentation 2025; FIS Agentic '
        'Commerce announcement January 2026; McKinsey Agentic Commerce projections; UK Treasury Select Committee AI '
        'in Financial Services Report January 2026; Vouched Agent Checkpoint announcement February 2026; Trulioo '
        'Digital Agent Passport / KYA research 2025; Strata Maverics Agentic Identity documentation 2025\u20132026; '
        'Rodriguez Garzon et al., \u201cAI Agents with Decentralised Identifiers and Verifiable Credentials\u201d, '
        'arXiv 2511.02841, 2025; Savarese S., Niles S., \u201cThe 19th Century Banking Problem that AI Hasn\u2019t '
        'Solved Yet\u201d, Fortune, March 2026.',
        styles['Sources']
    ))

    return story


def main():
    doc = BaseDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title='Attestara \u2014 Competitive Analysis',
        author='littledata',
        subject='Market Fit Validation and Strategic Opportunity Assessment',
        creator='littledata',
    )

    # Cover page frame (full page)
    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id='cover',
                       leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    cover_template = PageTemplate(id='cover', frames=[cover_frame], onPage=draw_cover_page)

    # Content frame
    content_frame = Frame(
        LEFT_MARGIN, BOTTOM_MARGIN,
        PAGE_W - LEFT_MARGIN - RIGHT_MARGIN,
        PAGE_H - TOP_MARGIN - BOTTOM_MARGIN,
        id='content'
    )
    content_template = PageTemplate(id='content', frames=[content_frame],
                                    onPage=header_footer)

    doc.addPageTemplates([cover_template, content_template])

    story = build_document()

    # Insert template switch after cover page
    from reportlab.platypus import NextPageTemplate
    story.insert(1, NextPageTemplate('content'))

    doc.build(story)
    print(f'PDF generated: {OUTPUT_PATH}')
    print(f'Pages: {doc.page}')


if __name__ == '__main__':
    main()
