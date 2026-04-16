/**
 * Interactive prompt helpers for CLI commands.
 *
 * When stdin is a TTY and --no-interactive is not set, prompts the user
 * for missing required options. Falls through silently in non-interactive
 * environments (CI, pipes, --no-interactive).
 */

import type { Command } from 'commander'

let inquirer: typeof import('@inquirer/prompts') | null = null

async function loadInquirer() {
  if (!inquirer) {
    try {
      inquirer = await import('@inquirer/prompts')
    } catch {
      // @inquirer/prompts not installed — skip interactive mode
      inquirer = null
    }
  }
  return inquirer
}

/**
 * Returns true if the CLI should run in interactive mode.
 * Interactive mode requires: TTY stdin + --no-interactive NOT set.
 */
export function isInteractive(cmd: Command): boolean {
  // Walk up the command chain to find the root program
  let root: Command = cmd
  while (root.parent) root = root.parent

  // Check for --no-interactive flag
  const opts = root.opts()
  if (opts.noInteractive === true) return false

  // Check if stdin is a TTY
  return process.stdin.isTTY === true
}

/**
 * Prompt for a missing string option.
 * Returns the existing value if present, or prompts interactively.
 * In non-interactive mode, returns undefined if the value is missing.
 */
export async function promptIfMissing(
  cmd: Command,
  currentValue: string | undefined,
  config: {
    message: string
    validate?: (input: string) => boolean | string
    default?: string
  },
): Promise<string | undefined> {
  if (currentValue) return currentValue
  if (!isInteractive(cmd)) return undefined

  const inq = await loadInquirer()
  if (!inq) return undefined

  const result = await inq.input({
    message: config.message,
    default: config.default,
    validate: config.validate,
  })
  return result || undefined
}

/**
 * Prompt for a missing selection option.
 */
export async function selectIfMissing(
  cmd: Command,
  currentValue: string | undefined,
  config: {
    message: string
    choices: { name: string; value: string }[]
    default?: string
  },
): Promise<string | undefined> {
  if (currentValue) return currentValue
  if (!isInteractive(cmd)) return undefined

  const inq = await loadInquirer()
  if (!inq) return undefined

  return inq.select({
    message: config.message,
    choices: config.choices,
    default: config.default,
  })
}

/**
 * Prompt for confirmation.
 */
export async function confirmPrompt(
  cmd: Command,
  config: {
    message: string
    default?: boolean
  },
): Promise<boolean> {
  if (!isInteractive(cmd)) return config.default ?? true

  const inq = await loadInquirer()
  if (!inq) return config.default ?? true

  return inq.confirm({
    message: config.message,
    default: config.default,
  })
}

/**
 * Registers the global --no-interactive flag on the root program.
 */
export function registerInteractiveFlag(program: Command): void {
  program.option('--no-interactive', 'Disable interactive prompts')
}
