import { z } from "zod";
export const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const key = z.string().uuid();
const stamp = z.number().int().nonnegative();
const photo = z.object({
  id: key,
  name: z.string(),
  type: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  original: hash,
  preview: hash,
  thumb: hash,
  note: z.string(),
});
export const memory = z
  .object({
    kind: z.literal("memory"),
    id: key,
    title: z.string(),
    body: z.string(),
    date: z.string(),
    people: z.array(z.string()),
    places: z.array(z.string()),
    photos: z.array(photo),
    cover: z.string(),
    created: stamp,
    updated: stamp,
    notes: z.array(z.object({ id: key, text: z.string(), at: stamp })),
  })
  .refine((m) => m.photos.length > 0 || m.body.trim().length > 0);
export const book = z.object({
  kind: z.literal("book"),
  id: key,
  title: z.string().trim().min(1),
  items: z.array(key),
  cover: z.string(),
});
export const settings = z.object({
  kind: z.literal("settings"),
  id: z.literal("settings"),
  cover: z.string(),
});
export const entry = z.union([memory, book, settings]);
export type Photo = z.infer<typeof photo>;
export type Memory = z.infer<typeof memory>;
export type Book = z.infer<typeof book>;
export type Entry = z.infer<typeof entry>;
export type Row = { value: Entry; revision: number };
export function cover(m: Memory) {
  return m.photos.find((p) => p.id === m.cover) || m.photos[0];
}
export function fileUrl(v: string) {
  return v.startsWith("/photos/") ? v : "/api/photo/" + v;
}
export function label(m: Memory) {
  return m.title.trim() || m.body.trim().slice(0, 24) || "未题名的照片";
}
export function sorted(list: Memory[]) {
  const date = (s: string) => (/^\d{4}(-\d{2})?(-\d{2})?$/.test(s) ? s : "");
  return [...list].sort(
    (a, b) => date(b.date).localeCompare(date(a.date)) || b.created - a.created,
  );
}
export const assets = (v: Entry) =>
  v.kind === "memory"
    ? [...new Set(v.photos.flatMap((p) => [p.original, p.preview, p.thumb]))]
    : [];
export function checkReferences(v: Entry, ids: Set<string>) {
  if (v.kind === "memory")
    return !v.cover || v.photos.some((p) => p.id === v.cover);
  if (v.kind === "book")
    return (
      v.items.every((id) => ids.has(id)) &&
      (!v.cover || v.items.includes(v.cover))
    );
  return !v.cover || ids.has(v.cover);
}
export const blank = (): Memory => ({
  kind: "memory",
  id: crypto.randomUUID(),
  title: "",
  body: "",
  date: "",
  people: [],
  places: [],
  photos: [],
  cover: "",
  created: Date.now(),
  updated: Date.now(),
  notes: [],
});
