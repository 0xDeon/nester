# Game Day: Incident Communication Templates

**Scenario:** an incident is declared (severity picked at drill time) and the
on-call rotation must get an approved, correctly-filled-in public message onto
a test channel within the target time, using the templates and approver chain
in [`incident-response.md` §H](incident-response.md#h-public-communication-templates).

**Status: not yet executed.** This is the exercise plan `game-day.md` §4
calls for — that harness covers nine technical phases of a signing
compromise but explicitly provides zero coverage of §F/§H communication,
because a test harness cannot rehearse whether a human finds the right
template, gets the right sign-off, and posts it inside the target window.
Nothing below describes a drill that has happened yet; §3 is a placeholder to
fill in after the first real run. Do not cite this document as evidence the
communication path has been tested until that section has a dated entry.

---

## 1. Why this is a separate document from `game-day.md`

`game-day.md` is an executable harness (`go test ./internal/signing/ -run
TestGameDay`) scoped to one scenario: a compromised API abusing signing. This
exercise is the opposite shape on purpose — it is unavoidably manual, because
the thing being tested is whether a person can find, fill in, get approved,
and post a message under time pressure, not whether code enforces a policy.
Combining the two into one document would bury that distinction.

## 2. Exercise design

### Setup (once, before the first run)

- [ ] Create a private test channel the drill posts to — a team-only Discord
      channel or server, **never** `#announcements` or any real public
      channel. Record its name/link here once created: `[TEST CHANNEL]`.
- [ ] Confirm the approvers named in §H.2 (Tier 3/4 individuals, by name, not
      just role) know this drill exists and roughly when it will run.
- [ ] Agree the drill is unannounced to the specific on-call being tested —
      announcing "a drill will happen Tuesday at 2pm" to the person being
      drilled defeats the point.

### Running a drill

1. **Facilitator declares a simulated incident** to the on-call, stating a
   severity (P1–P3, rotate which one across drills) and a one-line scenario
   (e.g. "simulated: vault circuit breaker tripped, deposits auto-paused").
   Start the clock.
2. **On-call picks the matching template** from §H.3 (for a fresh pause, that
   is template 1; mid-investigation drills should start from template 2;
   etc.) and fills in every bracketed field for the stated scenario.
3. **On-call runs the approver chain from §H.2** for the stated severity —
   actually messaging the named approver(s) and getting a real "approved to
   post" response, not assuming it.
4. **On-call posts the filled-in message to `[TEST CHANNEL]`.** Stop the
   clock.
5. **Facilitator records** (§3 table): total elapsed time, which template was
   used, whether the right approver(s) were reached and how long that took,
   whether every bracket was filled in, and whether the approver actually
   read the filled-in content (not just rubber-stamped on template name).

### Success criteria

- Message posted to the test channel within the target window — **15
  minutes** for P1 (matching the P1 initial-response SLA in
  `SUPPORT_ESCALATION.md`), 1 hour for P2, 4 hours for P3.
- No unfilled `[BRACKET]` in the posted message.
- The approver named in §H.2 for that severity actually signed off — not a
  substitute, and not skipped because they were slow to respond (if they were
  unreachable, escalation to the next tier up per §H.2 counts as a pass, used
  as-designed; silent skipping does not).
- Nothing posted that §F.2 / the template's "cannot say" list rules out.

### Known limitation, stated plainly

Like the technical harness, this cannot rehearse the hardest real case: a P1
where the Tier 4 approvers are asleep, on a plane, or simultaneously dealing
with the technical response and have no attention left for comms review. The
escalation path for *that* is not fully specified anywhere yet — if a real
drill or incident exposes it as a gap, record it as a finding here and open
the fix as a follow-up to `SUPPORT_ESCALATION.md` rather than papering over it
in this document.

---

## 3. Run log

*(Empty until the first drill. Append one row per run; do not overwrite.)*

| Date | Severity drilled | Template used | Time to post | Approver reached? | Findings |
|---|---|---|---|---|---|
| — | — | — | — | — | *(no runs yet)* |
