"use client";
import { useEffect, useRef } from "react";
import type { Employee } from "@/lib/domain";
import { safeWebUrl } from "@/lib/employees";
import { Button } from "./ui/button";

export function EmployeeProfile({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const fields = Object.entries(employee.profile || {});
  return (
    <dialog
      aria-labelledby="employee-profile-title"
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[min(900px,94vw)] max-h-[90vh] rounded-2xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-start gap-4">
        <div>
          <p className="text-xs text-teal-700 mb-1">EMPLOYEE PROFILE</p>
          <h2
            id="employee-profile-title"
            className={
              employee.employmentStatus === "Left"
                ? "line-through text-slate-500"
                : ""
            }
          >
            {employee.name}
          </h2>
          <p className="muted mt-1">
            {employee.employeeId} · {employee.departmentId}
          </p>
        </div>
        <Button variant="outline" onClick={() => dialog.current?.close()}>
          Close
        </Button>
      </div>
      <div className="p-5">
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Employment status</p>
            <span
              className={
                employee.employmentStatus === "Left"
                  ? "badge !bg-rose-50 !text-rose-800"
                  : "badge"
              }
            >
              {employee.employmentStatus}
            </span>
            {employee.employmentStatusSource === "name-strikethrough" && (
              <p className="text-xs text-slate-500 mt-1">
                Marked left by strikethrough in the source
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Email address</p>
            <p className="text-sm break-words">{employee.email || "—"}</p>
          </div>
        </div>
        {!fields.length ? (
          <p className="muted">
            Additional profile columns have not been mapped for this source.
          </p>
        ) : (
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {fields.map(([label, value]) => {
              const link = safeWebUrl(value);
              const links = (employee.profileLinks?.[label] || []).flatMap(
                (value) => {
                  const url = safeWebUrl(value);
                  return url ? [url] : [];
                },
              );
              return (
                <div key={label} className="border-t pt-3">
                  <dt className="text-xs text-slate-500 mb-1">{label}</dt>
                  <dd className="text-sm whitespace-pre-wrap break-words">
                    {link ? (
                      <a
                        className="text-teal-700 underline"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label === "Picture"
                          ? "Open picture"
                          : label === "CV"
                            ? "Open CV"
                            : value}
                      </a>
                    ) : (
                      value || "—"
                    )}
                    {links
                      .filter((url) => url !== link)
                      .map((url, i) => (
                        <a
                          key={url}
                          className="block text-teal-700 underline mt-1"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {links.length === 1
                            ? "Open " + label
                            : "Open link " + (i + 1)}
                        </a>
                      ))}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <p className="text-xs text-slate-400 mt-7">
          Read-only details from the published employee source. Blank cells
          display —.
        </p>
      </div>
    </dialog>
  );
}
