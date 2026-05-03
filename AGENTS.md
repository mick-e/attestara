# AGENTS.md — Attestara ZK Trust Protocol

## Paperclip Integration

- **Company**: MickE Ventures
- **Project**: Attestara ZK Trust Protocol
- **Company ID**: `914d3bfd-0b16-4395-9d3c-61cf1d38548b`
- **Project ID**: `47fc100b-b5b6-4479-9d51-f5031236c6f9`
- **Paperclip API**: `http://localhost:3100`

## Assigned Agents

| Agent | Title | ID | Responsibility |
|-------|-------|----|----------------|
| Protocol Dev | Senior Engineer - Attestara | `48b344aa-0929-474b-9298-f800e4d55d89` | Primary development |
| Gatekeeper | Head of QA | `576379be-4e55-4d62-aea7-3719eb4a459b` | Quality strategy |
| Test Runner | QA Engineer - Backend | `66c2c3d7-7201-4529-b28a-478daf7ff2d6` | Backend tests |
| Deployer | Head of DevOps | `266f82e0-a653-4fb0-8220-209e6238bd0c` | CI/CD |
| Pipeline | DevOps Engineer | `aa1789a5-c9f1-4efe-981f-29c3ad27efc6` | GitHub Actions |
| Sentinel | Head of Cybersecurity | `e1b9672a-b0ec-4864-b32c-ef65f06d1107` | Security posture |
| Scanner | Security Analyst | `4fc7896c-bdfe-442e-a33b-b942ebbab0e2` | Smart contract security |
| Auditor | Compliance Analyst | `20400aed-8295-4b2f-aae5-9e7e21aa8495` | Smart contract audit prep |

## Project Context

- **Stack**: TypeScript/Fastify (backend), Next.js (frontend), Solidity (smart contracts), Circom (ZK circuits)
- **Version**: v0.1.0 MVP
- **Status**: 22-task MVP completion plan (approved 2026-03-25)
- **GitHub**: mick-e/attestara

## MVP Scope

- ZK circuits for verifiable AI safety claims
- Solidity smart contracts for on-chain attestation registry
- Fastify API for attestation submission and verification
- Next.js frontend for attestation explorer and submission
- Integration with external AI safety scoring systems

## Feature Spec Convention

For non-trivial features (multi-day work, schema changes, new endpoints, billing/compliance impact), produce specs at:

```
docs/superpowers/specs/<YYYY-MM-DD>-<slug>/
  spec.md         Problem, users, requirements, success criteria.
                  Output of superpowers:brainstorming. Includes a
                  one-line "Customer/hypothesis" field — if you can't
                  fill it in, defer the work.
  plan.md         Architecture, file changes, sequencing.
                  Output of superpowers:writing-plans.
  tasks.md        Ordered checklist with verification step per task.
  data-model.md   REQUIRED if migrations, new tables/columns, or
                  model changes. Schema deltas + rationale.
  contracts/      REQUIRED if new/changed API endpoints. One file
                  per endpoint group; markdown or OpenAPI.
  quickstart.md   How to verify end-to-end (curl, UI steps,
                  expected output). Doubles as smoke test script.
  research.md     Optional. Library evals, competitor scan,
                  prior art.
```

**Skip levels for trivial work.** Bug fix or copy change = no spec folder. One-endpoint feature with no migration = `spec.md` + `plan.md` only. Use judgment.

**Loose docs in `docs/`** are archived to `docs/_archive/` rather than deleted, preserving history. New work follows the convention above.
