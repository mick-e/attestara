# attestara bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(attestara completion bash)

_attestara_completions() {
  local cur prev commands subcommands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  commands="init identity credential session negotiate commitment demo doctor completion"

  case "${COMP_WORDS[1]}" in
    identity)
      subcommands="create show rotate-key"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    credential)
      subcommands="issue list show revoke"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    session)
      subcommands="create list show"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    negotiate)
      subcommands="propose accept reject"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    commitment)
      subcommands="list show verify"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    completion)
      subcommands="bash zsh fish"
      COMPREPLY=( $(compgen -W "${subcommands}" -- "${cur}") )
      return 0
      ;;
    init|demo|doctor)
      return 0
      ;;
  esac

  if [ "${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
  fi

  return 0
}

complete -F _attestara_completions attestara
