---
title: Remote Agentic Developer Flow Setup
version: 1.0
date_created: 2026-03-29
last_updated: 2026-03-29
---
# Implementation Plan: Remote Agentic Developer Flow

Set up the GitHub Copilot coding agent workflow so Copilot can be assigned issues and autonomously implement features and bug fixes in a remote environment. The agent needs a bootstrapped dev environment, structured inputs (issues), CI feedback, and guardrails that match Spectatr's development standards.

## Architecture and Design

### How the Remote Agent Flow Works

```
GitHub Issue (assigned to Copilot)
  → copilot-setup-steps.yml (installs deps, compiles)
  → Copilot reads issue body + copilot-instructions.md + agent files
  → Copilot implements changes in a new branch
  → CI runs (build + unit tests + Storybook)
  → Copilot opens PR using PULL_REQUEST_TEMPLATE.md
  → Human reviews
```

### What Controls Agent Quality

| Input | Purpose |
|---|---|
| `copilot-setup-steps.yml` | Gives the agent a working environment to run code |
| Issue template | Structures the spec the agent receives |
| `copilot-instructions.md` | Always-on project context (already in place) |
| `.github/agents/*.agent.md` | Agent modes (already in place) |
| CI workflow with build job | Lets agent verify its own changes compile and test |
| PR template | Structures agent's output for human review |
| MCP config | Gives remote agent access to MUI docs tool |

---

## Tasks

### ✅ 1. copilot-setup-steps.yml (COMPLETE)

Create `.github/workflows/copilot-setup-steps.yml`. This special workflow is called by the Copilot agent before it begins work. It must install all dependencies and verify the monorepo compiles.

**File:** `.github/workflows/copilot-setup-steps.yml`

```yaml
name: "Copilot Setup Steps"
on: workflow_call

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build shared-types
        run: npm run build --workspace=packages/shared-types

      - name: Type-check server
        run: npx tsc --noEmit
        working-directory: packages/server

      - name: Type-check UI
        run: npx tsc --noEmit
        working-directory: packages/ui
```

**Why build shared-types first:** The `server` and `ui` packages import from `@spectatr/shared-types`. If it hasn't been compiled, type-checks on both packages will fail with module-not-found errors.

---

### ✅ 2. Activate CI and add a build job (COMPLETE)

The current `test.yml` has a comment at the top saying it is an example — confirm it is saved at `.github/workflows/test.yml` (not `test.yml.example`). Add a `build` job that runs TypeScript compilation. Without it, Copilot cannot detect type errors before raising a PR.

Add this job to `test.yml`:

```yaml
  build:
    name: Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build shared-types
        run: npm run build --workspace=packages/shared-types
      - name: Type-check server
        run: npx tsc --noEmit
        working-directory: packages/server
      - name: Type-check UI
        run: npx tsc --noEmit
        working-directory: packages/ui
```

Make `unit-tests` depend on `build` so type errors are caught first:

```yaml
  unit-tests:
    needs: build
```

---

### ✅ 3. Issue Templates (COMPLETE)

Create two issue templates. The issue body is the agent's spec — structure matters.

**File:** `.github/ISSUE_TEMPLATE/feature.yml`

```yaml
name: Feature
description: New feature or enhancement
labels: ["feature"]
body:
  - type: markdown
    attributes:
      value: |
        Fill in all sections so Copilot has enough context to implement this without asking questions.

  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: What should be built? One paragraph.
    validations:
      required: true

  - type: textarea
    id: acceptance-criteria
    attributes:
      label: Acceptance Criteria
      description: Bulleted list of testable conditions that must be true when done.
      placeholder: |
        - [ ] User can ...
        - [ ] Validation shows ... error when ...
        - [ ] Component uses MUI Skeleton during loading
    validations:
      required: true

  - type: dropdown
    id: area
    attributes:
      label: Affected Area
      options:
        - UI (packages/ui)
        - Backend / tRPC (packages/server)
        - Shared Types / Validation (packages/shared-types)
        - UI + Backend (full stack)
        - DevOps / CI
    validations:
      required: true

  - type: textarea
    id: files
    attributes:
      label: Relevant Files / Components
      description: List any existing files, components, or stores that are involved.
      placeholder: |
        - packages/ui/src/features/players/
        - packages/server/src/trpc/routers/players.ts

  - type: textarea
    id: plan
    attributes:
      label: Implementation Plan (optional)
      description: Link to or paste the relevant plan document if one exists.

  - type: textarea
    id: notes
    attributes:
      label: Additional Notes
      description: Screenshots, design references, constraints.
```

**File:** `.github/ISSUE_TEMPLATE/bug.yml`

```yaml
name: Bug Report
description: Something is broken
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: What is broken?
      description: Describe the bug clearly.
    validations:
      required: true

  - type: textarea
    id: repro
    attributes:
      label: Steps to Reproduce
      placeholder: |
        1. Go to ...
        2. Click ...
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behaviour
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behaviour
    validations:
      required: true

  - type: dropdown
    id: area
    attributes:
      label: Affected Area
      options:
        - UI (packages/ui)
        - Backend / tRPC (packages/server)
        - Shared Types / Validation (packages/shared-types)
        - UI + Backend
    validations:
      required: true

  - type: textarea
    id: files
    attributes:
      label: Relevant Files
      description: Files likely involved in the bug.

  - type: textarea
    id: notes
    attributes:
      label: Additional Notes
      description: Error messages, screenshots, console output.
```

---

### ✅ 4. Pull Request Template (COMPLETE)

Create `.github/PULL_REQUEST_TEMPLATE.md`. Copilot uses this when opening its PR. Align it with the `CONTRIBUTING.md` code review checklist so Copilot self-documents against project standards.

**File:** `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Summary

<!-- What was changed and why -->

## Related Issue

Closes #

## Changes

<!-- List the key files/components changed -->

## Testing Evidence

<!-- Describe how the changes were tested. Include test names or paste CI output. -->

## Checklist

- [ ] MUI only — no custom CSS frameworks
- [ ] All colours and typography from theme tokens
- [ ] Skeleton loading states added for async content
- [ ] Zod validation from `@spectatr/shared-types`
- [ ] No `any` types — strict TypeScript only
- [ ] Sport-agnostic — no hardcoded rugby positions or squad sizes
- [ ] Unit tests added/updated for new business logic
- [ ] Storybook stories added/updated for new components
- [ ] No `console.log` statements
- [ ] Responsive design tested (mobile + desktop)
```

---

### 5. MCP Configuration for Remote Agent (if MUI MCP server is accessible remotely)

If the `mui-mcp` server is only running locally, the remote Copilot agent won't have access to it despite the instruction in `copilot-instructions/mui.md` to call `useMuiDocs` and `fetchDocs`. Two options:

**Option A — Remote MCP server:** Create `.github/mcp.json` pointing to a hosted instance:
```json
{
  "mcpServers": {
    "mui": {
      "type": "http",
      "url": "https://your-mui-mcp-server/sse"
    }
  }
}
```

**Option B — Update MUI instructions for remote context:** If no hosted MCP is available, update `copilot-instructions/mui.md` to provide a fallback for when MCP tools are unavailable (e.g., fetch from `https://mui.com/material-ui/llms.txt` directly via the `fetch` tool). This prevents the agent from proceeding without MUI guidance.

Defer this task until the MUI MCP server situation is clarified.

---

## Open Questions

1. **Is `test.yml` currently active in CI?**
   - Context: The file has a comment saying "Copy to `.github/workflows/test.yml` to enable" — it may be a template that was never activated.
   - Decision: Verify the file path and GitHub Actions run history. If it hasn't been triggering, rename or move it.

2. **Is the MUI MCP server accessible outside localhost?**
   - Context: `copilot-instructions/mui.md` requires MCP tool calls. Remote agents can't reach a local server.
   - Options: Host the MUI MCP server, use a fallback fetch strategy, or remove the MCP dependency from the remote agent instructions.
   - Decision: Determine hosting approach before assigning MUI-heavy issues to the remote agent.

3. **Should the remote agent use the `implement` agent mode or default mode?**
   - Context: The `implement.agent.md` is designed for use in VS Code agent mode. It's not currently set as the default for issue-based work.
   - Options: Add an `AGENTS.md` file at the repo root that instructs Copilot to behave like the implement agent when working on issues (behaviour description, not an agent file reference).
   - Decision: Needed before assigning the first issue.

---

## Success Criteria

- [ ] `copilot-setup-steps.yml` exists at `.github/workflows/copilot-setup-steps.yml` and runs successfully
- [ ] `test.yml` is active (not a `.example`) and includes a `build` job
- [x] Feature and bug issue templates exist at `.github/ISSUE_TEMPLATE/`
- [x] PR template exists at `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] A test issue assigned to Copilot produces a compilable, tested PR
- [ ] PR checklist items match `CONTRIBUTING.md` standards

## Notes

- Official docs for `copilot-setup-steps`: https://docs.github.com/en/copilot/using-github-copilot/coding-agent/customizing-the-development-environment-for-githubs-copilot-coding-agent
- Docker services (PostgreSQL + Redis) are not available in the GitHub-hosted runner environment — backend integration tests that require a DB are not suitable for the remote agent's CI until a service container is configured in the workflow
