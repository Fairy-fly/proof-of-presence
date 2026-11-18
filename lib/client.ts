import { fileUrl, type Photo, type Entry, type Row } from "./model";
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(typeof data === "string" ? data : "操作未完成，请稍后重试");
  return data as T;
}
export const putEntry = (value: Entry, revision: number) =>
  api<Row>("/api/album", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value, revision }),
  });
export async function digest(data: Blob) {
  const bits = await crypto.subtle.digest("SHA-256", await data.arrayBuffer());
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function sendBlob(
  hash: string,
  blob: Blob,
  onProgress?: (n: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", fileUrl(hash));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new Error("网络中断，可重试这张照片"));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("上传失败，请重试"));
    xhr.send(blob);
  });
}
export async function preparePhoto(
  file: File,
  id: string,
  progress: (n: number) => void,
): Promise<Photo> {
  const url = URL.createObjectURL(file),
    img = new Image();
  img.src = url;
  try {
    await img.decode();
    const resize = async (max: number) => {
      const scale = Math.min(
        1,
        max / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise<Blob>((res, rej) =>
        c.toBlob(
          (b) => (b ? res(b) : rej(Error("无法生成预览"))),
          "image/webp",
          0.86,
        ),
      );
    };
    const blobs = [file, await resize(1920), await resize(720)];
    const hashes: string[] = [];
    for (let i = 0; i < blobs.length; i++) {
      const h = await digest(blobs[i]);
      hashes.push(h);
      await sendBlob(h, blobs[i], (n) =>
        progress(Math.round(((i + n) * 100) / 3)),
      );
    }
    return {
      id,
      name: file.name,
      type: file.type,
      width: img.naturalWidth,
      height: img.naturalHeight,
      original: hashes[0],
      preview: hashes[1],
      thumb: hashes[2],
      note: "",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
let dbPromise: Promise<IDBDatabase> | undefined;
function drafts() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("presence-private-drafts", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function draftOp(
  action: "get" | "put" | "delete",
  key: string,
  value?: unknown,
) {
  const db = await drafts();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(
      "drafts",
      action === "get" ? "readonly" : "readwrite",
    );
    const s = tx.objectStore("drafts");
    const r =
      action === "get"
        ? s.get(key)
        : action === "put"
          ? s.put(value, key)
          : s.delete(key);
    tx.oncomplete = () => resolve(r.result);
    tx.onerror = () => reject(tx.error);
  });
}
export function humanDate(s: string) {
  return /^\d{4}(-\d{2}){0,2}$/.test(s)
    ? s.replaceAll("-", ".")
    : s || "时间未定";
}
