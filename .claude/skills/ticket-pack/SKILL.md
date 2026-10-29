---
name: ticket-pack
description: Turn a rough requirement, client message or feature idea into a ticket pack - user story, Given/When/Then acceptance criteria, out of scope, test plan and prioritised open questions - and run the zero-questions test on it. Use when asked to write, split, refine or review a ticket/story/issue from a requirement, or before opening a Feature issue.
tools: Read, Grep, Glob
user-invocable: true
---

# Ticket Pack

Turns a raw requirement into tickets a developer and a tester can start on **without asking
anything**. That claim is the quality bar, and the **zero-questions test** (step 5) makes it
measurable.

It writes the pack. It does not create issues, branches or files unless the user asks.

## Usage

```
/ticket-pack <requirement text>        # from pasted text
/ticket-pack docs/some-request.md      # from a file
/ticket-pack #4                        # refine an existing issue
```

## 1. Gather context

1. Read the requirement in full. If it is an issue number, fetch it with the GitHub or GitLab tools.
2. Read the sources of truth: the spec (`docs/SPEC.md`),
   `CLAUDE.md`, and `WORKFLOW.md`. **Existing rules beat guesses.** If the spec already
   answers a question, do not ask it.
3. Read `.github/ISSUE_TEMPLATE/feature.md` and follow its sections, so the pack can be pasted into
   an issue unchanged.
4. Note what the requirement touches that already exists (endpoints, schemas, screens) with Grep.

## 2. Split into tickets

- One ticket = one outcome that can be delivered, tested and reviewed on its own (one PR).
- Split when parts have different users, different risk, or can ship independently. Do not split
  by layer (UI / API / tests); every ticket is a vertical slice.
- Record dependencies between tickets explicitly ("F8 needs F7").
- Check SPEC "Out of scope". A request that touches it needs a spec change in the same ticket.

## 3. Write each ticket

Use these sections, in this order.

1. **Title**: verb phrase, outcome-focused (not "Implement endpoint").
2. **Story**: `As a <role>, I want <capability>, so that <benefit>.` The benefit is the real reason,
   from the requirement. If it is not stated, that is an open question, not something to invent.
3. **Background**: two or three sentences of context. Link the spec section.
4. **Acceptance criteria**: Given / When / Then, one behaviour each.
   - **Testable**: a tester can pass or fail it without interpretation. Replace "fast", "easy",
     "properly" with a number or an observable result.
   - **Concrete**: exact strings (toast text, labels), numbers (limits, counts) and status codes.
   - Cover, in this order: the happy path, validation and error cases, empty and boundary cases
     (0, 1, many, maximum), state changes (what happens to selection, page, filters, cache),
     partial failure and concurrency, then accessibility and responsiveness if the UI changes.
   - Number them (`AC1`, `AC2`...) so tests and questions can cite them.
5. **Out of scope**: what a reader might assume is included but is not.
6. **Test plan**: which acceptance criteria are covered by unit/component tests and which by an E2E
   journey. Follow the project test rules.
7. **Definition of done**: the checks from `WORKFLOW.md`, and the docs that must be updated.
8. **Open questions**: see step 4.

## 4. Write the open questions

A question is allowed only if the pack cannot be finished without the answer **and** the spec does
not answer it. Each one has:

- **ID and priority**
  - **Blocker**: work cannot start or finish (API contract, data loss, security).
  - **High**: changes behaviour or tests, but work can start.
  - **Medium**: edge case or wording.
  - **Low**: convention that has a sensible default.
- **Question**: one decision, answerable in a sentence. Never "what should happen?" without options.
- **Why it matters**: what breaks, or which AC or test depends on it.
- **Default if nobody answers**: your recommended answer. The reader can reply "confirmed" instead
  of writing prose. **Every question must have a default.**
- **Blocks**: the AC or ticket that waits for it.

Rules: ask the Blockers first, group related questions, and do not ask what the spec, the code or
the requirement already says. A long question list is a sign the requirement needs splitting, not
a sign of thoroughness.

## 5. Run the zero-questions test

Before output, read the pack as three people and try to start work. Write down every point where
you would need to ask something.

| Reader        | Can they...                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Developer** | build it with no further question? Is every API, field, string and state change defined? |
| **Tester**    | write a pass/fail test for every AC from the text alone, with exact expected values?     |
| **Client**    | recognise their own intent, and see every decision that was made for them?               |

Every gap found becomes either an AC (if you can decide it from the spec) or an open question with a
default. Then report the score:

- **Gaps found and fixed:** the number resolved into ACs.
- **Open questions left:** the number, by priority.
- **Verdict:** **Ready** (no Blockers or High left), **Ready with defaults** (only Medium/Low, defaults
  stated), or **Not ready** (a Blocker is open).

## 6. Quality checks (do not skip)

- [ ] Every AC is Given/When/Then with exact values, and numbered.
- [ ] No vague words left ("quickly", "user-friendly", "appropriate", "etc.", "and so on").
- [ ] Every number from the requirement appears in an AC (limits, counts, formats).
- [ ] Error, empty and partial-failure cases exist for every action.
- [ ] Every open question has a priority, a default and a "blocks".
- [ ] Out of scope is stated. Dependencies are stated.
- [ ] Nothing is invented: a decision the requirement does not support is a question or a default
      marked as one.

## Output format

```markdown
# Ticket pack: <requirement title>

**Source:** <message / issue / file> · **Tickets:** <n> · **Verdict:** Ready | Ready with defaults | Not ready

## Ticket 1: <title>

**Story:** As a ..., I want ..., so that ...

### Background

### Acceptance criteria

- **AC1** **Given** ... **When** ... **Then** ...

### Out of scope

### Test plan

- [ ] Unit / component: AC1, AC2
- [ ] E2E: AC1, AC3

### Definition of done

### Dependencies

## Open questions

| ID  | Priority | Question | Why it matters | Default if unanswered | Blocks |
| --- | -------- | -------- | -------------- | --------------------- | ------ |

## Zero-questions test

Gaps found and fixed: <n> · Open questions: <n> (Blocker <a>, High <b>, Medium <c>, Low <d>)
```

Write the pack in the language of the issue tracker (English for GitHub issues in this repo),
whatever language the requirement arrived in. Do not create issues or files yourself. Offer to do
it once the user has reviewed the pack.
