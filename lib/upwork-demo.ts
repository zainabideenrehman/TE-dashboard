import type { Grid, Mapping } from "./domain";
import { defaultMapping } from "./domain";
import { defaultUpworkMapping, parseUpwork } from "./upwork";

export const upworkDemoGrid: Grid = [
  ["SYNTHETIC UPWORK DEMO - fictional proposals, owners and results"],
  ["Proposal ID", "Submitted Date", "Job Title", "BD Owner", "Upwork Profile", "Stage", "Reply Date", "Interview Date", "Won Date", "Job URL", "Connects"],
  ...Array.from({ length: 48 }, (_, i) => {
    const submitted = new Date(Date.UTC(2026, 8, 1 + i));
    const offset = (days: number) => new Date(submitted.valueOf() + days * 86400000).toISOString().slice(0, 10);
    const stage = ["Submitted", "Replied", "Interview", "Won", "Lost", "Submitted"][i % 6];
    const replied = ["Replied", "Interview", "Won"].includes(stage);
    const interviewed = ["Interview", "Won"].includes(stage);
    return [`DEMO-${i + 1}`, offset(0), ["Fictional website redesign", "Fictional dashboard build", "Fictional automation project"][i % 3], ["Demo Alex", "Demo Sam", "Demo Noor"][Math.floor(i / 2) % 3], ["Demo Agency", "Demo Specialist"][i % 2], stage, replied ? offset(1) : "", interviewed ? offset(2) : "", stage === "Won" ? offset(4) : "", `https://www.upwork.com/jobs/~demo${i + 1}`, i % 11 === 0 ? "" : String(8 + i % 5 * 2)];
  }),
];
export const upworkDemoMapping: Mapping = { ...defaultMapping, upwork: defaultUpworkMapping };
export function upworkDemoRecords() {
  return parseUpwork(upworkDemoGrid, upworkDemoMapping, "synthetic-upwork-demo", "Demo proposals").upwork!.map((record, i) => ({ ...record, kind: "Proposal" as const, flags: { viewed: i % 3 !== 0 } }));
}
