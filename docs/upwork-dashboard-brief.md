# Upwork dashboard brief

Verified against the three live operational headers on 2026-11-03 using the read-only Sheets scope. No source edits, searches, scoring calls or proposal submissions are performed.

## Live structure

| Source | Read range | Structure |
| --- | --- | --- |
| Upwork Keyword Search | A:S | 19 columns including Connection Reference, which is deliberately excluded from normalized records |
| Relevant Jobs | A:BG | 59 columns, including Block Date/Shift, Soft Hold, job identity, discovery timestamps, attribution, taxonomy, job commercial metadata, client metrics, scores, decisions and apply bridge |
| Upwork Applied Jobs | A:AU | Leading `  Applied Date`, job title/link, skills, profile/owner, connects, commercial and competition fields, independent outcome flags, Interviews, Result, Claude Link |

Relevant Jobs currently names the client columns `Client Hire Rate`, `Client Total Spent`, `Client Jobs Posted`, `Client Open Jobs`. Component scores use names such as `Service / Capability Score (30)` and total uses `Total Fit Score (100)`. Its final columns are Last Updated At, Record Origin, Sync Status, Additional Notes. Applied Jobs currently uses `current Interviewing`; duplicate Profile/Expertise fields to the right of the operational range are ignored. The two Boosted columns are resolved using the existing approved context beside Video Interview. Unresolved duplicate mapped headers fail safely.

## Views

- Daily pulse: Relevant clean/hold/unknown split, dated application volume, cohort conversions, notification shares, connects coverage, daily bars, calendar comparisons and source/shift breakdowns.
- Weekly / WoW: partial current Monday–Sunday week against complete last week, cohort conversion and attribution tables.
- Keyword lab: last-run snapshots alongside historical Relevant attribution, hold/application rates, fit averages and a transparent noise review signal (at least 20 returned with under 10% relevant). Vertical rollups include recorded applications/interviews/hires.
- Soft Hold monitor: current pool, discovery age, seven-day unapplied pool, recorded reasons/notes and payment information. No unsupported causal diagnosis or automatic filter changes.
- Apply outcomes: independently recorded Viewed, Interview, Messaged, Call and Hired flags; profiles/owners, boosts, numeric bids and search terms. Existing application view retains row-level outcomes/details and filters.
- Progression: 7/14/30-day discovery/apply trend, recorded score bands and component averages by application/interview/hire outcome. Target reference is 40+ clean → ≤10 qualify → 5–6 apply. No automatic qualification or invented scores.
- Quality / ops: country/payment/type/experience/competition/connects/origin/sync groupings, currency/type-separated budget bands, discovery lag coverage, unknown dates, errors and score completeness.

## Definitions

Discovered At is immutable first entry. Last Seen At is rediscovery. Last Updated At is any source field write. Discovery time series use Discovered At, never merged Block Date labels. Live `M/D/YYYY h:mm AM/PM PKT` timestamps have explicit parsing; ISO timestamps convert to PKT, with timezone-free ISO interpreted as PKT. Invalid dates remain unavailable. Calendar weeks start Monday.

Prefer Job ID, extracting the ID from Applied job URLs; fallback uses a normalized HTTPS Upwork URL with tracking parameters removed. No title matching. A discovery cohort counts an applied job once even if several application rows match. Application volume counts dated application rows plus unmatched Relevant positive marks with Applied At. Undated positive marks affect cohort conversion only. Rates use the full cohort denominator when evidence exists; if the entire cohort lacks application evidence, conversion is unavailable. Missing flags, scores and numbers stay unknown.

Keyword run counters are snapshots, never historical time series. Primary/matched keyword and all-source attribution can overlap. Historical charts describe current outcomes attached to dated cohorts; no historical state snapshots are available. Budget bands use the recorded minimum; numeric bid averages need source-unit review. No spend, currency conversion, ROI, salary or agency finance calculation is inferred.

## Remaining source hooks

Populate total/component scores for qualification thresholds; keep Applied?, Applied At and Applied Jobs Reference reliable on every external logapply; add draft/submitted proposal text and edit flags before edit comparison; optionally remove duplicate Applied headers. The dashboard never performs these source changes. Local source registry persistence remains unsuitable for Cloud Run.
