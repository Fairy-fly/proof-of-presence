import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { assets, checkReferences, type Entry, type Row } from "./model";
export async function userId() {
  return (await getChatGPTUser())?.userId;
}
export const db = () => env.DB!;
export const bucket = () => env.BUCKET!;
export const blobKey = (owner: string, hash: string) =>
  encodeURIComponent(owner) + "/" + hash;
export const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function rows(owner: string): Promise<Row[]> {
  const r = await db()
    .prepare("SELECT content,revision FROM album_entries WHERE owner=?")
    .bind(owner)
    .all<{ content: string; revision: number }>();
  return r.results.map((x) => ({
    value: JSON.parse(x.content),
    revision: x.revision,
  }));
}
export async function available(
  owner: string,
  values: Entry[],
  existing: Row[],
) {
  const ids = new Set(
    [...existing.map((x) => x.value), ...values]
      .filter((v) => v.kind === "memory")
      .map((v) => v.id),
  );
  if (values.some((v) => !checkReferences(v, ids))) return false;
  for (const h of new Set(values.flatMap(assets)))
    if (!(await bucket().head(blobKey(owner, h)))) return false;
  return true;
}
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin");
  return !o || o === new URL(req.url).origin;
}
