---
title: MemPalace Local AI Memory Setup
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-12
---
# Implementation Plan: MemPalace Local AI Memory for Spectatr

Set up MemPalace as a persistent local AI memory system for Spectatr development. The goal is to give GitHub Copilot and other local agents (Claude Code, Cursor) searchable access to past architecture decisions, implementation reasoning, and debugging sessions — so context lost between chat sessions can be recovered semantically rather than re-explained every time.

**Repository:** https://github.com/MemPalace/mempalace  
**Install:** `pip install mempalace`  
**Storage:** Local only — ChromaDB + SQLite, no cloud, no API key required

---

## Why This Helps Spectatr

Spectatr has a deep, growing knowledge base:
- Complex multi-tenancy decisions (RLS + Prisma dual-layer)  
- Auth design (Clerk, provider-agnostic IDs, JWT middleware)  
- League rules system (format vs game mode, MVP vs Phase 2 scope)  
- tRPC patterns, checksum polling, BullMQ jobs  
- Theme system token conventions  

These decisions live in past AI conversations and are lost between sessions. MemPalace stores them verbatim and makes them searchable via MCP tools — so instead of re-attaching `copilot-instructions.md` and re-explaining context, Copilot can call `mempalace_search` automatically.

---

## Architecture

```
Past AI Conversations (Claude, Copilot, ChatGPT exports)
  → mempalace mine → ChromaDB (local verbatim storage)
        │
        ├── wing_spectatr
        │     ├── hall_facts      (decisions locked in)
        │     ├── hall_events     (debug sessions, milestones)
        │     ├── hall_discoveries (breakthroughs, new patterns)
        │     └── hall_preferences (coding style, library choices)
        │           ├── room: multi-tenancy
        │           ├── room: auth-clerk
        │           ├── room: trpc-patterns
        │           ├── room: league-rules
        │           ├── room: theme-system
        │           └── room: database-migrations
        │
MCP Server (19 tools) → VS Code Copilot Chat / Claude Code
  mempalace_search "why RLS only on spectatr_app role?"
  → verbatim answer from past session
```

---

## Tasks

### 1. Prerequisites

- [ ] Confirm Python 3.9+ is installed: `python --version`
- [ ] Install MemPalace: `pip install mempalace`
- [ ] Verify: `mempalace --version` (expect 3.x)

### 2. Initialise the Palace

Run guided onboarding to create the palace structure and identity file:

```bash
mempalace init C:\Users\CraigJackson\.mempalace\spectatr
```

During `init` you will be asked for:
- **Your name** — Craig Jackson
- **Projects** — spectatr
- **People you work with** — leave empty or add collaborators

This generates:
- `~/.mempalace/identity.txt` — Layer 0 context (who you are, what you work on)
- `~/.mempalace/wing_config.json` — Maps `spectatr` to `wing_spectatr`
- `~/.mempalace/config.json` — Global config

**After init, edit `~/.mempalace/identity.txt`** to add Spectatr-specific facts:

```
Craig Jackson — senior developer on Spectatr, a multi-sport fantasy sports platform.
Primary stack: React 18, MUI v7, tRPC, Prisma, PostgreSQL, Clerk, Zustand, TanStack Query.
Repository: C:\Users\CraigJackson\source\repos\craigj\spectatr
Current focus: squad building, field visualization, frontend-backend integration.
Key constraints: MUI only (no custom CSS), sport-agnostic design, shared Zod validation, strict TypeScript.
```

### 3. Mine the Spectatr Codebase

Index docs, plans, and config files so past decisions embedded in markdown are searchable:

```bash
# Mine all markdown documentation and plans
mempalace mine C:\Users\CraigJackson\source\repos\craigj\spectatr --wing spectatr

# This picks up:
#   ARCHITECTURE.md, PRODUCT.md, CONTRIBUTING.md, CLAUDE.md
#   .github/copilot-instructions/*.md
#   .github/copilot-instructions/plans/*.md
#   docs/*.md, packages/*/README.md
```

### 4. Mine Past AI Conversations

#### Claude Code sessions (confirmed — ~2MB of Spectatr sessions)

Claude Code stores full session transcripts as JSONL files. The Spectatr project has 6 sessions from late March 2026:

```
C:\Users\CraigJackson\.claude\projects\C--Users-CraigJackson-source-repos-craigj-spectatr\
  2d24b379-7e8b-4728-bc36-bc7e8e0b5cfa.jsonl  (724 KB)
  e5e6335d-798b-4fff-af34-fcad53eeab9b.jsonl  (639 KB)
  57ab978d-9a79-40d2-bfbb-f64a71de7a4e.jsonl  (459 KB)
  a9a0331f-be5d-4b48-b207-14839e04f5f0.jsonl  (111 KB)
  6a94f0d2-095f-4e2e-b6bb-3fba89f87391.jsonl   (25 KB)
  c6aefea1-2333-42d2-b27c-d8e6641c8a5c.jsonl    (4 KB)
```

Mine them:
```bash
mempalace mine "C:\Users\CraigJackson\.claude\projects\C--Users-CraigJackson-source-repos-craigj-spectatr" --mode convos --wing spectatr
```

There is also a second Claude Code project (`sr-2026`) this is a seperate project and can added to a different wing.
```bash
mempalace mine "C:\Users\CraigJackson\.claude\projects\C--Users-CraigJackson-source-repos-craigj-sr-2026" --mode convos --wing spectatr
```

#### VS Code Copilot Chat (not available — history was cleared)

The spectatr workspace storage folder (`d5a0b770129da1bf9072374f4e599ab2`) has existed since 22/02/2026 but `chat-session-resources` only contains 2 sessions from today. The older Copilot sessions were cleared and are not recoverable from disk — VS Code Copilot does not back up deleted sessions.

> **Note on work separation:** All LawVu workspace folders (`LawVuUI`, `LawVuGmailAddin`, `LawVuAuth`, `LawVuWeb`, `LawVuMCP`, etc.) were identified and confirmed excluded. No work content was accessed.

The `sr-2026` workspace (`2872329daeeaa7d4a1886f90543bbcce`) also has an empty `chat-session-resources` folder — no usable sessions there either.

**Conclusion:** Claude Code JSONL files are the only recoverable Copilot-era conversation history.

#### Claude Desktop app

Claude Desktop (`%APPDATA%\Claude`) only stores `claude_desktop_config.json` locally — **conversations are cloud-only and not accessible on disk**. Export from claude.ai if needed (Settings → Export data).

#### ChatGPT (if applicable)
Download from: https://chat.openai.com → Settings → Data controls → Export data

### 5. Verify the Palace

```bash
mempalace status
mempalace search "multi-tenancy RLS" --wing spectatr
mempalace search "why tRPC" --wing spectatr
mempalace search "league format" --wing spectatr
```

Expect relevant results from mined docs if chat exports aren't available yet.

### 6. Set Up MCP Server (Primary Integration)

Add MemPalace as an MCP server so Copilot Chat can call `mempalace_search` automatically:

**Option A — VS Code `settings.json` (recommended for Copilot):**

```json
{
  "mcp": {
    "servers": {
      "mempalace": {
        "command": "python",
        "args": ["-m", "mempalace.mcp_server"]
      }
    }
  }
}
```

**Option B — Claude Code plugin (if using Claude Code):**
```bash
claude plugin marketplace add milla-jovovich/mempalace
claude plugin install --scope user mempalace
```

Once wired, Copilot/Claude will call `mempalace_search` automatically when you ask questions like:
- "Why did we pick tRPC over NestJS?"
- "What's the RLS policy for user_leagues?"
- "What's the multi-tenancy isolation strategy?"

### 7. Configure Wing for Spectatr Rooms

Edit `~/.mempalace/wing_config.json` to add keyword mapping for Spectatr-specific topics:

```json
{
  "default_wing": "wing_spectatr",
  "wings": {
    "wing_spectatr": {
      "type": "project",
      "keywords": [
        "spectatr", "fantasy", "rugby", "trc", "super-2026",
        "tRPC", "Prisma", "Clerk", "MUI", "Zustand",
        "league", "squad", "player", "tenant"
      ]
    }
  }
}
```

### 8. Ongoing Usage — Mine New Sessions

After significant Copilot/Claude sessions, re-mine to keep the palace current:

```bash
# Re-mine the repo docs (picks up new plan files, updated architecture notes)
mempalace mine C:\Users\CraigJackson\source\repos\craigj\spectatr --wing spectatr

# Mine new conversation exports
mempalace mine <new-exports-path> --mode convos --wing spectatr
```

---

## Key MCP Tools Available After Setup

| Tool | Use case |
|---|---|
| `mempalace_search` | Semantic search — "why did we choose X?" |
| `mempalace_kg_query` | Entity relationships — "what decisions involved Clerk?" |
| `mempalace_list_rooms` | Browse topic rooms in `wing_spectatr` |
| `mempalace_traverse` | Walk related rooms from a starting topic |
| `mempalace_status` | Check palace health and room counts |

---

## Wake-Up Context (for new sessions without MCP)

When starting a fresh Copilot chat where MCP isn't available, generate a context snippet:

```bash
mempalace wake-up --wing spectatr > spectatr-context.txt
```

Paste `spectatr-context.txt` content into the chat. ~170 tokens of critical project facts.

---

## Notes

- **Raw mode only** — do not enable AAAK compression for now. It currently regresses recall (84.2% vs 96.6%). Use verbatim raw storage.
- **No cloud required** — all storage is local ChromaDB + SQLite in `~/.mempalace/`
- **Windows path note** — MemPalace uses `~` expansion; if paths fail, use fully qualified `C:\Users\CraigJackson\.mempalace\`
- **Fake websites** — MemPalace has no official website as of April 2026. Install only via `pip install mempalace` or the GitHub repo.
- Contradiction detection (`fact_checker.py`) is not yet wired into KG operations — don't rely on it yet (tracking in upstream Issue #27)
- If `mempalace mcp` fails on Windows, try: `python -m mempalace.mcp_server` directly

## Success Criteria

- [ ] `mempalace status` shows `wing_spectatr` with rooms populated
- [ ] `mempalace search "tRPC" --wing spectatr` returns relevant results
- [ ] MCP server connects in VS Code (Copilot can call `mempalace_search` tools)
- [ ] `identity.txt` reflects Spectatr project context
- [ ] Past conversation exports (if available) are mined and searchable
