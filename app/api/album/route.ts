import { z } from "zod";
import { entry } from "../../../lib/model";
import {
  userId,
  response,
  rows,
  available,
  db,
  sameOrigin,
} from "../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const owner = await userId();
  return owner ? response(await rows(owner)) : response("请先登录", 401);
}
export async function POST(req: Request) {
  const owner = await userId();
  if (!owner || !sameOrigin(req)) return response("无权修改", 403);
  const parsedInput = z
    .object({ revision: z.number().int().nonnegative(), value: entry })
    .safeParse(await req.json().catch(() => null));
  if (!parsedInput.success) return response("内容不完整", 400);
  const input = parsedInput.data;
  const value = input.value;
  const content = JSON.stringify(value);
  const list = await rows(owner);
  const current = list.find((r) => r.value.id === value.id);
  if (current && JSON.stringify(current.value) === content)
    return response(current);
  if (
    (current?.revision ?? 0) !== input.revision ||
    (current && current.value.kind !== value.kind)
  )
    return response("这条记录已更新，请重新打开后编辑。草稿已保留。", 409);
  if (!(await available(owner, [value], list)))
    return response("照片或关联回忆尚未保存", 400);
  const result =
    input.revision === 0
      ? await db()
          .prepare(
            "INSERT OR IGNORE INTO album_entries (owner,id,kind,content,revision) VALUES(?,?,?,?,1)",
          )
          .bind(owner, value.id, value.kind, content)
          .run()
      : await db()
          .prepare(
            "UPDATE album_entries SET content=?,revision=revision+1 WHERE owner=? AND id=? AND revision=?",
          )
          .bind(content, owner, value.id, input.revision)
          .run();
  return result.meta.changes
    ? response({ value, revision: input.revision + 1 })
    : response("记录已在另一处更新", 409);
}
