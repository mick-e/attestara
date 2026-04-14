# Security Policy

Attestara is a zero-knowledge trust protocol for autonomous agents. We take the
security of the protocol, its smart contracts, and its supporting services
seriously. This document describes how we handle vulnerability reports and what
researchers can expect from us in return.

## Supported Versions

Attestara is currently pre-1.0. Only the `master` branch of this repository
receives security updates. Tagged releases prior to 1.0 are provided for
reference only and will not be patched in place; fixes will land on `master`
and ship in the next release.

| Version    | Supported          |
| ---------- | ------------------ |
| `master`   | Yes                |
| < 1.0 tags | No (upgrade to `master`) |

## Reporting a Vulnerability

Please report suspected vulnerabilities by email to
**security@attestara.ai**.

- You should receive an acknowledgement within **72 hours**.
- For issues rated high or critical, we target a fix within **30 days** of
  the initial report.
- Please do not file public GitHub issues for security problems. Coordinated
  disclosure helps us protect users.

Useful information to include:

- A clear description of the issue and its impact.
- Reproduction steps, proof-of-concept code, or transaction hashes where
  applicable.
- Affected components (contracts, relay, portal, SDK, CLI) and commit SHA.
- Your preferred name / handle for credit, or a request for anonymity.

### PGP Key

```
PGP key to be published; contact via email for now.
```

## Scope

### In Scope

- Smart contracts deployed on Arbitrum (mainnet and Sepolia) from this
  repository (`packages/contracts`).
- The Attestara Relay API (`packages/relay`).
- The Attestara Portal web app (`packages/portal`).
- The Attestara SDK (`packages/sdk`).
- The Attestara CLI (`packages/cli`).

### Out of Scope

- Self-hosted forks or third-party deployments of the protocol.
- Social engineering of Attestara staff, contractors, or users.
- Denial-of-service attacks, volumetric or otherwise, against our
  infrastructure or public endpoints.
- Automated scanner output without a demonstrated, exploitable impact.
- Vulnerabilities in third-party dependencies that have no exploitable path
  in Attestara's code.

## Safe Harbor

Attestara will not pursue legal action against security researchers who act in
good faith and within the bounds of this policy. Specifically, we consider
research conducted under this policy to be:

- Authorized under applicable anti-hacking laws (e.g. CFAA and equivalents).
- Authorized under applicable anti-circumvention laws (e.g. DMCA and
  equivalents).
- Exempt from restrictions in our Terms of Service that would otherwise
  conflict with this policy, for the limited purpose of security research.

Researchers are expected to avoid privacy violations, data destruction, and
service disruption, and to stop and contact us if they encounter user data.

## Credit

With your permission, we will publicly credit you in the vulnerability
disclosure and in our release notes. If you prefer to remain anonymous,
please tell us in your report and we will honor that request.
