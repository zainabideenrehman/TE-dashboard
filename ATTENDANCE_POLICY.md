# Weekend, bank-holiday and time-colour correction - 2026-10-30

- User explicitly approved Saturday and Sunday as weekends for everyone, preserving explicit attendance markings on those days.
- User explicitly approved time-based display: after 09:30 Late (orange); after 10:00 Severely late (red). Exact 09:30 remains Arrival time; exact 10:00 remains Late. Earlier explicit-text-only restriction is superseded for time classification only; no approval inference from colours. Raw clock text remains preserved, AM/PM handled only when written, no guessed hour shift.
- User clarified weekends/bank holidays are merged source cells; bank-holiday labels can be taken from Javed and applied to others. Display resolves Javed Iqbal uniquely in the full directory and shares his explicitly labelled Holiday dates across existing blank employee records, including when filtered to other employees. Conflicting shared labels are not propagated. Explicit statuses/times, pre-joining dates and missing source records remain intact. Derived holiday titles include the origin cell. Source registry and records remain unchanged.
- Calendar category filters include Late, Severely late, Arrival time and Notes separately. Weekend day backgrounds are blue. Summary Pending excludes approved weekend/shared-holiday blanks.
# Current attendance display decisions - 2026-10-30

User confirmed explicit text only for late/approved/unapproved categories. Do not infer categories from time or formatting. Distinct display colours do not change normalized records or usage rules. Show explicitly labelled source holidays separately from leave balances, deduplicated by date; no external holiday calendar or full-year remaining holiday entitlement is assumed.

Pending remains a genuine blank source cell. The display excludes future and known pre-joining blanks from Pending counts and hides Pending calendar entries by default. Missing records and missing employee-month columns never become Pending. Preserve source records unchanged. Shakir Ullah and Ibrar Ullah require no follow-up per user; older requests below are superseded.

# Attendance mapping review

Status: draft; not a published mapping. Contains policy only, no employee records.

## Latest user instruction — 2026-10-29

The user has now confirmed all seven active-employee aliases previously listed as pending (Javed, Ajmal, Saad Ahmad, Tayab Tanveer, Majeed Ur Rehman, M Anas Bukhari, Hamood Khan). They are published in mapping version 3, with attendance refreshed for 22 of 24 active employees. Shakir Ullah and Ibrar Ullah still need source coverage identified. Older references to seven pending active aliases below are superseded.

App integration is implemented and the confirmed text mapping is published. The attendance view shows active people, explicit pending cells and unresolved coverage; parser retains historical former employees. Usage follows the validated text deduction rule. Confirmed active employees' starting allowances are saved as mapping metadata; no speculative proration is automatically applied. Ordinary attendance reads request row 28 onward. The top summaries are not inputs to daily record parsing or reported usage. Exact proration and additional identity aliases still need HR review.

Subsequent instruction: annual leave allowance is 15 days. Midyear proration by remaining weeks with upward half-day rounding is provisional, not confirmed. User permits the sheet's starting allowance as fallback. Independently extract/count attendance from row 28 onward FIRST; only afterward read rows 1–27 for validation, not as the reported attendance source. Do not use summary monthly totals to construct daily counts.

Read-only audit: 15 of 24 active employees have confirmed attendance identity links. Across those employees, all 126 comparable employee-month totals match `LEAVE + ABSENT + 0.5 * HALFDAY` (HALF DAY equivalent). This is observed validation evidence; HR confirmation of absence deduction and exact proration remains pending. Weekly proration alternatives do not uniquely explain the starting allowances. Seven active employee aliases need confirmation; two active employees have no matching attendance label. Private results are in `.data/attendance-validation-results.json`; unresolved people must never be reported as having zero leave simply because they lack matched records.

The source sheet is the truth. Use its text markings; colour mistakes must not override the text. Do not recompute attendance classifications from arrival thresholds or automate attendance decisions. This supersedes the colour-based interpretation and conflict questions below, which are retained as historical context only.

Display LEAVE as Leave and HALF DAY/HALFDAY as Half day without inferring approval from colour. Preserve notes and recorded clock text as written; blanks remain pending. A time-only cell should preserve its time without assigning a late/severely-late category. Employee alias confirmation remains necessary to prevent incorrect identity links.

## Confirmed rules

- Office hours: 09:00–18:00. Arrival through 09:30 is on time; after 09:30 is late; after 10:00 is severely late. Exactly 10:00 is late.
- Blank cells mean pending, including coloured blank cells. Never infer absence, leave, weekend or holiday from a blank background.
- ABSENT with red background means absent.
- HALF DAY and HALFDAY are equivalent labels. Yellow means approved half day; red means unapproved half day.
- LEAVE with yellow background means approved leave.
- PRESENT with green background means present.
- Recorded arrival times with pink background indicate late arrival; red with white text indicates severely late arrival. Conflicts with time thresholds require a policy decision.
- Preserve the original arrival text and cell provenance. Do not assume AM/PM for ambiguous clock strings.
- Retain former employees and historical identity links. Only exact, unique directory matches or explicitly confirmed aliases may link attendance.

## Layout and implementation

Month anchors accept `October 2026` and `October, 2026`. Each section discovers its own Date header and employee columns. Day numbers resolve against that section's month/year and must form a real date. ISO dates remain supported and must agree with the month anchor. Positions must never be saved as historical month rules.

Implemented: comma month anchors, day-number dates, date validation, and regression coverage for inserted months and reordered employee columns.

Still required: reviewed employee-header boundaries excluding side legends; attendance formatting reads and preview receipts; explicit pending records; arrival preservation and review indicators; attendance UI; live preview and reviewed publication. Current blank cells still produce no normalized record.

## Decisions pending

- Whether conflicting recorded times and colours should remain flagged, follow thresholds, or follow colour.
- Whether orange LEAVE means approved leave.
- Interpretation of the `Personal Laptop Issue` note; no status is approved for it.
- Remaining proposed employee aliases and ambiguous clock representations.
- Explicit weekend and named holiday labels need approved mappings before normalization.

The existing private alias draft remains under `.data/`; this document does not approve additional aliases. No Slack updater, scheduler, HR summary, interview inference or source-sheet writing is authorized by this policy.
