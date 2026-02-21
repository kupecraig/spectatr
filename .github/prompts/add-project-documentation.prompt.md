---
name: Update Project Documentation from Branch
description: Analyzes Git branch changes and updates project documentation following VS Code Context Engineering principles
---

# Update Project Documentation from Branch Changes

## Objective

Analyze code changes in a Git branch and update project documentation to follow **VS Code Context Engineering** principles, ensuring AI coding agents have optimal, focused context without information overload.

https://code.visualstudio.com/docs/copilot/guides/context-engineering-guide - MUST READ

## VS Code Context Engineering Structure

Our project follows VS Code's recommended context engineering workflow:

### Core Documentation Files
- `.github/copilot-instructions.md` - **Entry point** for all AI agents (max 2 pages +- 50%)
- `PRODUCT.md` - Product vision and functionality (max 2 pages +- 50%)
- `ARCHITECTURE.md` - System architecture and patterns (max 2 pages +- 50%)
- `CONTRIBUTING.md` - Developer guidelines (max 1 page +- 50%)

**All changes to core documentation should be kept concise as per VS Code guidelines.**

### Progressive Disclosure Hierarchy
```
Entry Point (.github/copilot-instructions.md)
  ↓ Links to specific contexts
Feature Guides (.github/copilot-instructions/mui.md, backend-api.md)
  ↓ Links to implementation details
Implementation Plans (.github/copilot-instructions/plans/plan-*.md)
  ↓ Detailed task breakdowns
```

### Workflow Artifacts
- `.github/agents/*.agent.md` - Custom AI agents (planning, implementation, review)
- `.github/prompts/*.prompt.md` - Reusable prompt workflows
- `.github/plan-template.md` - Template for implementation plans
- `packages/*/README.md` - Package-specific documentation

## Input Parameter

**Branch Name:** Specify the Git branch to analyze (e.g., `feature/FSA-123-backend-api`, `develop`, `main`)

## Instructions

### Step 1: Analyze Branch Changes

Use Git commands to identify what changed:

```powershell
# Get list of changed files
git diff --name-status {BRANCH_NAME}..HEAD

# Get detailed diff for each file
git diff {BRANCH_NAME}..HEAD -- {file_path}

# Get commit messages for context
git log {BRANCH_NAME}..HEAD --oneline --decorate
```

**Categorize changes:**
- ✅ **New Features** - Components, routers, endpoints, stores
- ✅ **Architecture Changes** - New patterns, tech stack, state management
- ✅ **Bug Fixes** - Corrections, edge cases
- ✅ **Refactoring** - Code reorganization, performance
- ✅ **Configuration** - Build tools, dependencies, environment
- ✅ **Testing** - Test patterns, coverage

### Step 2: Apply Context Engineering Principles

**Progressive Disclosure** - Start broad, link to details:
```
Entry Point (copilot-instructions.md) - "Backend uses tRPC" → Link
  ↓
Feature Guide (backend-api.md) - "Creating endpoints" → Link
  ↓
Implementation Plan (plan-backendApiSetup.md) - Step-by-step tasks
```

**Context Management:**
- ✅ **Start small** - Add only essential context, avoid information overload
- ✅ **Keep fresh** - Update docs as codebase evolves
- ✅ **Use isolation** - Separate concerns (planning, coding, testing)
- ✅ **Focus on decisions** - Why we chose X over Y

**Anti-Patterns to Avoid:**
- ❌ **Context dumping** - Excessive unfocused information
- ❌ **Inconsistent guidance** - Conflicting patterns across docs
- ❌ **Stale context** - Outdated information that misleads agents

### Step 3: Identify What to Update

For each change category, determine the appropriate documentation artifact:

**New Features → Update Entry Point + Create Guide (if complex)**
- Update `copilot-instructions.md` - Add to "Implementation Status"
- Create `.github/copilot-instructions/{feature}.md` if major feature
- Add usage examples to existing guides
- Create implementation plan in `plans/plan-{feature}.md`

**Architecture Changes → Update ARCHITECTURE.md + Consider Custom Agent**
- Document new patterns in `ARCHITECTURE.md`
- Update tech stack section in `copilot-instructions.md`
- Create `.github/agents/{purpose}.agent.md` if workflow warrants it
- Consider prompt file `.github/prompts/{task}.prompt.md` for reusable workflows

**API/Endpoint Changes → Create Feature Guide**
- Create `.github/copilot-instructions/backend-api.md` (if doesn't exist)
- Update endpoint lists with request/response examples
- Document validation rules
- Link from `copilot-instructions.md`

**Configuration Changes → Update SETUP.md + Package READMEs**
- Update `docs/SETUP.md` with setup instructions
- Document new environment variables
- Update `packages/{package}/README.md` for package-specific configs

### Step 4: When to Create Each Artifact Type

**Custom Agent** (`.github/agents/*.agent.md`) when:
- Workflow requires specific tools (e.g., read-only for planning)
- Persona needs different behavior (e.g., TDD implementation agent)
- Multi-turn process with handoffs between agents
- Example: `plan.agent.md`, `implement.agent.md`, `review.agent.md`

**Prompt File** (`.github/prompts/*.prompt.md`) when:
- Reusable workflow invoked via slash command
- Variant of existing agent workflow
- Quick task without needing full agent
- Example: `/plan-qna`, `/update-docs`, `/generate-tests`

**Implementation Plan** (`.github/copilot-instructions/plans/plan-*.md`) when:
- Complex feature requiring multiple steps
- Need to track progress over time
- Architectural decisions need documentation
- Use `plan-template.md` as base structure

**Feature Guide** (`.github/copilot-instructions/*.md`) when:
- New pattern emerges (e.g., MUI usage, tRPC patterns)
- Detailed examples needed for complex usage
- Multiple related decisions to document
- Keep focused (max 2 pages)

### Step 5: Update Documentation Files

**1. Entry Point** (`.github/copilot-instructions.md`) - Keep under 2 pages:
   - Update "Current Implementation Status" section
   - Add links to new feature guides in "Key Documentation"
   - Update "Quick Reference" with new plans/prompts
   - **Remember:** Brief overview + links, not full details

**2. Core Docs** (PRODUCT.md, ARCHITECTURE.md, CONTRIBUTING.md) - Max 2 pages each:
   - `PRODUCT.md` - User-facing features, game modes, business rules
   - `ARCHITECTURE.md` - Tech stack, patterns, state management decisions
   - `CONTRIBUTING.md` - Coding standards, component patterns, testing requirements
   - **Focus on:** Why decisions were made, when to use patterns

**3. Feature Guides** (`.github/copilot-instructions/*.md`):
   - Create for major features (e.g., `mui.md`, `backend-api.md`)
   - Include practical examples with DO/DON'T patterns
   - Keep task-oriented ("How to create an endpoint" not "Endpoint structure")
   - Link back from entry point

**4. Implementation Plans** (`.github/copilot-instructions/plans/plan-*.md`):
   - Use `plan-template.md` structure
   - Mark completed tasks with ✅
   - Document open questions and decisions made
   - Archive when complete by moving to status summary

**5. Custom Agents** (`.github/agents/*.agent.md`):
   - Define persona and workflow
   - Specify allowed tools
   - Add handoffs to other agents
   - Document when to use this agent

**6. Prompt Files** (`.github/prompts/*.prompt.md`):
   - Define slash command behavior
   - Link to relevant agents if applicable
   - Keep workflow focused on single task
   - Add description for discoverability

**7. Package READMEs** (`packages/*/README.md`):
   - API documentation for that package
   - Setup/installation specific to package
   - Directory structure if non-standard

### Step 6: Format with VS Code Patterns

**Standard Documentation Template:**
```markdown
## [Feature/Pattern Name]

**When to use:** [1-2 sentences on when this applies]

**Overview:** [2-3 sentences explaining concept]

### Implementation

[Step-by-step or code examples]

✅ **DO:**
- [Best practice with example]
- [Another pattern]

❌ **DON'T:**
- [Anti-pattern with explanation why]

### Example

\`\`\`typescript
// Complete, runnable example with context
import { ... } from '...';

// Implementation
\`\`\`

### Related
- [Cross-reference](path/to/file.md#section)
```

**Code Examples Must:**
- Be complete and runnable (not pseudocode)
- Include necessary imports
- Have inline comments explaining why
- Show both ✅ DO and ❌ DON'T patterns

**Cross-References Should:**
- Link to specific sections: `[Topic](file.md#section-name)`
- Provide context: "See [Backend API Setup](plans/plan-backendApiSetup.md#step-4) for endpoint creation"
- Use relative paths for workspace files

### Step 7: Validate Documentation Quality

**Context Engineering Success Metrics:**
- ✅ **Reduced back-and-forth** - Agent understands context without clarification
- ✅ **Consistent code quality** - Generated code follows established patterns
- ✅ **Faster implementation** - Less time explaining requirements
- ✅ **Better decisions** - Agent suggests solutions aligned with project goals

**Validation Checklist:**
- [ ] All changed files referenced in at least one doc
- [ ] No broken links (test relative paths)
- [ ] Consistent terminology ("squad" not "team" for real-world teams)
- [ ] Code examples compile and run
- [ ] Sport-agnostic language (no rugby-specific in generic docs)
- [ ] Implementation plans marked ✅ if complete
- [ ] Entry point under 2 pages
- [ ] Core docs (PRODUCT, ARCHITECTURE, CONTRIBUTING) under 2 pages each
- [ ] Progressive disclosure maintained (entry → guides → plans)
- [ ] No context dumping (excessive unfocused information)

**Quick Validation Commands:**
```powershell
# Check markdown link format
Get-ChildItem -Recurse -Filter *.md | Select-String -Pattern '\[.*\]\([^)]+\)'

# Count lines in core docs (should be <100 lines each for ~2 pages)
Get-Content .github/copilot-instructions.md | Measure-Object -Line
Get-Content PRODUCT.md | Measure-Object -Line
Get-Content ARCHITECTURE.md | Measure-Object -Line
Get-Content CONTRIBUTING.md | Measure-Object -Line
```

### Step 8: Create Update Summary

Generate concise summary (do NOT create a new file unless specifically requested):

```markdown
## Documentation Updates - {BRANCH_NAME}

### Changes Analyzed
- {N} files changed
- {X} new features, {Y} architecture changes, {Z} bug fixes

### Documentation Updated
**Entry Point:**
- Added {feature} to Implementation Status
- Linked to new {guide-name} guide

**Core Docs:**
- ARCHITECTURE.md: Documented {pattern}, added {technology}
- PRODUCT.md: Updated {feature-list}
- CONTRIBUTING.md: Added {coding-standard}

**New Artifacts:**
- `.github/copilot-instructions/{guide}.md` - {Purpose}
- `.github/agents/{agent}.agent.md` - {Workflow description}
- `.github/prompts/{prompt}.prompt.md` - {Task description}

### Key Improvements
- Progressive disclosure for {complex-feature}
- Code examples for {pattern}
- Fixed {N} broken links
- Reduced {doc} from {X} to {Y} pages

### Success Metrics
- ✅ Entry point under 2 pages
- ✅ Progressive disclosure maintained
- ✅ All code examples tested
- ✅ No context dumping
```

## Example Workflow

**Input:** `feature/FSA-13-backend-api-setup`

**Step 1:** Analyze branch changes
```powershell
git diff develop..feature/FSA-13-backend-api-setup --name-status
# Output: 50 files (backend/, docker-compose.yml, prisma schema, etc.)
```

**Step 2:** Apply context engineering principles
- Use progressive disclosure: Entry point → Backend guide → Implementation plan
- Focus on decision context: Why tRPC? (Type safety, zero boilerplate)
- Avoid context dumping: Don't document every endpoint, show patterns

**Step 3:** Identify what to update
- **Entry point** needs backend reference
- Create **`.github/copilot-instructions/backend-api.md`** for patterns
- Update **`ARCHITECTURE.md`** with tRPC decision
- Mark **`plans/plan-backendApiSetup.md`** tasks as ✅
- Create **`packages/server/START.md`** for quick start (package-specific)

**Step 4:** Determine artifact types needed
- No new agent needed (plan/implement agents already exist)
- Could create prompt: `.github/prompts/create-endpoint.prompt.md` for reusable endpoint creation
- Implementation plan exists, just needs completion markers

**Step 5:** Update files (examples)

**Entry Point** (`.github/copilot-instructions.md`):
```markdown
## Current Implementation Status

**Completed:**
- ✅ Backend API with tRPC - See [Backend API Guide](copilot-instructions/backend-api.md)
- ✅ Multi-tenant architecture
- ✅ Checksum-based polling system

## Quick Reference

**Implementation Plans:**
- [Backend API Setup](copilot-instructions/plans/plan-backendApiSetup.md) - ✅ Complete
```

**Feature Guide** (`.github/copilot-instructions/backend-api.md`):
```markdown
# Backend API - tRPC Patterns

**When to use:** All API communication between frontend and backend

**Overview:** Type-safe RPC framework with end-to-end TypeScript types.

### Creating an Endpoint

✅ **DO:** Use baseProcedure with Zod validation
\`\`\`typescript
export const playersRouter = router({
  list: baseProcedure
    .input(z.object({ position: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.player.findMany({
        where: { position: input.position, tenantId: ctx.tenantId }
      });
    })
});
\`\`\`

❌ **DON'T:** Bypass tenant isolation
\`\`\`typescript
// Missing tenantId filter - cross-tenant data leak!
return await ctx.prisma.player.findMany();
\`\`\`

### Related
- [Implementation Plan](plans/plan-backendApiSetup.md#step-5)
- [Quick Start Guide](../../packages/server/START.md)
```

**Architecture Update** (ARCHITECTURE.md):
```markdown
## Backend (Planned → Implemented)

**Framework: tRPC** - End-to-end type safety
- Automatic TypeScript types server→client
- Uses Zod schemas from `@spectatr/shared-types`
- Native TanStack Query integration
- Zero boilerplate for monorepo

See [Backend API Guide](.github/copilot-instructions/backend-api.md) for patterns.
```

**Step 6:** Format with VS Code patterns
- Used template structure (When to use, Overview, Implementation, DO/DON'T)
- Code examples are complete and runnable
- Cross-references link to specific sections
- Progressive disclosure: Entry point (1 line) → Guide (detailed)

**Step 7:** Validate
```powershell
# Check page lengths
Get-Content .github/copilot-instructions.md | Measure-Object -Line
# Output: 145 lines (~1.5 pages) ✅

Get-Content ARCHITECTURE.md | Measure-Object -Line  
# Output: 180 lines (~2 pages) ✅
```
- All links tested ✅
- No context dumping ✅
- Sport-agnostic language ✅
- Implementation plan marked complete ✅

**Step 8:** Summary
```
## Documentation Updates - feature/FSA-13-backend-api-setup

### Changes Analyzed
- 50 files changed
- Added: Backend package, tRPC, Prisma, Docker, rate limiting

### Documentation Updated
- **copilot-instructions.md**: Added backend to status, linked to guide
- **ARCHITECTURE.md**: Documented tRPC decision, multi-tenant pattern
- **Created backend-api.md**: tRPC patterns, tenant isolation examples
- **packages/server/START.md**: Quick start guide (package-specific)
- **plan-backendApiSetup.md**: Marked all 11 tasks ✅ complete

### Key Improvements
- Progressive disclosure (1 line → guide → plan)
- Focused on decision context (why tRPC)
- No context dumping (patterns, not exhaustive docs)
```

## Output Format

Provide a summary of:
1. Files analyzed from branch
2. Documentation artifacts updated/created
3. Validation results (page lengths, links, anti-patterns)
4. Success metrics (reduced back-and-forth, consistent patterns)

**Remember:** Update existing docs in place. Only create new files for feature guides, agents, or prompts when warranted.

## Success Criteria

**VS Code Context Engineering Principles Applied:**
- [ ] **Progressive disclosure** - Entry point → Guides → Plans hierarchy maintained
- [ ] **Start small** - Entry point under 2 pages, core docs under 2 pages each
- [ ] **Focus on decisions** - Document why choices were made, not just what exists
- [ ] **Task-oriented** - Organized by "what to do" not "what exists"
- [ ] **Consistent patterns** - Use templates, terminology aligned across docs
- [ ] **No context dumping** - Focused, relevant information only
- [ ] **Living documents** - Existing docs updated vs creating redundant new ones

**Technical Quality:**
- [ ] All branch changes reflected in documentation
- [ ] Code examples complete, tested, and runnable
- [ ] Cross-references use specific sections (#anchors)
- [ ] No broken links (test all relative paths)
- [ ] Sport-agnostic language maintained (no rugby-specific in generic docs)
- [ ] Implementation plans marked ✅ if tasks complete

**Artifact Appropriateness:**
- [ ] Custom agents created only when workflow warrants (tools, persona, handoffs)
- [ ] Prompt files for reusable slash commands
- [ ] Feature guides for complex patterns (tRPC, MUI, validation)
- [ ] Implementation plans follow `plan-template.md` structure

**Success Metrics** (from VS Code guide):
- [ ] **Reduced back-and-forth** - Agent doesn't need clarification
- [ ] **Consistent quality** - Generated code follows patterns
- [ ] **Faster implementation** - Less context explanation needed  
- [ ] **Better decisions** - Agent suggests aligned solutions

**Validation Evidence:**
```powershell
# Provide line counts
.github/copilot-instructions.md: {N} lines (~{X} pages)
PRODUCT.md: {N} lines (~{X} pages)
ARCHITECTURE.md: {N} lines (~{X} pages)
CONTRIBUTING.md: {N} lines (~{X} pages)

# Report
✅ Entry point concise with links to details
✅ No context dumping detected
✅ Progressive disclosure hierarchy intact
✅ All code examples tested
```

---

## Quick Reference: File Purposes

**Entry Point:**
- `.github/copilot-instructions.md` - Main entry for AI agents (max 2 pages, links to everything)

**Core Context (Max 2 pages each):**
- `PRODUCT.md` - Product vision, features, game modes, business rules
- `ARCHITECTURE.md` - Tech stack, patterns, state management, why decisions made
- `CONTRIBUTING.md` - Coding standards, component patterns, testing (max 1 page)

**Workflows:**
- `.github/agents/*.agent.md` - AI agent personas (plan, implement, review)
- `.github/prompts/*.prompt.md` - Slash command workflows
- `.github/plan-template.md` - Template for implementation plans

**Feature Guidance:**
- `.github/copilot-instructions/mui.md` - MUI usage patterns
- `.github/copilot-instructions/backend-api.md` - tRPC patterns (if exists)
- `.github/copilot-instructions/plans/plan-*.md` - Implementation plans with tasks

**Package-Specific:**
- `packages/*/README.md` - Package API, setup, directory structure
- `packages/server/START.md` - Quick start guide for backend
- `packages/ui/TESTING.md` - Testing strategy and patterns

**Setup/Reference:**
- `docs/SETUP.md` - Initial project setup instructions
- `docs/DATA_MODEL.md` - Database schema and relationships

**Remember:** Always update existing docs before creating new ones. Maintain progressive disclosure hierarchy. Keep entry point under 2 pages.