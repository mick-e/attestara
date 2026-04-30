# attestara fish completion
# Save to ~/.config/fish/completions/attestara.fish

complete -c attestara -f

complete -c attestara -n '__fish_use_subcommand' -a 'init' -d 'Initialize a new Attestara project'
complete -c attestara -n '__fish_use_subcommand' -a 'identity' -d 'Manage agent DID identity'
complete -c attestara -n '__fish_use_subcommand' -a 'credential' -d 'Manage authority credentials'
complete -c attestara -n '__fish_use_subcommand' -a 'session' -d 'Manage negotiation sessions'
complete -c attestara -n '__fish_use_subcommand' -a 'negotiate' -d 'Submit proposals and negotiate'
complete -c attestara -n '__fish_use_subcommand' -a 'commitment' -d 'Manage on-chain commitments'
complete -c attestara -n '__fish_use_subcommand' -a 'demo' -d 'Run interactive demo'
complete -c attestara -n '__fish_use_subcommand' -a 'doctor' -d 'Check config and connectivity'
complete -c attestara -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell completions'

complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'create' -d 'Create a new DID identity'
complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'show' -d 'Show current identity info'
complete -c attestara -n '__fish_seen_subcommand_from identity' -a 'rotate-key' -d 'Rotate the agent DID key'

complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'issue' -d 'Issue a new Authority Credential'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'list' -d 'List credentials'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'show' -d 'Show credential details'
complete -c attestara -n '__fish_seen_subcommand_from credential' -a 'revoke' -d 'Revoke a credential'

complete -c attestara -n '__fish_seen_subcommand_from session' -a 'create' -d 'Create a new negotiation session'
complete -c attestara -n '__fish_seen_subcommand_from session' -a 'list' -d 'List negotiation sessions'
complete -c attestara -n '__fish_seen_subcommand_from session' -a 'show' -d 'Show session detail with turns'

complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'propose' -d 'Submit a proposal with ZK proof'
complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'accept' -d 'Accept current terms'
complete -c attestara -n '__fish_seen_subcommand_from negotiate' -a 'reject' -d 'Reject and terminate negotiation'

complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'list' -d 'List commitments'
complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'show' -d 'Show commitment detail'
complete -c attestara -n '__fish_seen_subcommand_from commitment' -a 'verify' -d 'Verify on-chain commitment'

complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'bash' -d 'Generate bash completion'
complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'zsh' -d 'Generate zsh completion'
complete -c attestara -n '__fish_seen_subcommand_from completion' -a 'fish' -d 'Generate fish completion'

complete -c attestara -l no-interactive -d 'Disable interactive prompts'
complete -c attestara -l json -d 'Output as JSON'
complete -c attestara -l help -d 'Show help'
complete -c attestara -l version -d 'Show version'
