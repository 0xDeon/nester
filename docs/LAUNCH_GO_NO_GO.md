# Launch go/no-go checklist

**Status: template — owners and verification not yet filled in.** Issue
#1144 asks for this to be reviewed as a team before launch with named
owners; that review is a real meeting that needs to happen with the
actual team, which this pass can't perform. What follows is the checklist
structure — every launch-blocking condition this backlog has raised,
traceable to its issue — ready for owners to be assigned and verification
to be recorded against.

## Launch-blocking checklist

| Condition | Traces to | Owner | Verification method | Status |
|---|---|---|---|---|
| Support can inspect a user's money-path state without a DB console | #1141 | | Manually look up a test user via the money-path endpoint | |
| Support triage guide covers the top 4 report types | #1142 | | Guide reviewed by someone who will actually staff support | |
| Mainnet support contact channels and escalation SLAs defined | #1144 | | Escalation tree and SLAs reviewed and published in `docs/SUPPORT_ESCALATION.md` | |
| In-app problem report attaches context and shows it before sending | #1143 | | Manually trigger a report on staging, confirm no secrets in the payload | |
| Deposit UI shows a real simulated quote, not amount==shares | #1129 (nester) | | Deposit on testnet, compare quoted vs. actual shares received | |
| Contract tests exist for at least one core API response shape | #1130 (nester) | | `contracts.test.ts` passes in CI | |
| Every admin-gated contract entrypoint requires the caller's own signature | #1132 (nester) | | See `packages/contracts/AUTH_AUDIT.md` | |
| Deployed testnet contracts are verifiable against source | #1131 (nester) | | Follow `packages/contracts/scripts/VERIFY.md` against a real deployment | |
| Trace sampling won't drop the one failing request that matters | #457 (Trident) | | Trigger a deliberate error on staging, confirm its trace exports | |
| `/v1/` API contract is frozen with a stated versioning policy | #458 (Trident) | | `docs/API_STABILITY.md` (Trident repo) reviewed and published | |
| Full pre-launch verification checklist executed | #459 (Trident) | | `docs/LAUNCH_CHECKLIST.md` (Trident repo), all rows Pass | |
| Rollback rehearsed end-to-end with wall-clock time recorded | #460 (Trident) | | `docs/ROLLBACK_RUNBOOK.md` (Trident repo) rehearsal section completed | |

## Stage 1 scope freeze

Every contract change made after the audit candidate was cut invalidates part
of the audit, so scope is frozen for Stage 1.

- **Freeze date: 2026-10-30.** On this date the audit candidate commit is
  tagged `audit-candidate-1`. Feature work (savings goal features, rewards,
  referral, and anything else new) is not part of Stage 1 and does not merge
  to `packages/contracts/` after this point. It resumes after launch.
- **Change-control rule.** After the `audit-candidate-1` tag exists, a change
  to `packages/contracts/` may merge only if it is one of:
  1. a fix for a finding in the audit report, or
  2. a fix for a launch blocker recorded in the checklist above.
- **Every such PR must**
  - carry the `launch-fix` label, and
  - name the finding or blocker it fixes on a line of its description
    starting `Finding:` (a link to the audit finding or the checklist
    row/issue).
- **Anything else** (refactors, new features, test-only cleanups in the
  contracts crate, dependency bumps) waits until after launch. If it cannot,
  it is a scope change: it needs a go/no-go owner's written approval in the PR
  and the auditors told which files moved.
- **Enforcement.** `.github/workflows/contracts-freeze.yml` runs on every pull
  request. It does nothing until the `audit-candidate-1` tag exists, then fails
  any PR that touches `packages/contracts/` without the `launch-fix` label and
  a `Finding:` line. Add the "Contracts freeze" job to the required status
  checks on `dev` and `main` so it blocks the merge button.
- **Lifting the freeze.** The freeze ends at mainnet launch. Delete the
  workflow in the same PR that records the launch in this document.

## No-go criteria

- Any row above is unresolved or has no assigned owner.
- Any row's verification method has been run and failed, with no fix
  merged and re-verified since.
- A P1/P2 incident is open on a launch-critical path.

## Rollback decision procedure

Same procedure as `docs/ROLLBACK_RUNBOOK.md` in the Trident repo — this
protocol launches its dApp/API/contracts together, so a rollback call on
one component's incident should consider whether the others need to roll
back in step (e.g. a contract rollback almost certainly requires an API
rollback if the API's ABI assumptions changed).

## After this checklist is real

Once the team has reviewed this, assigned owners, and verification has
actually been run, check the completed version into the repo so it's a
record of what was actually confirmed before launch — not just a plan.
