import { hash } from "../../../../lib/model";
import {
  userId,
  response,
  bucket,
  blobKey,
  sameOrigin,
} from "../../../../lib/server";
type C = { params: Promise<{ hash: string }> };
async function handle(req: Request, ctx: C, write: boolean) {
  const owner = await userId();
  if (!owner || (write && !sameOrigin(req))) return response("无权访问", 403);
  const id = (await ctx.params).hash;
  if (!hash.safeParse(id).success) return response("无效照片", 400);
  const key = blobKey(owner, id);
  if (write) {
    if (!req.body) return response("空文件", 400);
    if (await bucket().head(key)) return response(true);
    const mime = (req.headers.get("content-type") || "").split(";")[0];
    const type = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/bmp",
    ].includes(mime)
      ? mime
      : "application/octet-stream";
    try {
      await bucket().put(key, req.body, {
        sha256: id,
        httpMetadata: { contentType: type },
      });
    } catch {
      return response("文件校验或上传失败，请重试", 400);
    }
    return response(true);
  }
  const obj = await bucket().get(key);
  if (!obj) return response("未找到照片", 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type":
        obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export const GET = (r: Request, c: C) => handle(r, c, false);
export const PUT = (r: Request, c: C) => handle(r, c, true);
