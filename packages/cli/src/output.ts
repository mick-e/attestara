import chalk from 'chalk'

// ── Status colors ──────────────────────────────────────────────────

export function statusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'valid':
    case 'verified':
      return chalk.green(status)
    case 'completed':
    case 'committed':
      return chalk.cyan(status)
    case 'pending_acceptance':
    case 'paused':
      return chalk.yellow(status)
    case 'rejected':
    case 'expired':
    case 'revoked':
    case 'deactivated':
      return chalk.red(status)
    default:
      return chalk.white(status)
  }
}

// ── Symbols ────────────────────────────────────────────────────────

export const symbols = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('!'),
  info: chalk.blue('i'),
  arrow: chalk.gray('→'),
  arrowLeft: chalk.gray('←'),
  bullet: chalk.gray('•'),
} as const

// ── Table rendering ────────────────────────────────────────────────

export interface TableColumn {
  header: string
  key: string
  width?: number
  align?: 'left' | 'right'
  format?: (value: unknown) => string
}

export function printTable(columns: TableColumn[], rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    console.log(chalk.gray('  No results found.'))
    return
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerLen = col.header.length
    const maxDataLen = rows.reduce((max, row) => {
      const val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '')
      return Math.max(max, stripAnsi(val).length)
    }, 0)
    return col.width ?? Math.max(headerLen, Math.min(maxDataLen, 40))
  })

  // Header
  const headerLine = columns
    .map((col, i) => chalk.bold(pad(col.header, widths[i] ?? 10, col.align)))
    .join('  ')
  console.log(headerLine)
  console.log(chalk.gray('─'.repeat(stripAnsi(headerLine).length)))

  // Rows
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const raw = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '')
        return pad(raw, widths[i] ?? 10, col.align)
      })
      .join('  ')
    console.log(line)
  }
}

// ── JSON output ────────────────────────────────────────────────────

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, jsonReplacer, 2))
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  return value
}

// ── Key-value detail display ───────────────────────────────────────

export function printDetail(label: string, value: string | number | boolean | null | undefined): void {
  const labelStr = chalk.gray(`  ${label}:`.padEnd(24))
  const valStr = value === null || value === undefined ? chalk.gray('—') : String(value)
  console.log(`${labelStr}${valStr}`)
}

export function printHeader(title: string): void {
  console.log()
  console.log(chalk.bold(title))
  console.log(chalk.gray('─'.repeat(title.length + 4)))
}

// ── Error display ──────────────────────────────────────────────────

export function printError(message: string): void {
  console.error(`${symbols.error} ${chalk.red(message)}`)
}

export function printSuccess(message: string): void {
  console.log(`${symbols.success} ${chalk.green(message)}`)
}

export function printWarning(message: string): void {
  console.log(`${symbols.warning} ${chalk.yellow(message)}`)
}

export function printInfo(message: string): void {
  console.log(`${symbols.info} ${message}`)
}

// ── Helpers ────────────────────────────────────────────────────────

function pad(str: string, width: number, align: 'left' | 'right' = 'left'): string {
  const len = stripAnsi(str).length
  if (len >= width) return str
  const padding = ' '.repeat(width - len)
  return align === 'right' ? padding + str : str + padding
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// ── Currency formatting ────────────────────────────────────────────

export function formatCurrency(value: bigint | number | string, currency: string): string {
  const num = typeof value === 'bigint' ? Number(value) : Number(value)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
  return `${currency} ${formatted}`
}

export function truncateId(id: string, len = 12): string {
  if (id.length <= len) return id
  return id.slice(0, len) + '...'
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().replace('T', ' ').slice(0, 19)
}
