import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { defaultMapping, type Registry } from "./domain";
import { demoId, demoTabs, employees, attendance } from "./demo";
import { inspect, parse } from "./parser";

// A production Firestore adapter must transact configuration metadata only.
// The development adapter also retains bounded inspection/last-good cache snapshots.
// Split those snapshots into a separate protected cache before production deployment.
export interface RegistryStore {
  read(): Promise<Registry>;
  update(
    change: (registry: Registry) => void | Promise<void>,
  ): Promise<Registry>;
}
export function initialRegistry(): Registry {
  if (process.env.DATA_MODE === "GOOGLE") return { sources: [] };
  if (process.env.DATA_MODE && process.env.DATA_MODE !== "DEMO")
    throw Error("DATA_MODE must be DEMO or GOOGLE.");
  const people = parse(
    employees,
    "employees",
    defaultMapping,
    [],
    demoId,
    "Employees",
  ).employees;
  return {
    sources: demoTabs.map((t) => {
      const grid = t.id === 1 ? employees : attendance;
      const snapshot = inspect(grid);
      return {
        sourceId: "demo-" + t.id,
        spreadsheetId: demoId,
        tabId: t.id,
        tabName: t.name,
        displayName: "Demo " + t.name,
        dataType: t.id === 1 ? "employees" : "attendance",
        parser: "headers-v1",
        version: 1,
        mapping: structuredClone(defaultMapping),
        revisions: [],
        inspection: snapshot,
        approved: snapshot,
        lastRefresh: new Date().toISOString(),
        data: parse(
          grid,
          t.id === 1 ? "employees" : "attendance",
          defaultMapping,
          people,
          demoId,
          t.name,
        ),
      };
    }),
  };
}
function registryFile() {
  const namespace = process.env.REGISTRY_NAMESPACE || "";
  if (namespace && !/^[a-zA-Z0-9-]{1,64}$/.test(namespace))
    throw Error("Invalid local registry namespace.");
  const mode = process.env.DATA_MODE === "GOOGLE" ? "google" : "demo";
  return path.join(
    process.cwd(),
    ".data",
    "registry-" + mode + (namespace ? "-" + namespace : "") + ".json",
  );
}
const queues = new Map<string, Promise<unknown>>();
export class LocalRegistryStore implements RegistryStore {
  constructor(private readonly file = registryFile()) {}
  async read(): Promise<Registry> {
    try {
      const registry = JSON.parse(
        await readFile(this.file, "utf8"),
      ) as Registry;
      if (!Array.isArray(registry.sources))
        throw Error(
          "Registry file is invalid. Restore its last known good backup.",
        );
      return registry;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return initialRegistry();
    }
  }
  update(
    change: (registry: Registry) => void | Promise<void>,
  ): Promise<Registry> {
    const operation = (queues.get(this.file) || Promise.resolve()).then(
      async () => {
        const registry = await this.read();
        await change(registry);
        await mkdir(path.dirname(this.file), { recursive: true });
        await writeFile(this.file + ".tmp", JSON.stringify(registry, null, 2), {
          mode: 0o600,
        });
        await rename(this.file + ".tmp", this.file);
        return registry;
      },
    );
    queues.set(
      this.file,
      operation.catch(() => {}),
    );
    return operation;
  }
}
export function store(): RegistryStore {
  if (process.env.CONFIG_STORAGE && process.env.CONFIG_STORAGE !== "local")
    throw Error(
      "Firestore adapter is not implemented. Local registry is development-only.",
    );
  if (process.env.K_SERVICE)
    throw Error(
      "Local disk persistence is unsafe on Cloud Run. Implement a durable RegistryStore adapter and protected data cache first.",
    );
  return new LocalRegistryStore();
}
