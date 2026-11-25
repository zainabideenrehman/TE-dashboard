"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Database,
  ArrowUpRight,
  Layers,
  BarChart3,
} from "lucide-react";
import { Button } from "./ui/button";
import { UpworkAnalytics } from "./upwork-analytics";
import { appliedJobsMapping } from "@/lib/upwork-applied";
import {defaultUpworkMapping} from '@/lib/upwork';
import {reportTabs, type ReportKind} from '@/lib/upwork-reports';
import {knowledgeMapping} from "@/lib/upwork-knowledge";
import { EmployeeProfile } from "./employee-profile";
import { sharedBankHolidays } from "@/lib/attendance-view";
import { AttendanceCalendar } from "./attendance-calendar";
import { AttendanceSummary } from "./attendance-summary";
import type { Mapping, Parsed, Registry, Source } from "@/lib/domain";
import { structureDiff } from "@/lib/parser";
type Page = "Overview" | "Employees" | "Attendance" | "Data Sources" | "Upwork BD";
async function request(payload?: unknown) {
  const response = await fetch(
    "/api/dashboard",
    payload
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : undefined,
  );
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}
export function Dashboard({
  initialPage = "Overview",
}: {
  initialPage?: Page;
}) {
  const [page] = useState<Page>(initialPage),
    [data, setData] = useState<Registry & { mode?: string; reviewOnly?: boolean; configurationReadOnly?: boolean }>({ sources: [] }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [department, setDepartment] = useState("All"),
    [employment, setEmployment] = useState("All"),
    [employee, setEmployee] = useState("All"),
    [month, setMonth] = useState(""),
    [selected, setSelected] = useState<string>(),
    [profileId, setProfileId] = useState<string>(),
    [newEmployees, setNewEmployees] =
      useState<{ name: string; employeeId: string }[]>(),
    [mapping, setMapping] = useState(""),
    [preview, setPreview] = useState<Parsed>(),
    [url, setUrl] = useState("synthetic-agency-demo"),
    [tabs, setTabs] = useState<{ id: number; name: string }[]>([]),
    [checked, setChecked] = useState<number[]>([]),
    [kind, setKind] = useState("employees");
  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(await request());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (page !== "Upwork BD") return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => window.clearInterval(timer);
  }, [load, page]);
  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await request(payload);
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  const people = data.sources.flatMap((s) => s.data?.employees || []);
  const records = data.sources.flatMap((s) => s.data?.attendance || []);
  const profileEmployee = people.find((p) => p.employeeId === profileId);
  const departments = [...new Set(people.map((p) => p.departmentId))];
  const source = data.sources.find((s) => s.sourceId === selected);
  const employmentStatuses = [
    ...new Set(people.map((p) => p.employmentStatus)),
  ].sort();
  const filtered = people.filter(
    (p) =>
      (department === "All" || p.departmentId === department) &&
      (page !== "Attendance" || employee === "All" || p.employeeId === employee) &&
      (page === "Attendance" ? p.employmentStatus.toLowerCase() === "active" : employment === "All" || p.employmentStatus === employment),
  );
  async function open(s: Source) {
    setSelected(s.sourceId);
    setMapping(JSON.stringify(s.mapping, null, 2));
    setPreview(undefined);
    setNewEmployees(undefined);
    await act({ action: "inspect", sourceId: s.sourceId });
  }
  async function reviewNewEmployees(s: Source) {
    const result = await act({
      action: "prepareEmployees",
      sourceId: s.sourceId,
    });
    if (!result) return;
    setSelected(s.sourceId);
    setMapping(JSON.stringify(result.mapping, null, 2));
    setNewEmployees(result.newEmployees);
    setPreview(undefined);
    await act({
      action: "inspect",
      sourceId: s.sourceId,
      mapping: result.mapping,
    });
  }
  const availableMonths = [...new Set(records.map((r) => r.date.slice(0, 7)))]
    .sort()
    .reverse();
  const displayedMonth =
    month || availableMonths[0] || new Date().toISOString().slice(0, 7);
  const draft = (() => {
    try {
      return JSON.parse(mapping) as Mapping;
    } catch {
      return undefined;
    }
  })();
  function mappingValue(): Mapping | undefined {
    try {
      return JSON.parse(mapping);
    } catch {
      setError("Mapping must be valid JSON.");
      return undefined;
    }
  }
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-white/10 bg-slate-950 p-5 text-white lg:fixed lg:inset-y-0 lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:p-6">
        <div className="flex items-center gap-3 mb-10">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-300 text-slate-950">
            <Layers size={23} />
          </span>
          <div className="font-bold text-sm">
            AGENCY
            <span className="block text-xs font-normal text-slate-400">
              Command Center
            </span>
          </div>
        </div>
        <p className="text-[10px] tracking-widest text-slate-400 mb-4">
          WORKSPACE
        </p>
        <nav className="flex flex-wrap gap-2 lg:block">
          {(
            [
              { name: "Overview", icon: LayoutDashboard },
              { name: "Employees", icon: Users },
              { name: "Attendance", icon: CalendarDays },
              { name: "Upwork BD", icon: BarChart3 },
              { name: "Data Sources", icon: Database },
            ] as const
          ).filter(({ name }) => !data.reviewOnly || (name !== "Data Sources" && name !== "Upwork BD")).map(({ name, icon: Icon }) => (
            <Link
              key={name}
              href={
                name === "Upwork BD" ? "/bd/upwork" : name === "Overview"
                  ? "/"
                  : name === "Data Sources"
                    ? "/data-sources"
                    : `/people/${name.toLowerCase()}`
              }
              aria-current={page === name ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors lg:mb-1 lg:w-full ${page === name ? "bg-teal-300/15 font-semibold text-teal-200" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={18} />
              {name === "Employees"
                ? "People / Employees"
                : name === "Attendance"
                  ? "People / Attendance"
                  : name}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-6"><button className="text-sm text-slate-300 hover:text-white">Sign out</button></form>
        <div className="mt-10 hidden space-y-3 border-t border-white/10 pt-6 text-xs text-slate-400 lg:block">
          <p>COMING LATER</p>
          <p>Finance · BD · Development</p>
        </div>
        <div className="mt-8 hidden rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 lg:block">
          <span className="mb-2 block font-semibold text-teal-200">
            Read-only by design
          </span>
          Source spreadsheets stay in your team’s hands.
        </div>
      </aside>
      <main className="w-full min-w-0 bg-slate-100/70 lg:ml-64">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-4 text-xs text-slate-600 md:px-9">
          <span>
            Workspace /{" "}
            {page === "Employees" || page === "Attendance" ? "People / " : ""}
            {page}
          </span>
          <span className="badge">
            {data.reviewOnly ? "HR review ? " : ""}{data.mode === "GOOGLE" ? "Google Sheets" : "Synthetic demo data"}
          </span>
        </header>
        <div className="p-5 md:p-9 max-w-[1500px] mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
            <div>
              <h1 className="tracking-tight">{page === "Overview" ? "Your agency, at a glance" : page}</h1>
              <p className="muted mt-2">
                {page === "Overview"
                  ? "A shared view of your people, attendance, and connected sources."
                  : page === "Upwork BD" ? "Proposal activity, recorded outcomes, bidder performance and connects." : page === "Data Sources"
                    ? "Connect, inspect, and approve your spreadsheet mappings."
                    : "People and attendance from published source mappings."}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void load()}
            >
              Reload dashboard <ArrowUpRight size={14} className="ml-2" />
            </Button>
          </div>
          {data.mode !== "GOOGLE" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 mb-6">
              SYNTHETIC DEMO · All names and attendance are fictional. The
              directory and calendar are preloaded. Try inspecting, previewing,
              publishing, and refreshing the demo sources. P / A / L are sample
              mappings only.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="bg-red-50 text-red-800 p-4 rounded-lg mb-5"
            >
              {error}
            </div>
          )}
          {loading ? (
            <p role="status">Loading workspace…</p>
          ) : (
            <>
              {page === "Upwork BD" && !data.reviewOnly && <UpworkAnalytics sources={data.sources} />}
              {page === "Overview" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-7">
                    {[
                      ["People in directory", people.length],
                      [
                        "Left employees",
                        people.filter((p) => p.employmentStatus === "Left")
                          .length,
                      ],
                      ["Departments", departments.length],
                      ["Attendance records", records.length],
                      ["Connected sources", data.sources.length],
                    ].map(([label, value]) => (
                      <div className="panel" key={label}>
                        <p className="muted">{label}</p>
                        <p className="text-4xl font-semibold my-4">{value}</p>
                        <span className="text-xs text-teal-700">
                          Published source data
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
                    <section className="panel">
                      <h2>People by department</h2>
                      <p className="muted mt-1 mb-7">
                        Your current team distribution
                      </p>
                      {departments.length ? (
                        departments.map((d) => (
                          <div className="mb-5" key={d}>
                            <div className="flex justify-between text-sm mb-2">
                              <span>{d}</span>
                              <span>
                                {
                                  people.filter((p) => p.departmentId === d)
                                    .length
                                }
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded">
                              <div
                                className="h-2 rounded bg-teal-600"
                                style={{
                                  width: `${(people.filter((p) => p.departmentId === d).length / people.length) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="muted">
                          Publish and refresh an employee source to see your
                          team.
                        </p>
                      )}
                    </section>
                    <section className="panel">
                      <h2>Source health</h2>
                      <p className="muted mt-1 mb-5">
                        Refreshes use a 60-second server cache.
                      </p>
                      {data.sources.map((s) => (
                        <div
                          className="border-b py-4 flex justify-between gap-3"
                          key={s.sourceId}
                        >
                          <span className="text-sm">
                            {s.displayName}
                            <small className="block text-slate-400 mt-1">
                              {s.lastRefresh
                                ? new Date(s.lastRefresh).toLocaleString()
                                : "Not refreshed"}
                            </small>
                          </span>
                          <span className="text-xs text-teal-700">
                            {s.error
                              ? "Needs attention"
                              : s.data
                                ? "Ready"
                                : "Setup needed"}
                          </span>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}
              {page === "Attendance" && <AttendanceSummary people={filtered} sources={data.sources} year={Number(displayedMonth.slice(0, 4))} />}
              {(page === "Employees" || page === "Attendance") && (
                <section className="panel">
                  <div className="flex flex-wrap justify-between gap-3 mb-5">
                    <h2>
                      {page === "Employees"
                        ? "Employee directory"
                        : "Attendance calendar"}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {page === "Employees" && (
                        <label>
                          Employment status
                          <select
                            value={employment}
                            onChange={(e) => setEmployment(e.target.value)}
                          >
                            <option>All</option>
                            {employmentStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label>
                        Department
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                        >
                          <option>All</option>
                          {departments.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      </label>
                      {page === "Attendance" && (
                        <label>Employee<select value={employee} onChange={e => setEmployee(e.target.value)}><option value="All">All employees</option>{people.filter(p => p.employmentStatus.toLowerCase() === "active").map(p => <option key={p.employeeId} value={p.employeeId}>{p.name}</option>)}</select></label>
                      )}
                      {page === "Attendance" && (
                        <label>
                          Month
                          <input
                            type="month"
                            value={displayedMonth}
                            onChange={(e) => setMonth(e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {!filtered.length ? (
                    <p className="muted">
                      No employees match these filters. If no source has been
                      loaded, publish and refresh an employee source in Data
                      Sources.
                    </p>
                  ) : page === "Attendance" ? (
                    <AttendanceCalendar key={displayedMonth} people={filtered} records={records} sharedHolidays={sharedBankHolidays(records, people)} month={displayedMonth} onMonthChange={setMonth} />
                  ) : (
                    <div className="scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Employee ID</th><th>Department</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((p, i) => (
                            <tr key={`${p.employeeId}-${i}`}>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setProfileId(p.employeeId)}
                                  title="View employee profile"
                                  className={
                                    p.employmentStatus === "Left"
                                      ? "font-semibold text-slate-500 line-through"
                                      : "font-semibold"
                                  }
                                >
                                  {p.name}
                                </button>
                                <button
                                  className="block text-xs text-teal-700 underline mt-1"
                                  onClick={() => setProfileId(p.employeeId)}
                                >
                                  View profile
                                </button>
                                <span className="block text-xs text-slate-400 mt-1">
                                  {p.email}
                                </span>
                              </td>
                              <td>{p.employeeId}</td>
                              <td>{p.departmentId}</td>
                              <td><span className={p.employmentStatus === "Left" ? "badge !bg-rose-50 !text-rose-800" : "badge"} title={p.employmentStatusSource === "name-strikethrough" ? "Employee name is struck through in the source sheet" : "Employment status from the source sheet"}>{p.employmentStatus}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
              {page === "Data Sources" && data.configurationReadOnly && (
                <section className="space-y-4">
                  <p>Source settings are read-only on this deployment. Review and publish mapping changes from the local dashboard.</p>
                  {data.sources.map(s => <div key={s.sourceId} className="rounded-xl border p-4"><strong>{s.displayName}</strong><p>{s.tabName} · Mapping v{s.version}</p><p>{s.error || (s.lastRefresh ? `Last refreshed: ${new Date(s.lastRefresh).toLocaleString()}` : "Waiting for first refresh")}</p><Button disabled={busy} onClick={() => void act({action: "refresh", sourceId: s.sourceId})}>Refresh Data</Button></div>)}
                </section>
              )}
              {page === "Data Sources" && !data.configurationReadOnly && (
                <>
                  <section className="panel mb-6">
                    <h2>Add a spreadsheet</h2>
                    <div className="flex flex-wrap items-end gap-3 mt-4">
                      <label className="grow">
                        Google Sheet URL or ID
                        <input
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setTabs([]);
                            setChecked([]);
                          }}
                        />
                      </label>
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          const r = await act({
                            action: "tabs",
                            spreadsheetId: url,
                          });
                          if (r) {
                            setTabs(r.tabs);
                            setChecked([]);
                          }
                        }}
                      >
                        Test connection & load tabs
                      </Button>
                    </div>
                    {tabs.length > 0 && (
                      <div className="flex flex-wrap gap-4 items-end mt-5">
                        {tabs.map((t) => (
                          <label key={t.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked.includes(t.id)}
                              onChange={(e) =>
                                setChecked(
                                  e.target.checked
                                    ? [...checked, t.id]
                                    : checked.filter((id) => id !== t.id),
                                )
                              }
                            />
                            {t.name}
                          </label>
                        ))}
                        <label>
                          Category
                          <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value)}
                          >
                            <option value="employees">Employees</option>
                            <option value="attendance">Attendance</option>
                            <option value="upwork-bd">Upwork BD</option>
                          </select>
                        </label>
                        <Button
                          disabled={busy || !checked.length}
                          onClick={async () => {
                            if (
                              await act({
                                action: "add",
                                spreadsheetId: url,
                                tabIds: checked,
                                dataType: kind,
                              })
                            ) {
                              setTabs([]);
                              setChecked([]);
                            }
                          }}
                        >
                          Add selected tabs
                        </Button>
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <h2 className="mb-4">Connected sources</h2>
                    {!data.sources.length && (
                      <p className="muted">
                        No sources yet. Add a shared spreadsheet above.
                      </p>
                    )}
                    {data.sources.map((s) => (
                      <article className="border-t py-5" key={s.sourceId}>
                        <div className="flex flex-wrap gap-4 justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {s.displayName}{" "}
                              <span className="badge ml-2">{s.dataType}</span>{" "}
                              <span className="badge">
                                {s.error || s.inspectionError
                                  ? "Needs attention"
                                  : !s.version
                                    ? "Setup needed"
                                    : s.data
                                      ? "Ready"
                                      : "Not refreshed"}
                              </span>
                            </h3>
                            <p className="muted mt-1">
                              {s.tabName} · Mapping v{s.version} · {s.parser}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                              Last refreshed:{" "}
                              {s.lastRefresh
                                ? new Date(s.lastRefresh).toLocaleString()
                                : "Never"}{" "}
                              · Last inspection:{" "}
                              {s.inspection
                                ? new Date(s.inspection.at).toLocaleString()
                                : "Never"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 items-start">
                            {[
                              "Inspect Structure",
                              "Compare Structure",
                              "Configure Mapping",
                            ].map((label) => (
                              <Button
                                key={label}
                                variant="outline"
                                disabled={busy}
                                onClick={() => void open(s)}
                              >
                                {label}
                              </Button>
                            ))}
                            {s.dataType === "employees" && (
                              <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => void reviewNewEmployees(s)}
                              >
                                Review new employees
                              </Button>
                            )}
                            <Button
                              disabled={busy || !s.version}
                              onClick={() =>
                                void act({
                                  action: "refresh",
                                  sourceId: s.sourceId,
                                })
                              }
                            >
                              Refresh data
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                const displayName = window.prompt(
                                  "Source display name",
                                  s.displayName,
                                );
                                if (displayName)
                                  void act({
                                    action: "rename",
                                    sourceId: s.sourceId,
                                    displayName,
                                    dataType: s.dataType,
                                  });
                              }}
                            >
                              Rename
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${s.displayName} from the local registry?`,
                                  )
                                )
                                  void act({
                                    action: "remove",
                                    sourceId: s.sourceId,
                                  });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        {s.inspectionError && (
                          <p
                            role="alert"
                            className="text-amber-800 text-sm mt-3"
                          >
                            Inspection failed: {s.inspectionError}. Previous
                            mapping and records retained.
                          </p>
                        )}
                        {s.error && (
                          <p role="alert" className="text-red-700 text-sm mt-3">
                            {s.error}{" "}
                            {s.data ? "Showing last-good records." : ""}
                          </p>
                        )}
                      </article>
                    ))}
                  </section>
                  {source && (
                    <section className="panel mt-6">
                      <h2>Inspect structure · {source.displayName}</h2>
                      <p className="muted mt-2">
                        Inspection reads the source; publishing approves a
                        parser mapping. Neither changes Google Sheets.
                      </p>
                      <form
                        className="flex flex-wrap gap-3 items-end my-5"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fields = new FormData(e.currentTarget);
                          if (
                            await act({
                              action: "rename",
                              sourceId: source.sourceId,
                              displayName: fields.get("displayName"),
                              dataType: fields.get("dataType"),
                            })
                          )
                            setPreview(undefined);
                        }}
                      >
                        <label>
                          Display name
                          <input
                            key={source.sourceId + source.displayName}
                            name="displayName"
                            defaultValue={source.displayName}
                            required
                            maxLength={100}
                          />
                        </label>
                        <label>
                          Category
                          <select
                            key={source.sourceId + source.dataType}
                            name="dataType"
                            defaultValue={source.dataType}
                          >
                            <option value="employees">Employees</option>
                            <option value="attendance">Attendance</option>
                            <option value="upwork-bd">Upwork BD</option>
                          </select>
                        </label>
                        <Button variant="outline" disabled={busy}>
                          Save source details
                        </Button>
                      </form>
                      <p className="muted">
                        Changing category requires a new inspection and mapping
                        approval.
                      </p>
                      {newEmployees && (
                        <div
                          className="rounded-lg border border-teal-200 bg-teal-50 p-4 mt-4"
                          role="status"
                        >
                          <p className="text-sm font-semibold">
                            {newEmployees.length
                              ? newEmployees.length +
                                " new employee ID(s) proposed"
                              : "All current employee names already have IDs"}
                          </p>
                          {newEmployees.length > 0 && (
                            <>
                              <p className="text-sm mt-1">
                                Review these names, then preview and publish the
                                mapping to approve the IDs. They have not been
                                added to the directory yet.
                              </p>
                              <div className="scroll mt-3">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Employee name</th>
                                      <th>Proposed ID</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {newEmployees.map((p) => (
                                      <tr key={p.employeeId}>
                                        <td>{p.name}</td>
                                        <td>{p.employeeId}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {source.inspection && (
                        <>
                          <div className="grid md:grid-cols-2 gap-5 my-5">
                            <div>
                              <h3 className="font-semibold text-sm mb-2">
                                Compared with approved inspection
                              </h3>
                              {structureDiff(
                                source.approved,
                                source.inspection,
                              ).map((s, i) => (
                                <p className="text-sm py-1" key={i}>
                                  {s}
                                </p>
                              ))}
                              {source.inspection.warnings.map((w) => (
                                <p className="text-amber-800" key={w}>
                                  {w}
                                </p>
                              ))}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">
                                Detected month anchors & headers
                              </h3>
                              <pre>
                                {JSON.stringify(
                                  {
                                    metadata: source.inspection.metadata,
                                    sections: source.inspection.sections,
                                    months: source.inspection.months,
                                    headers: source.inspection.headers,
                                  },
                                  null,
                                  2,
                                )}
                              </pre>
                            </div>
                          </div>
                          <details className="my-4">
                            <summary className="cursor-pointer text-sm">
                              Approved inspection baseline
                            </summary>
                            <pre className="max-h-72 overflow-auto">
                              {source.approved
                                ? JSON.stringify(source.approved, null, 2)
                                : "No approved inspection yet."}
                            </pre>
                          </details>
                          <details>
                            <summary className="cursor-pointer text-sm mb-3">
                              Raw grid preview (maximum 40 rows × 20 columns)
                            </summary>
                            <div className="scroll">
                              <table>
                                <tbody>
                                  {source.inspection.preview.map((r, i) => (
                                    <tr key={i}>
                                      <th>{i + 1}</th>
                                      {r.map((c, j) => (
                                        <td key={j}>{c}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                            {(
                              [
                                "id",
                                "name",
                                "department",
                                "email",
                                "status",
                              ] as const
                            ).map((field) => (
                              <label key={field}>
                                {
                                  {
                                    id: "Employee ID column (blank for aliases)",
                                    name: "Employee name column",
                                    department: "Department column",
                                    email: "Email column (optional)",
                                    status:
                                      "Employment status column (optional)",
                                  }[field]
                                }
                                <input
                                  value={
                                    typeof draft?.[field] === "string"
                                      ? draft[field]
                                      : ""
                                  }
                                  disabled={!draft || busy}
                                  onChange={(e) => {
                                    if (draft) {
                                      setMapping(
                                        JSON.stringify(
                                          { ...draft, [field]: e.target.value },
                                          null,
                                          2,
                                        ),
                                      );
                                      setPreview(undefined);
                                    }
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                          {source.dataType === "employees" && (
                            <label className="flex items-center gap-2 mt-5">
                              <input
                                type="checkbox"
                                checked={
                                  draft?.nameStrikethroughMeansLeft === true
                                }
                                disabled={!draft || busy}
                                onChange={(e) => {
                                  if (draft) {
                                    setMapping(
                                      JSON.stringify(
                                        {
                                          ...draft,
                                          nameStrikethroughMeansLeft:
                                            e.target.checked,
                                        },
                                        null,
                                        2,
                                      ),
                                    );
                                    setPreview(undefined);
                                  }
                                }}
                              />
                              Struck-through employee names mean Left (retain
                              employee history)
                            </label>
                          )}
                          {source.dataType === "employees" && (
                            <details className="mt-5">
                              <summary className="cursor-pointer text-sm">
                                Additional employee profile fields (
                                {Object.keys(draft?.profileFields || {}).length}
                                )
                              </summary>
                              <p className="muted my-3">
                                Each label maps to a source column. These
                                details appear in the employee profile. Bank,
                                salary and credential columns are excluded.
                              </p>
                              <div className="grid sm:grid-cols-2 gap-3">
                                {Object.entries(draft?.profileFields || {}).map(
                                  ([label, column]) => (
                                    <label key={label}>
                                      {label}
                                      <input
                                        value={column}
                                        disabled={busy}
                                        onChange={(e) => {
                                          if (draft) {
                                            setMapping(
                                              JSON.stringify(
                                                {
                                                  ...draft,
                                                  profileFields: {
                                                    ...draft.profileFields,
                                                    [label]: e.target.value,
                                                  },
                                                },
                                                null,
                                                2,
                                              ),
                                            );
                                            setPreview(undefined);
                                          }
                                        }}
                                      />
                                    </label>
                                  ),
                                )}
                              </div>
                            </details>
                          )}
                          {source.dataType === "upwork-bd" && <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm"><p>Choose the operational layout for this tab. Prepare a draft, inspect its structure, preview, then publish. Connects and Boosted Connects stay separate.</p><div className="mt-2 flex flex-wrap gap-4">{(["applied","keywords","relevant-jobs",...Object.keys(reportTabs) as ReportKind[]] as const).map(layout=><button key={layout} className="font-semibold underline" onClick={()=>{const current=mappingValue();if(current){setMapping(JSON.stringify({...current,upwork:layout==="applied"?appliedJobsMapping:layout==="keywords"||layout==="relevant-jobs"?knowledgeMapping(layout).upwork:{...defaultUpworkMapping,report:layout}},null,2));setPreview(undefined);}}}>Prepare {layout==="applied"?"Applied Jobs":layout==="keywords"?"Keyword Search":layout==="relevant-jobs"?"Relevant Jobs":layout} draft</button>)}</div></div>}
                          <div className="grid md:grid-cols-2 gap-6 mt-5">
                            <label>
                              Field mapping, explicit aliases, and status rules
                              (JSON)
                              <textarea
                                className="font-mono text-xs w-full"
                                rows={16}
                                value={mapping}
                                onChange={(e) => {
                                  setMapping(e.target.value);
                                  setPreview(undefined);
                                }}
                              />
                            </label>
                            <div>
                              <h3 className="font-semibold mb-2">
                                Mapping preview
                              </h3>
                              <p className="muted">
                                Aliases map an exact source header to a stable
                                employee ID. Duplicate names require an explicit
                                alias. Clear the employee ID column and add
                                exact name-to-ID aliases for sheets without IDs.
                                Refresh the employee source before previewing
                                attendance. Unknown statuses and ambiguous
                                matches block publishing.
                              </p>
                              {preview && (
                                <pre className="mt-3 bg-slate-50 p-3 max-h-72 overflow-auto">
                                  {JSON.stringify(preview, null, 2)}
                                </pre>
                              )}
                              <p className="muted mt-4">
                                {source.revisions.length} previous mapping
                                revision(s) retained.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-5">
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={async () => {
                                const m = mappingValue();
                                if (m) {
                                  setPreview(undefined);
                                  await act({
                                    action: "inspect",
                                    sourceId: source.sourceId,
                                    mapping: m,
                                  });
                                }
                              }}
                            >
                              Inspect with draft mapping
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={async () => {
                                const m = mappingValue();
                                if (m) {
                                  const r = await act({
                                    action: "preview",
                                    sourceId: source.sourceId,
                                    mapping: m,
                                    inspectedAt: source.inspection!.at,
                                  });
                                  if (r) setPreview(r);
                                }
                              }}
                            >
                              Preview mapping
                            </Button>
                            <Button
                              disabled={
                                busy ||
                                !preview ||
                                preview.warnings.length > 0 ||
                                !!source.inspectionError
                              }
                              onClick={async () => {
                                const m = mappingValue();
                                if (
                                  m &&
                                  (await act({
                                    action: "publish",
                                    sourceId: source.sourceId,
                                    mapping: m,
                                    inspectedAt: source.inspection!.at,
                                  }))
                                ) {
                                  setPreview(undefined);
                                  setNewEmployees(undefined);
                                }
                              }}
                            >
                              Publish mapping
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
          {profileEmployee && (
            <EmployeeProfile
              key={profileEmployee.employeeId}
              employee={profileEmployee}
              onClose={() => setProfileId(undefined)}
            />
          )}
          <footer className="text-xs text-slate-400 mt-10">
            Agency Command Center ·{" "}
            {data.mode === "GOOGLE"
              ? "Google Sheets read-only"
              : "Synthetic demo workspace"}{" "}
            · Local registry
          </footer>
        </div>
      </main>
    </div>
  );
}
