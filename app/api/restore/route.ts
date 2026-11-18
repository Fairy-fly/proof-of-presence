import { entry, type Entry } from "../../../lib/model";
import {
  userId,
  response,
  rows,
  available,
  db,
  sameOrigin,
} from "../../../lib/server";
export async function POST(req: Request) {
  const owner = await userId();
  if (!owner || !sameOrigin(req)) return response("无权导入", 403);
  const values = entry.array().safeParse(await req.json().catch(() => null));
  if (!values.success) return response("备份格式错误", 400);
  const incoming = values.data;
  const current = await rows(owner);
  const known = new Map(current.map((r) => [r.value.id, r.value]));
  if (new Set(incoming.map((v) => v.id)).size !== incoming.length)
    return response("清单包含重复标识", 400);
  const fresh = incoming.filter((v) => !known.has(v.id));
  if (!(await available(owner, fresh, current)))
    return response("备份缺少关联内容", 400);
  if (fresh.length)
    await db().batch(
      fresh.map((v) =>
        db()
          .prepare(
            "INSERT OR IGNORE INTO album_entries(owner,id,kind,content,revision) VALUES(?,?,?,?,1)",
          )
          .bind(owner, v.id, v.kind, JSON.stringify(v)),
      ),
    );
  const after = await rows(owner);
  const final = new Map(after.map((r) => [r.value.id, r.value]));
  const conflicts = incoming
    .filter((v) => JSON.stringify(final.get(v.id)) !== JSON.stringify(v))
    .map((v) => ({ id: v.id, name: ("title" in v && v.title) || v.id }));
  return response({ conflicts, rows: after });
}
