# StaffUp

**Client:** StaffUp
**URL:** staffuphq.com
**Industry:** Recruitment, seasonal and high-volume staffing

## The problem

Seasonal hiring breaks at scale. One job posting brings hundreds of applicants. Recruiters read resumes by hand, miss good candidates, and pick on gut feel. The wrong hires drop out when shift dates don't actually match their availability.

Candidates lose too. They apply, hear nothing, never learn why they were skipped, and can't improve for next time.

## What we built

A full recruitment platform. Three role-based dashboards plus a scoring engine recruiters can actually trust. It ranks every applicant against a job and shows exactly why each one lands where they do. No more reading resumes by hand.

**Seven-criteria scoring engine.** Every candidate gets a match score out of 100, built from seven weighted signals:

- Psychometric self-rating, 30 percent
- Availability overlap with the shift dates, 25 percent
- Relevant seasonal experience, 10 percent
- Certifications, 10 percent
- Training modules completed, 10 percent
- Profile completeness, 10 percent
- Suitability tags, 5 percent

Every score is fully transparent. Open any candidate and you see the exact criteria that earned the number, so a recruiter can defend why one person ranks above another. Each candidate also gets an at-a-glance gold, silver, or bronze tier.

**Two-sided scoring.** Candidates score themselves too. On any job, a candidate can run their own match score and get back the exact criteria they fall short on, plus how many points each fix would recover. Complete a training module. Add a missing certification. Fill out the profile. This turns a silent rejection into a feedback loop.

**Three complete products in one codebase.** Employer, admin, and candidate, each with its own dashboard and workflow.

- Employer: post jobs, run "Find Top Candidates" to rank and filter applicants by match score, and move each applicant through a status workflow (pending, shortlisted, rejected, hired) with interview invites and ratings.
- Admin: manage users (activate, deactivate, delete), manage job categories, and view account-activation analytics.
- Candidate: build a profile, upload a CV, search and save jobs, score any job on demand, and accept or reject interview invites.

## Key technical decision

A clean serverless setup. Next.js Server Actions plus Firebase Admin, with no API server to run and no infrastructure to babysit. Scoring is a deterministic weighted rule engine that runs in memory on demand, the moment an employer asks for top candidates or a candidate scores a job.

The rule engine was a deliberate choice over a model. Recruiters have to defend every hiring decision, and a weighted score is never a black box. They can open any ranking and see the math. The result comes back in the same request.

## Stack

Next.js 15.3.4 App Router, React 19, Tailwind CSS v4. Redux Toolkit for job and user state, TanStack React Query for data fetching. Firebase Firestore, Auth, and Storage. Next.js Server Actions with Firebase Admin for privileged writes. react-hook-form for forms. Recharts for analytics. Resend for transactional email. Deployed on Vercel via GitHub Actions.

## Result

- Hiring decisions a recruiter can defend, with a per-criterion breakdown behind every ranking
- A ranked, filtered shortlist in place of reading resumes by hand
- A feedback loop where skipped candidates see what to fix instead of churning
- One serverless codebase, with no backend server to run or maintain
