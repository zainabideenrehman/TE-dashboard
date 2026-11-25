# Rack Room (The RackRoom)

**Client:** Touqeer Ahmed, UK
**Industry:** Data-centre rack fit-out and engineer staffing
**Timeline:** March 2025 to ongoing
**Team:** 1 person

## The problem

Touqeer ran the entire business off spreadsheets and email. Engineer schedules in one file, client bookings in another, quotations in Word, invoices in Excel. The result:

- Double-booked engineers on jobs that overlapped
- Pricing mistakes on quotes because no one had a clean template
- No single source of truth for who was on which job and when
- Each quotation took hours to format by hand

For a business booking engineers across multiple sites, the spreadsheet stack was breaking.

## What we built

A private app that runs the whole rack-room business end-to-end.

- **Engineers, clients, bookings in one place.** Add entities once, manage everywhere.

- **Visual timeline.** Drag engineers onto jobs. See at a glance who is free, who is booked, and where conflicts will hit.

- **Three quotation layouts from one booking.** Installation, Rack Build, and Chargeback Sheet. Each has its own warranty clauses, header rules, and pricing structure. Operations staff click once and get the right format every time.

- **One-click branded PDF and email.** The system pulls booking details, builds the right PDF with the right T&Cs, attaches a customer-uploaded T&C document if present, and emails the client. No copy-paste.

- **Quote becomes invoice.** Once the client approves, the same record converts to an invoice and locks the engineer's dates.

- **Role-based access.** Different team members see different views. SMS event log per engineer for audit.

## Key technical decision

Generated PDFs server-side with jsPDF instead of a headless Chromium service (Puppeteer, Browserless, react-pdf). Three reasons:

- Three different layouts with strict header, footer, and column rules. CSS-to-PDF fights every layout change. jsPDF gives pixel-level control.
- Single deployable. No second service to maintain, no cold starts on Vercel.
- We needed to merge an uploaded customer T&C PDF onto the end of our generated document. jsPDF handles this in-process without leaving Node.

Generation runs in under a second inside a Next.js server action.

## Stack

Frontend: Next.js 15 App Router, React 19, Tailwind, shadcn-ui, TypeScript. Backend: Supabase (Postgres, Auth, RLS, Storage). PDF: jsPDF server-side. Email: Nodemailer. SMS: Twilio. Build: Turborepo monorepo with pnpm. Hosting: Railway.

## Result

A stack of spreadsheets and manual quote work replaced with one tool. Bookings, quotations, PDFs, and invoices flow through the same system. Quotes that took hours go out in minutes.
