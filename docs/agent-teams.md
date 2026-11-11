# Agent teams: master reference

How to build an effective agent team for this repository. Read this before writing a team prompt.

- **Source:** [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
  (fetched 2026-11-10). The feature is experimental, so check the page again before relying on a
  detail here. Sections marked **Project** come from our own runs, not from the docs.
- Related: [WORKFLOW.md](../WORKFLOW.md) (the pipeline and its gates), [CLAUDE.md](../CLAUDE.md)
  (the rules every teammate loads), [testing.md](testing.md).

## 1. When to use a team

A team is several full Claude Code sessions: one **lead** and N **teammates**, each with its own
context window, talking to each other by name and sharing a task list.

| Use a team when                                        | Use one session or subagents when            |
| ------------------------------------------------------ | -------------------------------------------- |
| Parallel work adds value (research, review, debugging) | The work is sequential                       |
| Each teammate owns a separate piece or layer           | Several people would edit the same file      |
| Teammates must share findings or challenge each other  | Only the result matters, not the discussion  |
| Changes span frontend, backend and tests               | The ticket is small (the overhead is larger) |

| Compare       | Subagents                            | Agent teams                                  |
| ------------- | ------------------------------------ | -------------------------------------------- |
| Context       | Own window, result returns to caller | Own window, fully independent                |
| Communication | Report back to the caller            | Message each other directly                  |
| Coordination  | The main agent manages everything    | Shared task list plus messages               |
| Token cost    | Lower                                | Higher: each teammate is a Claude instance   |
| Best for      | Focused tasks                        | Work that needs discussion and collaboration |

The docs recommend starting with tasks that have clear boundaries and no code to write (review a
PR, research a library, investigate a bug) before parallel implementation.

## 2. Enable and start

1. Set the flag in `settings.json` (or the shell):

   ```json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

   Set it to `0` to turn teams off again; it takes effect without restarting. A project, local or
   `--settings` value of `1` overrides a user value of `0`, and managed settings win over all.

2. Use an **interactive** session. With `-p` (headless, Agent SDK) no teammates are spawned; a
   named subagent runs as an ordinary subagent.
3. Describe the task and the teammates in plain language. Claude may use subagents instead; if so,
   ask again and say "agent team" explicitly. Subagents and teammates share the same agent panel,
   so the panel alone does not prove a team formed.
4. **Side effect:** while teams are enabled, a subagent that Claude names launches as a teammate,
   even when you did not ask for a team, and without a confirmation.

### Display modes

| Mode         | What it is                                                          | Requirements             | Where it works                                  |
| ------------ | ------------------------------------------------------------------- | ------------------------ | ----------------------------------------------- |
| `in-process` | All teammates inside one terminal                                   | None (the default)       | Any terminal                                    |
| `auto`       | Split panes when already in tmux or iTerm2 + `it2`, else in-process | tmux or iTerm2           | Not VS Code terminal, Windows Terminal, Ghostty |
| `tmux`       | Split panes                                                         | tmux (best on macOS)     | Same limits as above                            |
| `iterm2`     | Native iTerm2 panes                                                 | `it2` CLI, Python API on | macOS only                                      |

Set it with `"teammateMode"` in `~/.claude/settings.json`, or per session with the experimental
`claude --teammate-mode <mode>`. **On Windows use `in-process`.** The docs do not say whether teams
work in the VS Code extension panel; run `claude` in a real terminal to be safe.

Agent panel keys (in-process): **Up/Down** select a teammate, **Enter** open its transcript and
message it, **Escape** clear the selection (or interrupt that teammate's turn when viewing it),
**x** stop the selected teammate, **Ctrl+T** toggle the task list. Idle rows hide 30 s after
the whole panel is idle and come back on the next turn; more than three idle rows collapse into
`N idle agents`.

## 3. Control the team

### Name the teammates, the model and the count

Say exactly what you want, and give the teammates names you can use later:

```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate.
```

A teammate's model comes from the first of these that applies: the model in the spawn prompt, then
the `model` of its agent definition (`inherit` = the lead's), then `CLAUDE_CODE_SUBAGENT_MODEL`,
then the lead's model. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes the env var win (v2.1.257+). A
model and fast mode are fixed at spawn. `teammateDefaultModel` was removed in v2.1.234.

### Reusable roles: subagent definitions

Define a role once in `.claude/agents/` and name it in the spawn request ("Spawn a teammate using
the test-spec-writer agent type"). What the teammate takes from the definition:

| Field               | Applied to a teammate?                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `tools`             | Yes. `SendMessage` and the Task tools are added for in-process teammates |
| `model`             | Yes, if the spawn prompt names no model                                  |
| `disallowedTools`   | In-process only (`SendMessage` and the Task tools stay)                  |
| `effort`            | In-process only                                                          |
| `autoCompactWindow` | In-process only (v2.1.296+)                                              |
| Body (the prompt)   | Appended to the default prompt (in-process) or replaces it (split pane)  |
| `skills`            | **No.** Teammates load skills from project and user settings             |
| `mcpServers`        | Split pane only. In-process teammates use project and user MCP config    |

Do not hand-write a team config: `~/.claude/teams/{team}/config.json` is runtime state and is
overwritten. There is no project-level team file. Roles live in agent definitions.

### Plan before implementing

A teammate spawned while the lead is in **plan mode** plans first and sends a plan approval request
to the lead. **If you did not change that teammate's permission mode, Claude Code approves the plan
as soon as it arrives, without the lead reading it.** If you press Shift+Tab to put a running
in-process teammate into plan mode, the lead reviews the plan and approves it or sends it back.
Either way **you are not asked**. If a human decision is needed, say in the prompt: "send the plan to
me and wait for my OK before any edit".

### Talk to teammates

Each teammate is a full session. Message it from the panel (Enter) or by clicking its pane. While
you view an in-process teammate, plain text and skills go to it; built-in commands go to the lead.
`/compact`, `/clear` and `/rewind` act on the lead (you are asked to confirm), and `/model` and
`/fast` do not run from that view.

### Tasks

The lead creates tasks; teammates work through them. States: pending, in progress, completed, and
blocked by dependencies (a teammate does not self-claim a blocked task; you or the lead can still
assign it). Claiming uses file locking. Agents without the Task tools coordinate by messages only.
Ask the lead to split work finer if it makes too few tasks: **5 to 6 tasks per teammate** keeps
everyone busy and lets the lead reassign. Task state can lag (a finished task not marked
complete blocks its dependents); check the work and nudge.

### Shut down

"Ask the reviewer teammate to shut down." The teammate can approve or reject with a reason, and
finishes its current request first, so it can be slow. Shut teammates down when the work is done,
because they keep spending tokens until they exit. Team config is removed when the session ends;
`~/.claude/tasks/{team}/` stays (see `cleanupPeriodDays`).

### Quality gates with hooks

| Hook            | Fires when                      | Exit code 2 does                      |
| --------------- | ------------------------------- | ------------------------------------- |
| `TeammateIdle`  | A teammate is about to go idle  | Sends feedback, keeps it working      |
| `TaskCreated`   | A task is being created         | Blocks the creation, sends feedback   |
| `TaskCompleted` | A task is being marked complete | Blocks the completion, sends feedback |

A hook is the only real enforcement. A rule written in a prompt can be ignored.

## 4. How it works

| Component     | Role                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Lead**      | The session that spawns teammates and coordinates. Fixed for its lifetime                                        |
| **Teammates** | Separate Claude Code sessions with their own context                                                             |
| **Task list** | Shared work items, stored in `~/.claude/tasks/{team}/` (`{team}` = `session-` + first 8 chars of the session ID) |
| **Mailbox**   | One JSON inbox per agent: `~/.claude/teams/{team}/inboxes/{agent}.json`                                          |

- A message counts as sent only when the write to the recipient's inbox succeeds. Malformed
  entries are reported and removed.
- Teammates are delivered messages automatically; the lead does not poll. A finished teammate sends
  an idle notification with its final answer; a teammate that ends on an API error says so.
- Teammates can read the team config to find the other members' names.
- Tokens: a teammate's cache holds 5 minutes by default; `subagentPromptCacheTtl: "1h"` keeps it an
  hour at a higher write price.

### What a teammate knows

On spawn it loads the same project context as a normal session: **CLAUDE.md, MCP servers and
skills** (limited to the same `--setting-sources` as the lead). It gets the **spawn prompt** and
nothing else: the lead's conversation does not carry over. So the spawn prompt must carry the
ticket number, the files and worktree it owns, the contract it depends on and what "done" means.

### Permissions

- Teammates **start in the lead's permission mode**; you cannot set one per teammate at spawn
  (`dontAsk` becomes Manual for them). Shift+Tab on a teammate's view changes its mode.
- An in-process teammate that is not in plan mode **runs in the lead's mode** while the lead is in
  `acceptEdits`, `auto` or `bypassPermissions`, even if its status bar shows Manual. To make it ask,
  switch the lead to Manual too.
- Teammates obey the lead's live allow and deny rules (`--disallowedTools`, `--tools`,
  `--allowedTools`). A split-pane teammate does not get `--allowedTools`: put allow rules under
  `permissions.allow` in `--settings`.
- **Teammate permission prompts appear in the lead session**; approve them there. Pre-approve common
  commands in the permission settings before the run to avoid constant prompts.
- A message from another agent is marked as coming from another Claude session. A teammate cannot
  approve a prompt or give consent for the user, and cannot relay a denied action to another
  teammate to get around the check. In auto mode, an approval claim relayed by an agent is treated
  as untrusted input and each message is reviewed before delivery.

## 5. Writing a good team prompt

1. **Goal and end state first**, in one paragraph: what runs, where, and what proves it works.
2. **One owner per file set.** Two teammates on the same file overwrite each other. The docs only
   say "break the work so each owns different files"; they describe **no** per-teammate worktree.
   Give each teammate its own directory yourself (see section 6).
3. **Name the roles and what each may touch** (a read-only reviewer is a rule in the prompt or a
   `tools` list in its agent definition, not a permission mode).
4. **Define the handoffs as messages**: "when #43 is merged, message FE with the endpoint, the body
   and the status codes". A teammate that must wait says what it waits for.
5. **Give each teammate enough context**: task details, constraints, file paths, the contract. The
   lead's history is not shared.
6. **Size the tasks**: self-contained units with a clear deliverable (a function, a test file, a
   review). Too small and the overhead wins; too large and the work drifts unseen.
7. **Team size 3 to 5.** Three focused teammates often beat five scattered ones. Cost grows linearly
   with the number of active teammates; plan-mode teams were measured around 7 times a normal
   session. Use Sonnet for teammates.
8. **Say what the lead must not do**: "do not write code; wait for the teammates to finish before
   moving on" (the lead sometimes starts implementing itself).
9. **State the stop conditions** (CI red after 2 fixes, an unresolvable conflict, a change to the
   spec) and the final report you want.
10. **Monitor and steer.** A team left unattended for long risks wasted work. Teammates sometimes
    stop early on an error and the lead sometimes declares the work finished too soon; read the
    transcript and tell them to continue or spawn a replacement.

### Prompt skeleton

```text
Goal: <what exists when this is done, where it runs, how it is verified>.
Follow CLAUDE.md and WORKFLOW.md. Create a team of <3-5> teammates using Sonnet (in-process).
You are the lead: <what you do and do not do>.

1. <name> (<role>) -- <owns these paths / this worktree>. <the steps>. <message X when Y>.
2. <name> (<role>) -- <waits for the message from 1>. <the steps>.
3. <name> (<role>) -- <may write only these files>. <what it verifies and reports>.

Rules for everyone: <skills to call, branch and commit rules, gates, no-go list>.
Stop and ask me if: <conditions>.
Final deliverables (in chat): <PRs, test report, assumptions, decisions taken alone>.
```

Starter prompts that work well in the docs: a parallel review ("Spawn three teammates to review PR
#142: security, performance, test coverage"), and competing hypotheses ("Spawn 5 teammates to
investigate different hypotheses; have them try to disprove each other's theories; update the
findings doc with the consensus").

## 6. Project: how this repo maps onto teams

### Roles and skills

The team has no member called "lead": the session you type in is the lead.

| Role                       | Job                                                                 | Skills and agents                                                              |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Lead (the session)         | Clarify, branch, plan, assign, relay, watch the PRs; writes no code | `start-ticket`, `ticket-pack`, `pr-walkthrough`, `loop`, agent `code-explorer` |
| BE (API, database, devops) | `apps/api`, migrations, scripts; tests first                        | `ship`, `pr-description`, `triage-review`, `code-review`                       |
| FE                         | `apps/web`; tests first; integrate the API                          | `ship`, `pr-description`, `triage-review`, `bug-report` (for a bug)            |
| QA                         | Test matrix, run the checks, review PRs it did not write            | agents `test-spec-writer`, `code-quality`; `review-checklist`, `code-review`   |

Call skills **by name through the Skill tool** ("use the ship skill"). The docs confirm skills load
for teammates and that plain text and skills typed in a teammate's view go to it, but they do not
say that a typed slash command such as `/ship` runs inside a teammate. The `skills:` field of an
agent definition is ignored for teammates.

### Gates (WORKFLOW.md) versus a team

| WORKFLOW.md gate              | In a team                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Approve the plan              | The built-in plan approval is automatic unless you intervene. Say who approves in the prompt                               |
| Ask before branch/commit/push | The prompt answers it once ("you may branch, commit and push feature branches"), or each prompt reaches the lead's session |
| Ask before the PR             | Same: authorize in the prompt or approve in the lead session                                                               |
| The developer merges          | Keep it, or hand it over in the prompt (the pilot did; see below)                                                          |

CLAUDE.md says never to create a branch, commit or push without asking. A prompt that authorizes
it for the run is the developer's explicit decision; write it in the prompt, do not assume it.
**Never** relax the other rules: no commit to `main`, no `--no-verify`, no lowering the 80%
coverage threshold, no `Co-Authored-By` or "Generated with Claude Code" lines.

### Worktrees

The docs give a team one working directory. In this repo several tickets touch the same files
(`services/users.ts`, `controllers/users.ts`, `routes/users.ts`, `CHANGELOG.md`; fixed paths such
as `/bulk` and `/export` must be registered above `/:id`). So:

- The lead creates one worktree per ticket **before** spawning (`git worktree add ../wt-<n> -b
<type>/<n>-<slug> main`), runs `pnpm install` in each, and gives each its own `E2E_PORT`.
- A teammate edits only inside its worktree.
- Tickets that edit the same files merge in order; the next branch rebases after each merge.
- Pilot note: without that instruction the team worked in the main checkout.

### Handoffs

BE tells FE after each **merged** endpoint: path, request body, response shape and status codes
(SPEC §4). FE does not start the integration (#46) until #43, #44 and #45 are merged. QA reports to
the lead after each merge: lint, typecheck, `test:coverage`, `e2e`, and the manual run of the app.

### Pick tickets that fit

Good: independent endpoints, a bug in an unrelated area, a review. Poor: two tickets on the same
file in parallel, or the FE integration before its endpoints exist. Remaining plan: #43, #44,
#45 (BE), then #46 (FE); #54 is independent. #46 may need #47 (CI with Postgres) for E2E: have FE
stop and tell the lead if so.

### Checks a team must run

`pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm e2e` (see WORKFLOW.md → Checks). QA runs
them per worktree and again on `main` after each merge. After a merge the lead follows
[loop.md](../loop.md) until the Deploy run and the production URL are checked.

## 7. Limitations and failure modes

| Limitation / risk                                         | What to do                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| No resume for in-process teammates (`/resume`, `/rewind`) | Tell the lead to spawn new teammates                                      |
| Task status lags                                          | Check the work, update the task or nudge the teammate                     |
| Slow shutdown                                             | The teammate finishes its current request first                           |
| One team per session, no nested teams                     | Only the lead manages the team                                            |
| Lead fixed for the session                                | Cannot promote a teammate                                                 |
| No per-teammate permission mode at spawn                  | Restrict by `tools` or by prompt; switch the lead to Manual to force asks |
| A teammate's own subagents run in the foreground          | `background: true` fails for them                                         |
| Split panes need tmux or iTerm2                           | Use in-process on Windows                                                 |
| Teammates stop early on an error                          | Read the transcript, redirect, or spawn a replacement                     |
| The lead finishes too soon, or starts coding              | "Wait for your teammates to complete their tasks before proceeding"       |
| Too many permission prompts                               | Pre-approve common commands in the permission settings before the run     |
| Orphaned tmux session                                     | `tmux ls`, then `tmux kill-session -t <name>`                             |
| Teammates not visible                                     | Check the panel (a hidden idle row is not stopped); message it by name    |
| Teams form when you did not ask                           | Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `0`                         |

## 8. Pilot log

Keep a line per run so the next prompt improves.

| Date       | Tickets | Result                                                                                     | Lessons                                                                                                                                            |
| ---------- | ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | #42     | PR #63 merged by the team (CI green, Deploy running); issue closed; extra issue #64 opened | Team worked in the main checkout (no worktree); curl evidence not attached; ask for the final report to list assumptions and decisions taken alone |

## 9. Checklist before pressing Enter

- [ ] Teams enabled and the session is interactive; display mode `in-process`.
- [ ] Tickets chosen so that no two teammates edit the same files at the same time.
- [ ] Worktrees created, `pnpm install` run, distinct `E2E_PORT`.
- [ ] Each role has: owned paths, skills to call, handoff messages, what it must not touch.
- [ ] The gates are decided in the prompt: who approves plans, who may commit, push, open and merge.
- [ ] Stop conditions and the final report format are written.
- [ ] Permission rules for common commands are pre-approved; you know prompts arrive in the lead.
- [ ] 3 to 5 teammates, Sonnet, teammates shut down at the end.
