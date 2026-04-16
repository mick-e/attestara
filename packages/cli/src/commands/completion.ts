import { Command } from 'commander'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { printSuccess, printDetail, printError } from '../output.js'

// ── Completion script templates ─────────────────────────────────────

const BASH_COMPLETION = `# attestara bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(attestara completion bash)
#   # or
#   eval "$(attestara completion bash)"

_attestara_completions() {
  local cur prev commands subcommands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="init identity credential session negotiate commitment demo doctor completion"

  case "\${COMP_WORDS[1]}" in
    identity)
      subcommands="create show rotate-key"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    credential)
      subcommands="issue list show revoke"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    session)
      subcommands="create list show"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    negotiate)
      subcommands="propose accept reject"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    commitment)
      subcommands="list show verify"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    completion)
      subcommands="bash zsh fish"
      COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
      return 0
      ;;
    init|demo|doctor)
      # These commands have only flags, no subcommands
      return 0
      ;;
  esac

  if [ "\${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  fi

  return 0
}

complete -F _attestara_completions attestara
`

const ZSH_COMPLETION = `#compdef attestara
# attestara zsh completion
# Add to ~/.zshrc:
#   source <(attestara completion zsh)
#   # or save to fpath:
#   attestara completion zsh > ~/.zsh/completions/_attestara

_attestara() {
  local -a commands
  commands=(
    'init:Initialize a new Attestara project'
    'identity:Manage agent DID identity'
    'credential:Manage authority credentials'
    'session:Manage negotiation sessions'
    'negotiate:Submit proposals and negotiate'
    'commitment:Manage on-chain commitments'
    'demo:Run interactive demo'
    'doctor:Check config and connectivity'
    'completion:Generate shell completions'
  )

  local -a identity_commands
  identity_commands=(
    'create:Create a new DID identity'
    'show:Show current identity info'
    'rotate-key:Rotate the agent DID key'
  )

  local -a credential_commands
  credential_commands=(
    'issue:Issue a new Authority Credential'
    'list:List credentials'
    'show:Show credential details'
    'revoke:Revoke a credential'
  )

  local -a session_commands
  session_commands=(
    'create:Create a new negotiation session'
    'list:List negotiation sessions'
    'show:Show session detail with turns'
  )

  local -a negotiate_commands
  negotiate_commands=(
    'propose:Submit a proposal with ZK proof'
    'accept:Accept current terms'
    'reject:Reject and terminate negotiation'
  )

  local -a commitment_commands
  commitment_commands=(
    'list:List commitments'
    'show:Show commitment detail'
    'verify:Verify on-chain commitment'
  )

  local -a completion_commands
  completion_commands=(
    'bash:Generate bash completion'
    'zsh:Generate zsh completion'
    'fish:Generate fish completion'
  )

  _arguments -C \\
    '--no-interactive[Disable interactive prompts]' \\
    '--version[Show version]' \\
    '--help[Show help]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe -t commands 'attestara command' commands
      ;;
    args)
      case $words[1] in
        identity)
          _describe -t commands 'identity command' identity_commands
          ;;
        credential)
          _describe -t commands 'credential command' credential_commands
          ;;
        session)
          _describe -t commands 'session command' session_commands
          ;;
        negotiate)
          _describe -t commands 'negotiate command' negotiate_commands
          ;;
        commitment)
          _describe -t commands 'commitment command' commitment_commands
          ;;
        completion)
          _describe -t commands 'completion shell' completion_commands
          ;;
      esac
      ;;
  esac
}

_attestara "$@"
`

const FISH_COMPLETION = `# attestara fish completion
# Save to ~/.config/fish/completions/attestara.fish:
#   attestara completion fish > ~/.config/fish/completions/attestara.fish

# Disable file completion by default
complete -c attestara -f

# Top-level commands
complete -c attestara -n '__fish_use_subcommand' -a 'init' -d 'Initialize a new Attestara project'
complete -c attestara -n '__fish_use_subcommand' -a 'identity' -d 'Manage agent DID identity'
complete -c attestara -n '__fish_use_subcommand' -a 'credential' -d 'Manage authority credentials'
complete -c attestara -n '__fish_use_subcommand' -a 'session' -d 'Manage negotiation sessions'
complete -c attestara -n '__fish_use_subcommand' -a 'negotiate' -d 'Submit proposals and negotiate'
complete -c attestara -n '__fish_use_subcommand' -a 'commitment' -d 'Manage on-chain commitments'
complete -c attestara -n '__fish_use_subcommand' -a 'demo' -d 'Run interactive demo'
complete -c attestara -n '__fish_use_subcommand' -a 'doctor' -d 'Check config and connectivity'
complete -c attestara -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell completions'

# identity subcommands
complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'create' -d 'Create a new DID identity'
complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'show' -d 'Show current identity info'
complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'rotate-key' -d 'Rotate the agent DID key'

# credential subcommands
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'issue' -d 'Issue a new Authority Credential'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'list' -d 'List credentials'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'show' -d 'Show credential details'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'revoke' -d 'Revoke a credential'

# session subcommands
complete -c attestara -n '__fish_seen_subcommand_from session' -a 'create' -d 'Create a new negotiation session'
complete -c attestara -n '__fish_seen_subcommand_from session' -a 'list' -d 'List negotiation sessions'
complete -c attestara -n '__fish_seen_subcommand_from session' -a 'show' -d 'Show session detail with turns'

# negotiate subcommands
complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'propose' -d 'Submit a proposal with ZK proof'
complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'accept' -d 'Accept current terms'
complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'reject' -d 'Reject and terminate negotiation'

# commitment subcommands
complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'list' -d 'List commitments'
complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'show' -d 'Show commitment detail'
complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'verify' -d 'Verify on-chain commitment'

# completion subcommands
complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'bash' -d 'Generate bash completion'
complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'zsh' -d 'Generate zsh completion'
complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'fish' -d 'Generate fish completion'

# Global flags
complete -c attestara -l no-interactive -d 'Disable interactive prompts'
complete -c attestara -l json -d 'Output as JSON'
complete -c attestara -l help -d 'Show help'
complete -c attestara -l version -d 'Show version'
`

const SCRIPTS: Record<string, string> = {
  bash: BASH_COMPLETION,
  zsh: ZSH_COMPLETION,
  fish: FISH_COMPLETION,
}

export function completionCommand(): Command {
  return new Command('completion')
    .description('Generate shell completion scripts')
    .argument('[shell]', 'Shell type: bash, zsh, or fish')
    .option('--save', 'Save to packages/cli/completions/ directory')
    .addHelpText('after', `
Examples:
  $ attestara completion bash          Print bash completion to stdout
  $ attestara completion zsh           Print zsh completion to stdout
  $ attestara completion fish          Print fish completion to stdout
  $ attestara completion bash --save   Save to completions/ directory

Install:
  $ source <(attestara completion bash)
  $ attestara completion zsh > ~/.zsh/completions/_attestara
  $ attestara completion fish > ~/.config/fish/completions/attestara.fish
    `)
    .action(async (shell, options) => {
      if (!shell) {
        // Print available shells
        console.log('Available shells: bash, zsh, fish')
        console.log()
        console.log('Usage:')
        console.log('  attestara completion bash     Print to stdout')
        console.log('  attestara completion bash --save  Save to file')
        return
      }

      const script = SCRIPTS[shell]
      if (!script) {
        printError(`Unknown shell: ${shell}. Supported: bash, zsh, fish`)
        process.exitCode = 1
        return
      }

      if (options.save) {
        // Try to resolve completions directory relative to package
        const completionsDir = join(process.cwd(), 'packages', 'cli', 'completions')
        if (!existsSync(completionsDir)) {
          mkdirSync(completionsDir, { recursive: true })
        }

        const ext = shell === 'zsh' ? 'zsh' : shell === 'fish' ? 'fish' : 'bash'
        const filename = shell === 'zsh' ? `_attestara` : `attestara.${ext}`
        const filePath = join(completionsDir, filename)
        writeFileSync(filePath, script, 'utf-8')
        printSuccess(`Saved ${shell} completion to ${filePath}`)
        return
      }

      // Print to stdout for piping / sourcing
      process.stdout.write(script)
    })
}
