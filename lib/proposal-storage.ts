import { list, put } from "@vercel/blob";

const prefix = "proposal-routines/";

export function usesBlobStorage() {
  return !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.VERCEL;
}

function blobPath(folder: string, file: string) {
  return `${prefix}${folder}/${file}`;
}

async function readBlob(url: string) {
  const response = await fetch(url, { headers: process.env.BLOB_READ_WRITE_TOKEN ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } : undefined, cache: "no-store" });
  if (!response.ok) throw Error(`Could not read proposal routine storage (${response.status}).`);
  return response.text();
}

export async function writeRoutineToBlob(folder: string, files: { name: string; content: string }[]) {
  for (const file of files) await put(blobPath(folder, file.name), file.content, { access: "private", addRandomSuffix: false, contentType: file.name.endsWith(".json") ? "application/json" : "text/markdown" });
}

export async function listRoutineFolders() {
  const result = await list({ prefix, mode: "expanded" });
  return [...new Set(result.blobs.map(blob => blob.pathname.slice(prefix.length).split("/")[0]).filter(Boolean))].sort().reverse();
}

export async function readRoutineFromBlob(folder: string) {
  const result = await list({ prefix: `${prefix}${folder}/`, mode: "expanded" });
  return Promise.all(result.blobs.map(async blob => ({ file: blob.pathname.slice(`${prefix}${folder}/`.length), content: (await readBlob(blob.url)).slice(0, 120_000) })));
}

export async function writeRoutineResultToBlob(folder: string, file: string, content: string) {
  await put(blobPath(folder, file), content, { access: "private", addRandomSuffix: false, contentType: "text/markdown" });
}
