# Spec Artifact Convention Rollout

**Date:** 2026-05-02
**Status:** Draft — pending user review
**Scope:** attestara, bhapi-ai-portal, littledata-mvp (executed in ascending
complexity order to de-risk the rollout; user's value-priority order is the
reverse — littledata, bhapi, attestara — and is reflected in attention going
forward, not in this rollout sequence).
**Customer/hypothesis:** Self (solo dev). Hypothesis: a standardised per-feature
artifact set will reduce time spent re-discovering context across three parallel
projects and replace the current scattered status-doc pattern.

## Problem

The three active projects all use the superpowers `brainstorming → writing-plans →
executing-plans` flow, but the *outputs* are inconsistent. Today:

- `littledata-mvp/docs/` contains 70+ loose files: dated status txts, ad-hoc
  markdown plans, screenshots, one top-level `SPEC.md`. Hard to tell what is
  current vs. archival.
- `bhapi-ai-portal/docs/` mixes living architecture docs with dated status files
  (`bhapi-status.txt`, `project-status-04032026.txt`) and one-shot specs.
- `attestara/docs/` is smaller but already drifting (`attestara-next.txt`,
  `Untitled.txt`, `{.txt`, dated review files).

There is no agreed shape for "what does a feature spec look like". Spec-Kit
(github/spec-kit) ships a good artifact set; rather than adopt the full CLI we
adopt the artifacts.

## Goals

1. Every non-trivial feature, across all three projects, produces specs in a
   uniform structure under `docs/superpowers/specs/<YYYY-MM-DD>-<slug>/`.
2. The convention is encoded in each project's `CLAUDE.md` and `AGENTS.md` so
   future sessions follow it without reminders.
3. Existing scattered status docs are archived, not deleted, so history is
   preserved but the convention dominates.

## Non-goals

- Installing spec-kit CLI or adopting `/speckit.*` slash commands.
- Backfilling specs for shipped features. New work only.
- Changing the superpowers brainstorming/writing-plans/executing-plans flow.

## The convention

For non-trivial features (multi-day work, schema changes, new endpoints,
billing/compliance impact), produce specs at:

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

**Skip levels for trivial work.** Bug fix or copy change = no spec folder.
One-endpoint feature with no migration = `spec.md` + `plan.md` only. Use
judgment.

## Per-project rollout actions

Execute in ascending complexity order to de-risk the convention itself. The
smallest project (attestara) is the pilot — any wording or structural issues
surface there with low blast radius before they're applied to the largest one
(littledata-mvp). The user's value-priority is the reverse and stays the
basis for ongoing attention; only the rollout *sequence* is complexity-first.

### attestara (pilot — execute first)
- Add the convention block to `CLAUDE.md` (under a new `## Feature Spec
  Convention` heading) and `AGENTS.md`.
- Move loose docs to `docs/_archive/`:
  `attestara-next.txt`, `Untitled.txt`, `{.txt`, `littledata-running-notes.txt`,
  `projects.txt`, `submission-orgs.txt`, `user-stories.txt`,
  the four "Context …" / "Confirm …" / "Data quality …" / "Device agent…" txt
  files, both dated `ATTESTARA-PROJECT-REVIEW-*.md` files,
  `attestara-tan-project-scope-v0.1.md`, `ATTESTARA-CONTINUATION-PROMPT.md`.
- Keep in `docs/`: `ARCHITECTURE.md`, `DEPLOYMENT.md`, `AUDIT-PREP.md`,
  `brand/`, `demo/`, `legal/`, `standards/`, `superpowers/`.

### bhapi-ai-portal (second)
- Add convention block to `CLAUDE.md` and `AGENTS.md`.
- Move loose docs to `docs/_archive/`:
  `bhapi-ai-portal-Project Status.txt`, `bhapi-status.txt`,
  `project-status-04032026.txt`, `bhapi-platform-unification-scope.html`,
  `bhapi-post-mvp-roadmap.{md,docx}`, `Bhapi_Gap_Analysis_Q2_2026.{md,pdf}`,
  `family-safety-features.md`, `generate_pdf.py`,
  `bhapi-family-ai-portal-spec.{md,docx}`.
- Keep: `adr/`, `architecture/`, `audits/`, `benchmarks/`, `compliance/`,
  `hiring/`, `launch/`, `legacy/`, `operations/`, `partnerships/`,
  `procurement/`, `security/`, `strategy/`, `superpowers/`.

### littledata-mvp (third — top value, biggest sweep)
- Add convention block to `CLAUDE.md` and `AGENTS.md`.
- Move loose status / dated docs to `docs/_archive/` (all `.txt` files at root,
  dated status `.md`s like `STATUS_REVIEW_2026-03-13.md`,
  `littledata-status.txt`, `littedata-status-15042026.txt`, `plan0.9.txt`,
  `mp-acttion.txt`, `deferred.txt`, `airisk-list.txt`, screenshots,
  `Manual *.txt`, `BLOG_*.md`, `LINKEDIN_*.md`, etc.).
- Move root `SPEC.md` to `docs/_archive/SPEC-pre-convention.md` (it predates the
  convention and is not in the new shape; preserve for history).
- Keep all subfolders, `README.md`, `openapi.json`,
  `competitive-analysis-2026-03-25.{md,html}`, `competitive-strategy-2026.md`,
  `IRISH_AI_GAP_ANALYSIS_ROADMAP.md`, `go-to-market-playbook.md`,
  `design-partners.md`, `STATUS_REVIEW_2026-03-13.md` only if still current
  (otherwise archive), `wise-sandbox-public-key.pem`.
- **Coordinate with active feature review:** if you're still walking files in
  `littledata-mvp/docs/` when this step runs, defer the archive sweep until the
  review wraps. The CLAUDE.md/AGENTS.md edit can land independently.

Final list of archive candidates per project will be confirmed in `plan.md`
after a second pass — this spec captures intent, not the exact file list.

## Success criteria

1. All three projects' `CLAUDE.md` files contain an identical "Feature Spec
   Convention" section (verifiable by diff).
2. All three `AGENTS.md` files reference the same convention.
3. `docs/_archive/` exists in each project and contains the moved files; no
   files were deleted.
4. The next non-trivial feature started in any project produces the full
   artifact folder without prompting.

## Out-of-scope follow-ups

- A `docs/_archive/README.md` explaining the cutoff date — defer until first
  archival pass is done.
- Cross-project shared convention doc in a fourth location — premature; if
  drift happens we revisit.
- Migrating shipped features into the new shape — explicitly not doing this.

## Risks

- **Inconsistency drift.** I'll forget the convention in one project. Mitigation:
  add a one-line reminder at the top of `CLAUDE.md` so it's the first thing
  loaded.
- **Archive becomes a graveyard nobody reads.** Acceptable. Files are preserved
  for git history regardless; archival is for human signal-to-noise, not
  machine.
- **The "Customer/hypothesis" field becomes a fig-leaf.** Possible. Worth
  reviewing in 60 days whether specs are actually getting filtered by it.
