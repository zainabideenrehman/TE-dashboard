export type Grid = string[][];
export type ProfileLinkCells = Record<
  string,
  { value: string; urls: string[] }
>;
export type Employee = {
  employeeId: string;
  name: string;
  email?: string;
  departmentId: string;
  teamId?: string;
  employmentStatus: string;
  employmentStatusSource?: "name-strikethrough" | "status-column";
  source: string;
  profile?: Record<string, string>;
  profileLinks?: Record<string, string[]>;
};
export type Attendance = {
  employeeId: string;
  date: string;
  status: string;
  rawText?: string;
  source: { spreadsheetId: string; tab: string; row: number; column: number };
};
export type UpworkStage = "Submitted" | "Replied" | "Interview" | "Won" | "Lost" | "Withdrawn" | "Closed";
export type UpworkProposal = {
  recordId: string;
  proposalId?: string;
  submittedDate: string;
  title: string;
  owner: string;
  profile: string;
  rawStage: string;
  stage?: UpworkStage;
  replyDate?: string;
  interviewDate?: string;
  wonDate?: string;
  jobUrl?: string;
  connects?: number;
  boostedConnects?: number;
  totalConnects?: number;
  kind?: "Proposal" | "Invite";
  rawDate?: string;
  rawTime?: string;
  flags?: { viewed?: boolean; replied?: boolean; interviewed?: boolean; hired?: boolean; called?: boolean; boosted?: boolean; outbid?: boolean; video?: boolean };
  details?: Record<string, string>;
  issues?: string[];
  source: { spreadsheetId: string; tab: string; row: number };
};
export type UpworkMapping = {
  knowledge?: "keywords" | "relevant-jobs";
  report?: import("./upwork-reports").ReportKind;
  appliedJobs?: { year: number; dateAnchorColumn: number; connectsMode: "separate"; defaultStartDate: string };
  proposalId: string;
  submittedDate: string;
  title: string;
  owner: string;
  profile: string;
  stage: string;
  replyDate: string;
  interviewDate: string;
  wonDate: string;
  jobUrl: string;
  connects: string;
  stageMap: Record<string, UpworkStage>;
};
export type Mapping = {
  upwork?: UpworkMapping;
  attendance?: {
    mode: "text";
    firstRow: number;
    allowances: Record<string, { year: number; days: number }>;
  };
  id: string;
  name: string;
  department: string;
  email: string;
  status: string;
  aliases: Record<string, string>;
  statuses: Record<string, string>;
  nameStrikethroughMeansLeft?: boolean;
  profileFields?: Record<string, string>;
};
export const defaultMapping: Mapping = {
  id: "Employee ID",
  name: "Name",
  department: "Department",
  email: "Email",
  status: "Status",
  aliases: {},
  statuses: { P: "Present", A: "Absent", L: "Leave" },
};
export type TabMetadata = {
  id: number;
  name: string;
  rowCount?: number;
  columnCount?: number;
};
export type Inspection = {
  at: string;
  metadata?: TabMetadata;
  headers: { row: number; cells: string[] }[];
  months: { anchor: string; row: number }[];
  sections?: {
    anchor: string;
    startRow: number;
    endRow: number;
    headerRows: number[];
    confidence: "high" | "review";
  }[];
  warnings: string[];
  preview: Grid;
  nameFormatting?: import("./formatting").NameFormatting;
};
export type Parsed = {
  upworkReport?: import("./upwork-reports").ReportRow[];
  upworkKnowledge?: UpworkKnowledgeRecord[];
  upwork?: UpworkProposal[];
  reviews?: string[];
  employees: Employee[];
  attendance: Attendance[];
  warnings: string[];
};
export type UpworkKnowledgeRecord = {
  recordId: string;
  kind: "keywords" | "relevant-jobs";
  fields: Record<string, string>;
  issues: string[];
  source: {spreadsheetId:string;tab:string;row:number};
};
export type Source = {
  sourceId: string;
  spreadsheetId: string;
  tabId: number;
  tabName: string;
  displayName: string;
  dataType: "employees" | "attendance" | "upwork-bd";
  parser: "headers-v1";
  version: number;
  mapping: Mapping;
  revisions: { version: number; mapping: Mapping; inspection?: Inspection }[];
  inspection?: Inspection;
  approved?: Inspection;
  previewApproval?: { digest: string; inspectedAt: string };
  lastRefresh?: string;
  lastAttempt?: string;
  error?: string;
  inspectionError?: string;
  data?: Parsed;
};
export type Registry = { sources: Source[] };
