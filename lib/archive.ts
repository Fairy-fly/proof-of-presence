import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import {
  entry,
  assets,
  checkReferences,
  fileUrl,
  label,
  cover,
  type Entry,
  type Row,
  type Book,
  type Memory,
} from "./model";
import { api, digest, sendBlob } from "./client";
type Files = Record<string, Uint8Array>;
const bytes = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw Error("读取照片失败");
  return new Uint8Array(await r.arrayBuffer());
};
function download(files: Files, name: string) {
  const b = zipSync(files, { level: 0 });
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(b)], { type: "application/zip" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function backup(rows: Row[]) {
  const entries = rows.map((r) => r.value);
  const files: Files = {
    "manifest.json": strToU8(
      JSON.stringify({ format: "presence", version: 1, entries }, null, 2),
    ),
  };
  for (const h of new Set(entries.flatMap(assets)))
    files["assets/" + h] = await bytes(fileUrl(h));
  download(files, "在场证明-完整备份.zip");
}
export async function restore(file: File) {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  if (!files["manifest.json"]) throw Error("没有找到备份清单");
  const m = JSON.parse(strFromU8(files["manifest.json"]));
  if (m.format !== "presence" || m.version !== 1)
    throw Error("不支持的备份版本");
  const entries = entry.array().parse(m.entries);
  const ids = new Set(
    entries.filter((e) => e.kind === "memory").map((e) => e.id),
  );
  if (
    entries.some((v) => !checkReferences(v, ids)) ||
    new Set(entries.map((v) => v.id)).size !== entries.length
  )
    throw Error("备份的关联或标识有误");
  const types = new Map<string, string>();
  for (const e of entries)
    if (e.kind === "memory")
      for (const p of e.photos) {
        types.set(p.original, p.type);
        types.set(p.preview, "image/webp");
        types.set(p.thumb, "image/webp");
      }
  const blobs = new Map<string, Blob>();
  for (const [h, type] of types) {
    if (!files["assets/" + h]) throw Error("备份缺少照片");
    const b = new Blob([new Uint8Array(files["assets/" + h])], { type });
    if ((await digest(b)) !== h) throw Error("照片校验失败");
    blobs.set(h, b);
  }
  for (const [h, b] of blobs) await sendBlob(h, b);
  return api<{ rows: Row[]; conflicts: { id: string; name: string }[] }>(
    "/api/restore",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    },
  );
}
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function gift(book: Book, memories: Memory[]) {
  const files: Files = {};
  let index = 0;
  const names = new Map<string, string>();
  const pic = async (src: string) => {
    if (!names.has(src)) {
      const path = "images/" + ++index + ".webp";
      files[path] = await bytes(fileUrl(src));
      names.set(src, path);
    }
    return names.get(src)!;
  };
  const list = book.items
    .map((id) => memories.find((m) => m.id === id))
    .filter((m): m is Memory => !!m);
  const coverMemory = list.find((m) => m.id === book.cover) || list[0];
  const cp = coverMemory && cover(coverMemory);
  const hero = cp ? '<img src="' + (await pic(cp.preview)) + '" alt="">' : "";
  const parts: string[] = [];
  for (const m of list) {
    const photos: string[] = [];
    for (const p of m.photos)
      photos.push(
        '<figure><img loading="lazy" src="' +
          (await pic(p.preview)) +
          '" alt="' +
          esc(p.name) +
          '"><figcaption>' +
          esc(p.note) +
          "</figcaption></figure>",
      );
    parts.push(
      "<article><small>" +
        esc(m.date) +
        "</small><h2>" +
        esc(label(m)) +
        "</h2><p>" +
        esc(m.body) +
        "</p>" +
        photos.join("") +
        m.notes
          .map(
            (n) =>
              "<aside><small>" +
              new Date(n.at).toISOString().slice(0, 10) +
              "</small><p>" +
              esc(n.text) +
              "</p></aside>",
          )
          .join("") +
        "</article>",
    );
  }
  files["index.html"] = strToU8(
    '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      esc(book.title) +
      "</title><style>*{box-sizing:border-box}body{background:#f5f2ea;color:#292822;font:18px/1.85 Georgia,serif;max-width:860px;padding:8vw 6vw;margin:auto}h1{font-size:clamp(32px,6vw,68px)}small,figcaption{color:#845548}article{padding:48px 0;border-top:1px solid #cfc7b6}img{max-width:100%;height:auto}figure{margin:24px 0}p,figcaption{white-space:pre-wrap}aside{border-left:2px solid #a43e30;padding-left:1em}</style><small>在场证明 · 主题小册</small><h1>" +
      esc(book.title) +
      "</h1>" +
      hero +
      parts.join("") +
      "</html>",
  );
  download(files, book.title.replace(/[\\/:*?"<>|]/g, "-") + ".zip");
}
