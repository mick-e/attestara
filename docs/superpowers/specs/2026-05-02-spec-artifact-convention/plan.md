# Spec Artifact Convention Rollout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out the spec artifact convention to attestara, bhapi-ai-portal, and littledata-mvp — convention text appended to each project's `CLAUDE.md` and `AGENTS.md`, and stale loose docs in `docs/` archived to `docs/_archive/`.

**Architecture:** Per-project pass with three steps each: (1) append the canonical convention block to `CLAUDE.md`, (2) append the same block to `AGENTS.md`, (3) `git mv` enumerated stale files into `docs/_archive/`. Executed attestara → bhapi → littledata (ascending complexity). Littledata's archive sweep is split into its own deferred task to avoid colliding with the user's active feature review.

**Tech Stack:** PowerShell (Windows), git, no application code changes. Each project is a separate git repository (master branch, direct push).

**Commit policy:** Plan includes commit steps. Executor MUST confirm with the user before each commit (per the user's standing preference of explicit commit approval). The user may grant batch approval covering multiple commits in one go.

---

## File Structure

**Modified files (6):**
- `C:/claude/attestara/CLAUDE.md` — append `## Feature Spec Convention` section
- `C:/claude/attestara/AGENTS.md` — append same section
- `C:/claude/bhapi-ai-portal/CLAUDE.md` — append same section
- `C:/claude/bhapi-ai-portal/AGENTS.md` — append same section
- `C:/claude/littledata-mvp/CLAUDE.md` — append same section
- `C:/claude/littledata-mvp/AGENTS.md` — append same section

**Created directories (3):**
- `C:/claude/attestara/docs/_archive/`
- `C:/claude/bhapi-ai-portal/docs/_archive/`
- `C:/claude/littledata-mvp/docs/_archive/`

**Moved files:** ~57 total via `git mv`. Per-project lists enumerated in Tasks 3, 6, and 10.

---

## Canonical Convention Block

This exact text is appended to all six target files (CLAUDE.md and AGENTS.md in each of the three projects). Reproduced in full in each task that uses it — do not abbreviate or paraphrase.

```markdown
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
```

---

## Branch Switch Safety Procedure (added during execution)

Pre-flight (Task 1) revealed that **attestara is on `feat/python-plugins`** and **littledata-mvp is on `deps/fastapi-0.118-starlette-cve`** with unrelated WIP. Convention work goes on `master` per user direction. This procedure manages the switch safely.

**Per repo:**

```powershell
Push-Location C:\claude\<repo>

# 1. Snapshot original state
$origBranch = git rev-parse --abbrev-ref HEAD
git status --short > "$env:TEMP\status-before-$($origBranch -replace '/','-').txt"

# 2. Stash tracked modifications (untracked files are NOT stashed; they travel with the switch)
$stashMsg = "wip before convention rollout 2026-05-02"
git stash push -m $stashMsg
$stashed = (git stash list | Select-String -SimpleMatch $stashMsg) -ne $null

# 3. Switch and sync
git switch master
git pull --ff-only origin master

# 4. (Do convention work — Tasks 2/3 for attestara, Task 8 for littledata)
# 5. (Commit + push with explicit `git add <files>`, NEVER `git add -A`)

# 6. Return to original branch
git switch $origBranch

# 7. Pop stash if we stashed
if ($stashed) {
    git stash pop
    if ($LASTEXITCODE -ne 0) {
        Write-Output "STASH POP CONFLICT — manual resolution required. Stash preserved."
        # STOP — ask user before doing anything else
    }
}

# 8. Verify state matches snapshot
git status --short > "$env:TEMP\status-after-$($origBranch -replace '/','-').txt"
Compare-Object (Get-Content "$env:TEMP\status-before-$($origBranch -replace '/','-').txt") (Get-Content "$env:TEMP\status-after-$($origBranch -replace '/','-').txt")

Pop-Location
```

**Risks and mitigations:**

| Risk | Mitigation |
|---|---|
| `git switch master` refuses due to tracked-file conflict | Stash in step 2 covers this — only untracked files travel, no conflict possible. |
| `git pull --ff-only` fails (local master diverged from remote) | STOP and ask user — likely indicates an out-of-band push. |
| Stash pop conflict on return | Stash entry preserved; STOP and ask user before next repo. |
| Untracked WIP files (attestara: `packages/relay/openapi.json`, new `scripts/`, new `models.py`; .claude/) appear on master | They stay untracked. **Stage only convention files explicitly by name** — never `git add -A`. They travel back to the original branch on return. |
| Push rejected (remote master moved during work) | Pull again, retry. |
| AGENTS.md untracked on attestara → committed to master | Confirmed acceptable by user — AGENTS.md belongs on master, not on the python-plugins feature branch. |

**Files to stage on master per repo:**
- attestara: `CLAUDE.md`, `AGENTS.md`, all 15 `docs/_archive/*` (via `git mv`), `docs/superpowers/specs/2026-05-02-spec-artifact-convention/{spec.md,plan.md}`
- bhapi-ai-portal: `CLAUDE.md`, `AGENTS.md`, all 12 `docs/_archive/*`
- littledata-mvp: `CLAUDE.md`, `AGENTS.md` (Task 9 only — archive sweep is Task 10, deferred)

---

## Task 1: Pre-flight verification

**Files:** none modified — diagnostic only.

- [ ] **Step 1: Confirm each project is a git repo with no uncommitted changes that could be confused with our work**

```powershell
'attestara','bhapi-ai-portal','littledata-mvp' | ForEach-Object {
    Write-Output "=== $_ ==="
    Push-Location "C:\claude\$_"
    git status --short
    git rev-parse --abbrev-ref HEAD
    Pop-Location
}
```

Expected: each project reports a branch (likely `master`); any pre-existing uncommitted changes are listed. If a project has unrelated uncommitted work, **stop and ask the user** whether to commit/stash it before proceeding. If clean, proceed.

- [ ] **Step 2: Confirm `docs/superpowers/specs/` already exists in each project (it should — created earlier)**

```powershell
'attestara','bhapi-ai-portal','littledata-mvp' | ForEach-Object {
    $p = "C:\claude\$_\docs\superpowers\specs"
    if (Test-Path $p) { Write-Output "OK $p" } else { Write-Output "MISSING $p" }
}
```

Expected: three `OK` lines. If any are missing, create them with `New-Item -ItemType Directory -Force` before proceeding.

---

## Task 2: attestara — append convention block to CLAUDE.md and AGENTS.md

**Files:**
- Modify: `C:/claude/attestara/CLAUDE.md` (append at end)
- Modify: `C:/claude/attestara/AGENTS.md` (append at end)

- [ ] **Step 1: Append convention block to attestara/CLAUDE.md**

Use the Edit or Write tool to append the canonical convention block (from the "Canonical Convention Block" section above) to the end of `C:\claude\attestara\CLAUDE.md`. Insert one blank line before the new section so it visually separates from prior content.

- [ ] **Step 2: Append same convention block to attestara/AGENTS.md**

Same operation for `C:\claude\attestara\AGENTS.md`.

- [ ] **Step 3: Verify both files end with the convention section**

```powershell
Get-Content C:\claude\attestara\CLAUDE.md -Tail 10
Write-Output "---"
Get-Content C:\claude\attestara\AGENTS.md -Tail 10
```

Expected: both outputs include the "Loose docs in `docs/`" final line.

---

## Task 3: attestara — archive loose docs

**Files:**
- Create: `C:/claude/attestara/docs/_archive/` (directory)
- Move (15 files via `git mv`):
  - `## Context bhapi-ai-portal — Pre-Ph.txt`
  - `ATTESTARA-CONTINUATION-PROMPT.md`
  - `attestara-next.txt`
  - `ATTESTARA-PROJECT-REVIEW-2026-04-12.md`
  - `ATTESTARA-PROJECT-REVIEW-2026-04-29.md`
  - `attestara-tan-project-scope-v0.1.md`
  - `Confirm the anchoring service speci.txt`
  - `Data quality ingestion improvement.txt`
  - `Device agent + push notifications.md`
  - `littledata-running-notes.txt`
  - `projects.txt`
  - `submission-orgs.txt`
  - `Untitled.txt`
  - `user-stories.txt`
  - `{.txt`

**Files kept in `docs/` root:** `ARCHITECTURE.md`, `AUDIT-PREP.md`, `DEPLOYMENT.md`. All subdirectories (`brand/`, `demo/`, `legal/`, `standards/`, `superpowers/`) untouched.

- [ ] **Step 1: Create the _archive directory**

```powershell
New-Item -ItemType Directory -Path 'C:\claude\attestara\docs\_archive' -Force | Out-Null
Test-Path 'C:\claude\attestara\docs\_archive'
```

Expected: `True`.

- [ ] **Step 2: git-mv the 15 enumerated files**

```powershell
Push-Location C:\claude\attestara
$files = @(
    '## Context bhapi-ai-portal — Pre-Ph.txt',
    'ATTESTARA-CONTINUATION-PROMPT.md',
    'attestara-next.txt',
    'ATTESTARA-PROJECT-REVIEW-2026-04-12.md',
    'ATTESTARA-PROJECT-REVIEW-2026-04-29.md',
    'attestara-tan-project-scope-v0.1.md',
    'Confirm the anchoring service speci.txt',
    'Data quality ingestion improvement.txt',
    'Device agent + push notifications.md',
    'littledata-running-notes.txt',
    'projects.txt',
    'submission-orgs.txt',
    'Untitled.txt',
    'user-stories.txt',
    '{.txt'
)
foreach ($f in $files) {
    $src = "docs/$f"
    $dst = "docs/_archive/$f"
    git mv -- "$src" "$dst"
    if ($LASTEXITCODE -ne 0) { Write-Output "FAILED: $f"; break }
}
Pop-Location
```

Expected: no `FAILED:` lines. If a file is not git-tracked, fall back to `Move-Item` for that one file and `git add` after.

- [ ] **Step 3: Verify final state**

```powershell
Write-Output "=== docs/ root after archive ==="
Get-ChildItem C:\claude\attestara\docs -File | Select-Object -ExpandProperty Name
Write-Output "=== docs/_archive contents ==="
Get-ChildItem C:\claude\attestara\docs\_archive -File | Select-Object -ExpandProperty Name | Measure-Object | Select-Object Count
```

Expected: docs/ root shows only `ARCHITECTURE.md`, `AUDIT-PREP.md`, `DEPLOYMENT.md`. _archive/ shows count of 15.

---

## Task 4: attestara — verify and commit

- [ ] **Step 1: Review staged changes**

```powershell
Push-Location C:\claude\attestara
git status
git diff --stat HEAD
Pop-Location
```

Expected: ~17 changes (2 modified: CLAUDE.md, AGENTS.md; 15 renamed under docs/_archive/).

- [ ] **Step 2: Confirm commit with user**

Pause and ask: "Attestara changes ready (CLAUDE.md + AGENTS.md convention + 15 archived files). Commit now? Suggested message: `docs: adopt spec artifact convention; archive stale docs`"

- [ ] **Step 3: Commit (after user approval)**

```powershell
Push-Location C:\claude\attestara
git add CLAUDE.md AGENTS.md
git commit -m "docs: adopt spec artifact convention; archive stale docs

Adds the cross-project Feature Spec Convention to CLAUDE.md and
AGENTS.md, and moves 15 dated/loose docs from docs/ to docs/_archive/
to keep docs/ for living material. Convention defined in
docs/superpowers/specs/2026-05-02-spec-artifact-convention/spec.md."
Pop-Location
```

Expected: clean commit, no hook failures.

---

## Task 5: bhapi-ai-portal — append convention block to CLAUDE.md and AGENTS.md

**Files:**
- Modify: `C:/claude/bhapi-ai-portal/CLAUDE.md` (append at end)
- Modify: `C:/claude/bhapi-ai-portal/AGENTS.md` (append at end)

- [ ] **Step 1: Append convention block to bhapi-ai-portal/CLAUDE.md**

Append the canonical convention block (from the "Canonical Convention Block" section above) to `C:\claude\bhapi-ai-portal\CLAUDE.md`.

- [ ] **Step 2: Append same convention block to bhapi-ai-portal/AGENTS.md**

Same for `C:\claude\bhapi-ai-portal\AGENTS.md`.

- [ ] **Step 3: Verify**

```powershell
Get-Content C:\claude\bhapi-ai-portal\CLAUDE.md -Tail 10
Write-Output "---"
Get-Content C:\claude\bhapi-ai-portal\AGENTS.md -Tail 10
```

Expected: both end with the convention section.

---

## Task 6: bhapi-ai-portal — archive loose docs

**Files:**
- Create: `C:/claude/bhapi-ai-portal/docs/_archive/` (directory)
- Move (12 files via `git mv`):
  - `bhapi-ai-portal-Project Status.txt`
  - `bhapi-family-ai-portal-spec.docx`
  - `bhapi-family-ai-portal-spec.md`
  - `bhapi-platform-unification-scope.html`
  - `bhapi-post-mvp-roadmap.docx`
  - `bhapi-post-mvp-roadmap.md`
  - `bhapi-status.txt`
  - `Bhapi_Gap_Analysis_Q2_2026.md`
  - `Bhapi_Gap_Analysis_Q2_2026.pdf`
  - `family-safety-features.md`
  - `generate_pdf.py`
  - `project-status-04032026.txt`

**Subdirectories kept untouched:** `adr/`, `architecture/`, `audits/`, `benchmarks/`, `compliance/`, `hiring/`, `launch/`, `legacy/`, `operations/`, `partnerships/`, `procurement/`, `security/`, `strategy/`, `superpowers/`. After archive, `docs/` root contains zero loose files.

- [ ] **Step 1: Create _archive directory**

```powershell
New-Item -ItemType Directory -Path 'C:\claude\bhapi-ai-portal\docs\_archive' -Force | Out-Null
Test-Path 'C:\claude\bhapi-ai-portal\docs\_archive'
```

Expected: `True`.

- [ ] **Step 2: git-mv the 12 enumerated files**

```powershell
Push-Location C:\claude\bhapi-ai-portal
$files = @(
    'bhapi-ai-portal-Project Status.txt',
    'bhapi-family-ai-portal-spec.docx',
    'bhapi-family-ai-portal-spec.md',
    'bhapi-platform-unification-scope.html',
    'bhapi-post-mvp-roadmap.docx',
    'bhapi-post-mvp-roadmap.md',
    'bhapi-status.txt',
    'Bhapi_Gap_Analysis_Q2_2026.md',
    'Bhapi_Gap_Analysis_Q2_2026.pdf',
    'family-safety-features.md',
    'generate_pdf.py',
    'project-status-04032026.txt'
)
foreach ($f in $files) {
    git mv -- "docs/$f" "docs/_archive/$f"
    if ($LASTEXITCODE -ne 0) { Write-Output "FAILED: $f"; break }
}
Pop-Location
```

Expected: no `FAILED:` lines.

- [ ] **Step 3: Verify final state**

```powershell
Write-Output "=== docs/ root after archive (should be empty of files) ==="
Get-ChildItem C:\claude\bhapi-ai-portal\docs -File | Select-Object -ExpandProperty Name
Write-Output "=== docs/_archive count ==="
Get-ChildItem C:\claude\bhapi-ai-portal\docs\_archive -File | Measure-Object | Select-Object Count
```

Expected: docs/ root has zero files (subdirs only). _archive count is 12.

---

## Task 7: bhapi-ai-portal — verify and commit

- [ ] **Step 1: Review staged changes**

```powershell
Push-Location C:\claude\bhapi-ai-portal
git status
git diff --stat HEAD
Pop-Location
```

Expected: ~14 changes (2 modified, 12 renamed).

- [ ] **Step 2: Confirm commit with user**

Pause: "Bhapi-ai-portal changes ready. Commit now?"

- [ ] **Step 3: Commit (after user approval)**

```powershell
Push-Location C:\claude\bhapi-ai-portal
git add CLAUDE.md AGENTS.md
git commit -m "docs: adopt spec artifact convention; archive stale docs

Adds cross-project Feature Spec Convention to CLAUDE.md and AGENTS.md.
Moves 12 dated/one-shot docs from docs/ to docs/_archive/. Convention
defined in attestara repo at
docs/superpowers/specs/2026-05-02-spec-artifact-convention/spec.md."
Pop-Location
```

Expected: clean commit.

---

## Task 8: littledata-mvp — append convention block to CLAUDE.md and AGENTS.md

**Files:**
- Modify: `C:/claude/littledata-mvp/CLAUDE.md` (append at end)
- Modify: `C:/claude/littledata-mvp/AGENTS.md` (append at end)

- [ ] **Step 1: Append convention block to littledata-mvp/CLAUDE.md**

Append the canonical convention block to `C:\claude\littledata-mvp\CLAUDE.md`.

- [ ] **Step 2: Append same convention block to littledata-mvp/AGENTS.md**

Same for `C:\claude\littledata-mvp\AGENTS.md`.

- [ ] **Step 3: Verify**

```powershell
Get-Content C:\claude\littledata-mvp\CLAUDE.md -Tail 10
Write-Output "---"
Get-Content C:\claude\littledata-mvp\AGENTS.md -Tail 10
```

Expected: both end with the convention section.

---

## Task 9: littledata-mvp — verify and commit (CLAUDE/AGENTS only)

This commit is intentionally separated from the archive sweep (Task 10) because the archive sweep is deferred until the user's active feature review wraps. Shipping the convention text early lets future feature work in this repo follow the convention immediately.

- [ ] **Step 1: Review staged changes**

```powershell
Push-Location C:\claude\littledata-mvp
git status
git diff --stat HEAD
Pop-Location
```

Expected: 2 modified files (CLAUDE.md, AGENTS.md). **No** renames at this point.

- [ ] **Step 2: Confirm commit with user**

Pause: "Littledata CLAUDE/AGENTS changes ready (archive sweep deferred). Commit now?"

- [ ] **Step 3: Commit (after user approval)**

```powershell
Push-Location C:\claude\littledata-mvp
git add CLAUDE.md AGENTS.md
git commit -m "docs: adopt spec artifact convention

Adds cross-project Feature Spec Convention to CLAUDE.md and AGENTS.md.
Archive sweep of stale docs/ files deferred to a follow-up commit
to avoid colliding with active feature review. Convention defined in
attestara repo at
docs/superpowers/specs/2026-05-02-spec-artifact-convention/spec.md."
Pop-Location
```

Expected: clean commit.

---

## Task 10 (DEFERRED): littledata-mvp — archive loose docs

**Trigger:** Execute only after the user signals their feature review of `littledata-mvp/docs/` is complete. Do NOT execute as part of the same session as Tasks 1–9 unless the user explicitly says "go ahead with the archive sweep too".

**Files:**
- Create: `C:/claude/littledata-mvp/docs/_archive/` (directory)
- Rename + move (1 file): `SPEC.md` → `_archive/SPEC-pre-convention.md` (in repo root: `C:/claude/littledata-mvp/SPEC.md`, not under `docs/`)
- Move (44 files via `git mv` from `docs/`):

  Status / dated text:
  - `airisk-list.txt`
  - `deferred.txt`
  - `littledata-status.txt`
  - `littedata-status-15042026.txt`
  - `mp-acttion.txt`
  - `plan0.9.txt`
  - `STATUS_REVIEW_2026-03-13.md`
  - `Manual Infrastructure Setup — Step.txt`
  - `Manual Verification Checklist — v1..txt`

  Marketing / blog (one-shot):
  - `BLOG_PAGE_IMPROVEMENTS.md`
  - `BLOG_POST_PERSONAL_CYBERSECURITY.md`
  - `LINKEDIN_CAMPAIGN.md`
  - `LINKEDIN_POST_CYBERSECURITY_BLOG.md`

  Audit / vendor docs (one-shot):
  - `EU_AI_Act_Competitive_Analysis.docx`
  - `SRE_Placement_Strategy (2).pdf`
  - `UX_AUDIT_FINDINGS_AND_RECOMMENDATIONS.md`

  Screenshots / images (28 files):
  - `401-dashboard.png`, `401-dlp.png`, `401-privacy.png`
  - `billing-screenshot.png`, `billing.png`
  - `company_logo.png`
  - `connect-fail.jpg`, `connect-suite.jpg`
  - `d1.png`, `d2.png`, `d3.png`
  - `dashboard.png`, `dlp.png`, `eu-compliance.png`, `framework.png`
  - `fideo-global-logo.png`
  - `image1.png`, `image2.png`
  - `ionos-log.svg`, `ireland.png`
  - `littledata-ai-security.svg`, `littledata.png`
  - `load.png`, `load2.png`
  - `localhost-connect-error.png`, `localhost.jpg`
  - `Logo-White-Wontok-1.png`
  - `mobile1.jpeg`, `mobile2.jpeg`
  - `redis.jpeg`, `redis0.jpeg`, `redis2.jpeg`
  - `uk-compliance.png`

**Files kept in `docs/` root:** `README.md`, `openapi.json`, `competitive-analysis-2026-03-25.md`, `competitive-analysis-2026-03-25.html`, `competitive-strategy-2026.md`, `IRISH_AI_GAP_ANALYSIS_ROADMAP.md`, `go-to-market-playbook.md`, `design-partners.md`, `wise-sandbox-public-key.pem`. All subdirectories untouched.

- [ ] **Step 1: Confirm with user that the feature review has wrapped**

Ask: "Has your feature review of `littledata-mvp/docs/` completed? Safe to proceed with the archive sweep?" Wait for confirmation.

- [ ] **Step 2: Re-verify the file list is still accurate (docs/ may have changed during review)**

```powershell
Get-ChildItem C:\claude\littledata-mvp\docs -File | Select-Object -ExpandProperty Name
```

If new files appear that should be archived or kept, **update the lists below before proceeding**.

- [ ] **Step 3: Create _archive directory**

```powershell
New-Item -ItemType Directory -Path 'C:\claude\littledata-mvp\docs\_archive' -Force | Out-Null
Test-Path 'C:\claude\littledata-mvp\docs\_archive'
```

Expected: `True`.

- [ ] **Step 4: git-mv the 44 enumerated docs/ files**

```powershell
Push-Location C:\claude\littledata-mvp
$files = @(
    'airisk-list.txt','deferred.txt','littledata-status.txt',
    'littedata-status-15042026.txt','mp-acttion.txt','plan0.9.txt',
    'STATUS_REVIEW_2026-03-13.md',
    'Manual Infrastructure Setup — Step.txt',
    'Manual Verification Checklist — v1..txt',
    'BLOG_PAGE_IMPROVEMENTS.md','BLOG_POST_PERSONAL_CYBERSECURITY.md',
    'LINKEDIN_CAMPAIGN.md','LINKEDIN_POST_CYBERSECURITY_BLOG.md',
    'EU_AI_Act_Competitive_Analysis.docx',
    'SRE_Placement_Strategy (2).pdf',
    'UX_AUDIT_FINDINGS_AND_RECOMMENDATIONS.md',
    '401-dashboard.png','401-dlp.png','401-privacy.png',
    'billing-screenshot.png','billing.png','company_logo.png',
    'connect-fail.jpg','connect-suite.jpg',
    'd1.png','d2.png','d3.png','dashboard.png','dlp.png',
    'eu-compliance.png','framework.png','fideo-global-logo.png',
    'image1.png','image2.png','ionos-log.svg','ireland.png',
    'littledata-ai-security.svg','littledata.png',
    'load.png','load2.png',
    'localhost-connect-error.png','localhost.jpg',
    'Logo-White-Wontok-1.png',
    'mobile1.jpeg','mobile2.jpeg',
    'redis.jpeg','redis0.jpeg','redis2.jpeg',
    'uk-compliance.png'
)
foreach ($f in $files) {
    git mv -- "docs/$f" "docs/_archive/$f"
    if ($LASTEXITCODE -ne 0) { Write-Output "FAILED: $f" }
}
Pop-Location
```

Expected: no `FAILED:` lines. (Loop continues on failure here — image files are most likely to be untracked; for any failures, fall back to `Move-Item` + `git add`.)

- [ ] **Step 5: Move and rename the root-level SPEC.md**

```powershell
Push-Location C:\claude\littledata-mvp
git mv -- 'SPEC.md' 'docs/_archive/SPEC-pre-convention.md'
Pop-Location
```

Expected: clean rename. If `SPEC.md` no longer exists (e.g., user deleted it during review), skip.

- [ ] **Step 6: Verify final state**

```powershell
Write-Output "=== docs/ root after archive ==="
Get-ChildItem C:\claude\littledata-mvp\docs -File | Select-Object -ExpandProperty Name
Write-Output "=== docs/_archive count ==="
Get-ChildItem C:\claude\littledata-mvp\docs\_archive -File | Measure-Object | Select-Object Count
Write-Output "=== root SPEC.md should be gone ==="
Test-Path C:\claude\littledata-mvp\SPEC.md
```

Expected: docs/ root contains only the 9 kept files listed above. _archive count is 45 (44 docs/ files + 1 renamed SPEC). `SPEC.md` returns `False`.

- [ ] **Step 7: Confirm commit with user**

Pause: "Littledata archive sweep ready (~45 file moves). Commit now?"

- [ ] **Step 8: Commit (after user approval)**

```powershell
Push-Location C:\claude\littledata-mvp
git commit -m "docs: archive stale docs/ and root SPEC.md

Moves 44 dated status txts, marketing one-shots, vendor PDFs, and
screenshots from docs/ to docs/_archive/. Renames root SPEC.md to
docs/_archive/SPEC-pre-convention.md (predates the spec artifact
convention; preserved for history)."
Pop-Location
```

Expected: clean commit.

---

## Self-Review Notes

**Spec coverage check:**
- Spec goal 1 (uniform structure across 3 projects) → Tasks 2, 5, 8 add identical convention block. ✓
- Spec goal 2 (encoded in CLAUDE.md and AGENTS.md) → Tasks 2, 5, 8. ✓
- Spec goal 3 (existing docs archived not deleted) → Tasks 3, 6, 10 use `git mv` only. ✓
- Spec success criterion 1 (identical "Feature Spec Convention" section in all CLAUDE.md files) → enforced by reusing the canonical block from this plan's "Canonical Convention Block" section.
- Spec success criterion 2 (AGENTS.md references same convention) → Tasks 2, 5, 8 step 2.
- Spec success criterion 3 (`docs/_archive/` exists in each project, files moved not deleted) → Tasks 3, 6, 10.
- Spec success criterion 4 (next non-trivial feature produces full artifact folder without prompting) → not directly verifiable; emerges from convention being present in CLAUDE.md.
- Spec coordination note (littledata archive deferred during feature review) → Task 10 is explicitly deferred with a confirm-before-proceed gate.

**Placeholder scan:** no TBD / TODO / "implement later" patterns. All commands and file lists are concrete.

**Type consistency:** N/A (no code).

**Risks acknowledged:** untracked image files in littledata may fail `git mv` — Task 10 step 4 loop continues on failure with explicit fallback note.
