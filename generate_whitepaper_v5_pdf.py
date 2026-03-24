#!/usr/bin/env python3
"""Generate professional PDF from Attestara Whitepaper v5 markdown.
Matches the styling of the competitive analysis PDF generator (littledata branding).
"""

import os
import re
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable, Flowable, Preformatted, NextPageTemplate,
    XPreformatted,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame

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
CODE_BG = HexColor('#f4f4f4')
CODE_BORDER = HexColor('#e0e0e0')

LOGO_PATH = os.path.join('C:', os.sep, 'claude', 'littledata-mvp', 'docs', 'littledata.png')
MD_PATH = os.path.join('C:', os.sep, 'claude', 'attestara', 'Attestara_Whitepaper_v5.md')
OUTPUT_PATH = os.path.join('C:', os.sep, 'claude', 'attestara', 'Attestara_Whitepaper_v5.pdf')

PAGE_W, PAGE_H = A4
LEFT_MARGIN = 2.0 * cm
RIGHT_MARGIN = 2.0 * cm
TOP_MARGIN = 2.5 * cm
BOTTOM_MARGIN = 2.5 * cm
AVAIL_WIDTH = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN


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
    c.rect(0, PAGE_H - 8 * mm, PAGE_W, 8 * mm, fill=1, stroke=0)

    # Logo with white background pad
    if os.path.exists(LOGO_PATH):
        logo_w, logo_h = 80, 24
        logo_x = LEFT_MARGIN
        logo_y = PAGE_H - 45 * mm
        pad = 6

        c.setFillColor(white)
        c.roundRect(logo_x - pad, logo_y - pad,
                    logo_w + 2 * pad, logo_h + 2 * pad,
                    4, fill=1, stroke=0)

        c.drawImage(LOGO_PATH, logo_x, logo_y, width=logo_w, height=logo_h,
                    preserveAspectRatio=True, mask='auto')

    # Title block
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 36)
    c.drawString(LEFT_MARGIN, PAGE_H - 100 * mm, 'Attestara')

    c.setFont('Helvetica', 14)
    c.drawString(LEFT_MARGIN, PAGE_H - 115 * mm,
                 'Cryptographic Trust Protocol for Autonomous AI Agents')

    # Accent line
    c.setStrokeColor(HIGHLIGHT)
    c.setLineWidth(3)
    c.line(LEFT_MARGIN, PAGE_H - 125 * mm, LEFT_MARGIN + 80 * mm, PAGE_H - 125 * mm)

    # Subtitle
    c.setFont('Helvetica-Bold', 20)
    c.setFillColor(white)
    c.drawString(LEFT_MARGIN, PAGE_H - 145 * mm, 'WHITEPAPER v5.0')

    c.setFont('Helvetica', 13)
    c.drawString(LEFT_MARGIN, PAGE_H - 160 * mm,
                 'A Cryptographic Trust Protocol for Autonomous AI Agent Commerce')

    # Metadata block
    y = PAGE_H - 200 * mm
    c.setFont('Helvetica', 10)
    c.setFillColor(HexColor('#aaaaaa'))
    meta = [
        ('Version:', '5.0'),
        ('Date:', 'March 2026'),
        ('Authors:', 'Littledata Research & Engineering'),
        ('Classification:', 'Confidential \u2014 Internal & Selected External Stakeholders'),
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


# --- Header / Footer ---
def header_footer(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(HIGHLIGHT)
    canvas.setLineWidth(1.5)
    canvas.line(LEFT_MARGIN, PAGE_H - 18 * mm, PAGE_W - RIGHT_MARGIN, PAGE_H - 18 * mm)

    # Header text
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(LEFT_MARGIN, PAGE_H - 16 * mm, 'Attestara \u2014 Whitepaper v5.0')
    canvas.drawRightString(PAGE_W - RIGHT_MARGIN, PAGE_H - 16 * mm, 'CONFIDENTIAL')

    # Footer
    canvas.setStrokeColor(TABLE_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_MARGIN, 18 * mm, PAGE_W - RIGHT_MARGIN, 18 * mm)

    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(LEFT_MARGIN, 12 * mm, '\u00a9 2026 littledata')
    canvas.drawCentredString(PAGE_W / 2, 12 * mm, f'Page {doc.page}')

    # Logo in footer
    if os.path.exists(LOGO_PATH):
        canvas.drawImage(LOGO_PATH, PAGE_W - RIGHT_MARGIN - 50, 10 * mm,
                         width=50, height=15, preserveAspectRatio=True, mask='auto')

    canvas.restoreState()


# --- Code Block Flowable ---
class CodeBlock(Flowable):
    """Renders a code block with grey background and monospace font."""

    def __init__(self, code, language='', max_width=None):
        super().__init__()
        self.code = code
        self.language = language
        self.max_width = max_width or AVAIL_WIDTH
        self.font_name = 'Courier'
        self.font_size = 6.5
        self.leading = 8.5
        self.padding = 8
        self._lines = self.code.split('\n')
        # Calculate dimensions
        self.width = self.max_width
        self.height = len(self._lines) * self.leading + 2 * self.padding

    def wrap(self, availWidth, availHeight):
        self.width = min(self.max_width, availWidth)
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        # Background
        c.setFillColor(CODE_BG)
        c.setStrokeColor(CODE_BORDER)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=1)

        # Language label
        if self.language:
            c.setFont('Helvetica-Bold', 6)
            c.setFillColor(MID_GREY)
            c.drawString(self.padding, self.height - self.padding + 1, self.language)

        # Code text
        c.setFont(self.font_name, self.font_size)
        c.setFillColor(DARK_GREY)
        y = self.height - self.padding - self.font_size
        for line in self._lines:
            # Truncate long lines
            max_chars = int(self.width / (self.font_size * 0.5))
            if len(line) > max_chars:
                line = line[:max_chars - 3] + '...'
            c.drawString(self.padding, y, line)
            y -= self.leading


# --- Styles ---
def create_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'DocTitle', parent=styles['Title'],
        fontSize=22, leading=28, textColor=NAVY,
        spaceAfter=6 * mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'H1', parent=styles['Heading1'],
        fontSize=18, leading=24, textColor=NAVY,
        spaceBefore=10 * mm, spaceAfter=5 * mm, fontName='Helvetica-Bold',
        borderWidth=0, borderPadding=0,
    ))
    styles.add(ParagraphStyle(
        'H2', parent=styles['Heading2'],
        fontSize=14, leading=18, textColor=ACCENT_BLUE,
        spaceBefore=7 * mm, spaceAfter=3 * mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'H3', parent=styles['Heading3'],
        fontSize=11, leading=15, textColor=DARK_BLUE,
        spaceBefore=4 * mm, spaceAfter=2 * mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'H4', parent=styles['Heading3'],
        fontSize=10, leading=13, textColor=DARK_BLUE,
        spaceBefore=3 * mm, spaceAfter=2 * mm, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'BodyText2', parent=styles['BodyText'],
        fontSize=10, leading=14.5, textColor=DARK_GREY,
        alignment=TA_JUSTIFY, spaceAfter=3 * mm, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'Quote', parent=styles['BodyText'],
        fontSize=10, leading=14, textColor=ACCENT_BLUE,
        leftIndent=15 * mm, rightIndent=10 * mm, spaceBefore=3 * mm, spaceAfter=3 * mm,
        fontName='Helvetica-Oblique', borderWidth=0,
        borderColor=HIGHLIGHT, borderPadding=5,
    ))
    styles.add(ParagraphStyle(
        'BulletItem', parent=styles['BodyText'],
        fontSize=10, leading=14.5, textColor=DARK_GREY,
        leftIndent=12 * mm, bulletIndent=6 * mm, spaceAfter=2 * mm,
        fontName='Helvetica', alignment=TA_LEFT,
        bulletFontName='Helvetica', bulletFontSize=10,
    ))
    styles.add(ParagraphStyle(
        'NumberedItem', parent=styles['BodyText'],
        fontSize=10, leading=14.5, textColor=DARK_GREY,
        leftIndent=12 * mm, bulletIndent=4 * mm, spaceAfter=2 * mm,
        fontName='Helvetica', alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        'TOCEntry', parent=styles['BodyText'],
        fontSize=11, leading=18, textColor=DARK_GREY,
        leftIndent=8 * mm, fontName='Helvetica', spaceAfter=1 * mm,
    ))
    styles.add(ParagraphStyle(
        'TOCTitle', parent=styles['Heading1'],
        fontSize=18, leading=24, textColor=NAVY,
        spaceBefore=5 * mm, spaceAfter=8 * mm, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=8, textColor=MID_GREY, fontName='Helvetica',
    ))
    styles.add(ParagraphStyle(
        'CodeInline', parent=styles['BodyText'],
        fontSize=8.5, leading=11, textColor=DARK_GREY,
        fontName='Courier', backColor=CODE_BG,
    ))
    styles.add(ParagraphStyle(
        'Footnote', parent=styles['BodyText'],
        fontSize=8, leading=10, textColor=MID_GREY,
        fontName='Helvetica', spaceAfter=1.5 * mm,
    ))
    return styles


# --- Table builder ---
def make_table(data, col_widths=None):
    """Create a styled table matching the competitive analysis style."""
    if not data or not data[0]:
        return Spacer(1, 1)

    if col_widths is None:
        n_cols = len(data[0])
        col_widths = [AVAIL_WIDTH / n_cols] * n_cols

    # Wrap cell content in Paragraph for word wrapping
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontSize=7.5, leading=9, textColor=white,
        fontName='Helvetica-Bold', alignment=TA_LEFT,
    )
    cell_style = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontSize=7, leading=9, textColor=DARK_GREY,
        fontName='Helvetica', alignment=TA_LEFT,
    )

    wrapped_data = []
    for row_idx, row in enumerate(data):
        wrapped_row = []
        for cell in row:
            style = header_style if row_idx == 0 else cell_style
            # Apply inline formatting
            cell_text = _inline_format(str(cell))
            wrapped_row.append(Paragraph(cell_text, style))
        wrapped_data.append(wrapped_row)

    t = Table(wrapped_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('LEADING', (0, 0), (-1, -1), 9),
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


# --- Inline Markdown Formatting ---
def _inline_format(text):
    """Convert inline markdown to ReportLab XML tags."""
    # Escape XML entities first (but preserve already-converted tags)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')

    # Bold: **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic: *text* (but not inside bold)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
    # Inline code: `text`
    text = re.sub(r'`([^`]+)`', r'<font face="Courier" size="8">\1</font>', text)
    # Links: [text](url) -> show text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Em dash
    text = text.replace(' --- ', ' \u2014 ')
    text = text.replace('---', '\u2014')

    return text


def _inline_format_preserve_entities(text):
    """Convert inline markdown, preserving existing XML entities and handling special chars."""
    # Handle & that aren't already &amp; etc.
    # First protect existing entities
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', text)
    text = text.replace('<', '&lt;').replace('>', '&gt;')

    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<font face="Courier" size="8">\1</font>', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Em dash
    text = text.replace(' --- ', ' \u2014 ')

    return text


# --- Markdown Parser ---
def parse_markdown(md_path):
    """Parse the markdown file and return a list of (type, content) tuples."""
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    elements = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i].rstrip('\n')

        # Skip the title block (first few lines before first ---)
        # We handle this via the cover page

        # Horizontal rule
        if line.strip() == '---':
            elements.append(('hr', ''))
            i += 1
            continue

        # Code block
        if line.strip().startswith('```'):
            lang = line.strip()[3:].strip()
            code_lines = []
            i += 1
            while i < n and not lines[i].rstrip('\n').strip().startswith('```'):
                code_lines.append(lines[i].rstrip('\n'))
                i += 1
            i += 1  # skip closing ```
            elements.append(('code', (lang, '\n'.join(code_lines))))
            continue

        # Headings
        if line.startswith('#### '):
            elements.append(('h4', line[5:].strip()))
            i += 1
            continue
        if line.startswith('### '):
            elements.append(('h3', line[4:].strip()))
            i += 1
            continue
        if line.startswith('## '):
            elements.append(('h2', line[3:].strip()))
            i += 1
            continue
        if line.startswith('# '):
            elements.append(('h1', line[2:].strip()))
            i += 1
            continue

        # Blockquote
        if line.startswith('> '):
            quote_lines = [line[2:]]
            i += 1
            while i < n and lines[i].rstrip('\n').startswith('> '):
                quote_lines.append(lines[i].rstrip('\n')[2:])
                i += 1
            elements.append(('blockquote', ' '.join(quote_lines)))
            continue

        # Table
        if '|' in line and line.strip().startswith('|'):
            table_lines = []
            while i < n and '|' in lines[i] and lines[i].strip().startswith('|'):
                row_line = lines[i].rstrip('\n').strip()
                # Skip separator rows (|---|---|)
                if re.match(r'^\|[\s\-:|]+\|$', row_line):
                    i += 1
                    continue
                # Parse cells
                cells = [c.strip() for c in row_line.split('|')[1:-1]]
                table_lines.append(cells)
                i += 1
            if table_lines:
                elements.append(('table', table_lines))
            continue

        # Numbered list
        if re.match(r'^\d+\.\s', line.strip()):
            items = []
            while i < n:
                m = re.match(r'^(\d+)\.\s+(.*)', lines[i].rstrip('\n').strip())
                if m:
                    items.append((m.group(1), m.group(2)))
                    i += 1
                else:
                    break
            elements.append(('numbered_list', items))
            continue

        # Bullet list
        if line.strip().startswith('- '):
            items = []
            while i < n and lines[i].rstrip('\n').strip().startswith('- '):
                items.append(lines[i].rstrip('\n').strip()[2:])
                i += 1
            elements.append(('bullet_list', items))
            continue

        # Footnote (lines starting with \*)
        if line.strip().startswith('\\*'):
            elements.append(('footnote', line.strip()[2:].strip()))
            i += 1
            continue

        # Empty line
        if not line.strip():
            i += 1
            continue

        # Regular paragraph (collect consecutive non-empty lines)
        para_lines = [line]
        i += 1
        while i < n:
            next_line = lines[i].rstrip('\n')
            if (not next_line.strip() or
                    next_line.startswith('#') or
                    next_line.startswith('```') or
                    next_line.startswith('> ') or
                    next_line.strip().startswith('|') or
                    next_line.strip().startswith('- ') or
                    next_line.strip() == '---' or
                    re.match(r'^\d+\.\s', next_line.strip())):
                break
            para_lines.append(next_line)
            i += 1
        elements.append(('paragraph', ' '.join(para_lines)))

    return elements


# --- Build Document ---
def build_document():
    styles = create_styles()
    story = []

    # Cover page — content drawn by onPage callback; just need a spacer + page break
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # Parse markdown
    elements = parse_markdown(MD_PATH)

    # Table of Contents
    story.append(Paragraph('Table of Contents', styles['TOCTitle']))
    toc_items = [
        'Abstract',
        'Acknowledgements',
        'Executive Summary',
        '1.\u2003Introduction',
        '2.\u2003The Governance Gap in Agentic Commerce',
        '3.\u2003Protocol Design',
        '4.\u2003Zero-Knowledge Proof Architecture',
        '5.\u2003Identity, Credential, and DIF Protocol Framework',
        '6.\u2003On-Chain Commitment Settlement',
        '7.\u2003Session Protocol',
        '8.\u2003Threat Model',
        '9.\u2003Performance and Cost Analysis',
        '10.\u2003Regulatory Alignment',
        '11.\u2003Competitive Analysis',
        '12.\u2003Governance and Standards Engagement',
        '13.\u2003Implementation Architecture',
        '14.\u2003Use Cases',
        '15.\u2003Roadmap',
        '16.\u2003Conclusion',
        '17.\u2003References',
        'Appendix A.\u2003Conformance, Security, and Privacy Considerations',
        'Appendix B.\u2003Test Vector: Complete Negotiation Turn',
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles['TOCEntry']))
    story.append(PageBreak())

    # Track whether we just had a heading (for HR after headings)
    section_count = 0

    for elem_type, content in elements:
        if elem_type == 'h1':
            # Skip the document title (first h1 is the title, rendered on cover)
            if content.startswith('Attestara: A Cryptographic'):
                continue
            # Skip Table of Contents heading (we built our own)
            if content == 'Table of Contents':
                continue
            story.append(Paragraph(_inline_format_preserve_entities(content), styles['DocTitle']))
            continue

        if elem_type == 'h2':
            # Main sections get H1 styling with HR
            # Check if this is a numbered section or appendix
            if (re.match(r'^\d+\.', content) or content.startswith('Appendix')
                    or content in ('Abstract', 'Acknowledgements', 'Executive Summary',
                                   'Table of Contents')):
                # Skip TOC heading
                if content == 'Table of Contents':
                    continue
                section_count += 1
                # Page break before major sections (but not the very first)
                if section_count > 1:
                    story.append(PageBreak())
                story.append(Paragraph(_inline_format_preserve_entities(content), styles['H1']))
                story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4 * mm))
            else:
                story.append(Paragraph(_inline_format_preserve_entities(content), styles['H1']))
                story.append(HRFlowable(width='100%', thickness=1, color=HIGHLIGHT, spaceAfter=4 * mm))
            continue

        if elem_type == 'h3':
            story.append(Paragraph(_inline_format_preserve_entities(content), styles['H2']))
            continue

        if elem_type == 'h4':
            story.append(Paragraph(_inline_format_preserve_entities(content), styles['H3']))
            continue

        if elem_type == 'paragraph':
            formatted = _inline_format_preserve_entities(content)
            story.append(Paragraph(formatted, styles['BodyText2']))
            continue

        if elem_type == 'blockquote':
            formatted = _inline_format_preserve_entities(content)
            story.append(Paragraph(formatted, styles['Quote']))
            continue

        if elem_type == 'bullet_list':
            for item in content:
                formatted = _inline_format_preserve_entities(item)
                story.append(Paragraph(formatted, styles['BulletItem'], bulletText='\u2022'))
            continue

        if elem_type == 'numbered_list':
            for num, item in content:
                formatted = _inline_format_preserve_entities(item)
                story.append(Paragraph(formatted, styles['NumberedItem'],
                                       bulletText=f'{num}.'))
            continue

        if elem_type == 'code':
            lang, code_text = content
            if code_text.strip():
                cb = CodeBlock(code_text, language=lang)
                story.append(Spacer(1, 2 * mm))
                story.append(cb)
                story.append(Spacer(1, 3 * mm))
            continue

        if elem_type == 'table':
            table_data = content
            if table_data:
                n_cols = len(table_data[0])
                # Calculate column widths based on content
                if n_cols <= 2:
                    col_widths = [AVAIL_WIDTH * 0.4, AVAIL_WIDTH * 0.6][:n_cols]
                elif n_cols == 3:
                    col_widths = [AVAIL_WIDTH * 0.35, AVAIL_WIDTH * 0.35, AVAIL_WIDTH * 0.30]
                elif n_cols == 4:
                    col_widths = [AVAIL_WIDTH * 0.30, AVAIL_WIDTH * 0.23, AVAIL_WIDTH * 0.23, AVAIL_WIDTH * 0.24]
                elif n_cols == 5:
                    col_widths = [AVAIL_WIDTH * 0.20] * 5
                elif n_cols == 6:
                    col_widths = [AVAIL_WIDTH / 6] * 6
                else:
                    # Many columns - first column wider
                    first = AVAIL_WIDTH * 0.18
                    rest = (AVAIL_WIDTH - first) / (n_cols - 1)
                    col_widths = [first] + [rest] * (n_cols - 1)

                t = make_table(table_data, col_widths)
                story.append(Spacer(1, 2 * mm))
                story.append(t)
                story.append(Spacer(1, 3 * mm))
            continue

        if elem_type == 'hr':
            story.append(HRFlowable(width='100%', thickness=0.5, color=TABLE_BORDER,
                                    spaceAfter=3 * mm, spaceBefore=3 * mm))
            continue

        if elem_type == 'footnote':
            formatted = _inline_format_preserve_entities(content)
            story.append(Paragraph(formatted, styles['Footnote']))
            continue

    # Final copyright
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=TABLE_BORDER, spaceAfter=3 * mm))
    story.append(Paragraph(
        '\u00a9 2026 Littledata. Protocol specification: W3C Community Final Specification Agreement '
        '(W3C CCG) / Apache 2.0 (DIF). Whitepaper text: CC BY 4.0. All rights reserved for commercial '
        'implementations.',
        styles['Footnote']
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
        title='Attestara \u2014 Whitepaper v5.0',
        author='littledata',
        subject='A Cryptographic Trust Protocol for Autonomous AI Agent Commerce',
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
    story.insert(1, NextPageTemplate('content'))

    doc.build(story)
    print(f'PDF generated: {OUTPUT_PATH}')
    print(f'Pages: {doc.page}')


if __name__ == '__main__':
    main()
