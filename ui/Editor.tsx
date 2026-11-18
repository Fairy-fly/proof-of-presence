"use client";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  FileText,
  ArrowUp,
  ArrowDown,
  X,
  ImagePlus,
  Check,
  RefreshCw,
} from "lucide-react";
import { blank, fileUrl, type Memory, type Photo } from "../lib/model";
import { preparePhoto, draftOp } from "../lib/client";
type Item = {
  id: string;
  file?: File;
  photo?: Photo;
  note: string;
  error?: string;
};
type Draft = { m: Memory; items: Item[]; revision: number };
export default function Editor({
  original,
  owner,
  revision,
  save,
}: {
  original?: Memory;
  owner: string;
  revision: number;
  save: (m: Memory, revision: number) => Promise<void>;
}) {
  const key = owner + "|" + (original?.id || "new");
  const [d, setD] = useState<Draft>(() => ({
    m: original || blank(),
    items:
      original?.photos.map((photo) => ({
        id: photo.id,
        photo,
        note: photo.note,
      })) || [],
    revision,
  }));
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, msg] = useState(""),
    [progress, setProgress] = useState<Record<string, number>>({});
  const running = useRef(new Set<string>());
  const uploaded = useRef(false);
  const text = useRef<HTMLTextAreaElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const cached = useRef(new Map<string, string>());
  useEffect(() => {
    let live = true;
    draftOp("get", key)
      .then((x) => {
        if (live && x) setD(x);
      })
      .catch(() => {
        if (live) msg("此浏览器无法读取本地草稿");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
      for (const v of cached.current.values()) URL.revokeObjectURL(v);
      cached.current.clear();
    };
  }, [key]);
  useEffect(() => {
    if (ready && !uploaded.current)
      draftOp("put", key, d).catch(() =>
        msg("草稿空间不足，请保持页面打开直至保存"),
      );
  }, [d, key, ready]);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const i of d.items) {
      if (i.file && !cached.current.has(i.id))
        cached.current.set(i.id, URL.createObjectURL(i.file));
      if (cached.current.has(i.id)) next[i.id] = cached.current.get(i.id)!;
    }
    setUrls(next);
  }, [d.items]);
  const mutate = (v: Partial<Memory>) =>
    setD((old) => ({ ...old, m: { ...old.m, ...v } }));
  const patch = (id: string, v: Partial<Item>) =>
    setD((old) => ({
      ...old,
      items: old.items.map((i) => (i.id === id ? { ...i, ...v } : i)),
    }));
  async function upload(i: Item) {
    if (!i.file || running.current.has(i.id)) return;
    running.current.add(i.id);
    try {
      const photo = await preparePhoto(i.file, i.id, (n) =>
        setProgress((p) => ({ ...p, [i.id]: n })),
      );
      patch(i.id, { photo, error: undefined });
    } catch (e) {
      patch(i.id, {
        error:
          e instanceof Error
            ? e.message
            : "无法读取照片，请换用 JPEG、PNG 或 WebP",
      });
    } finally {
      running.current.delete(i.id);
    }
  }
  useEffect(() => {
    if (ready)
      d.items
        .filter((i) => i.file && !i.photo && !i.error)
        .slice(0, 2)
        .forEach((i) => void upload(i));
  }, [ready, d.items]);
  function select(files: FileList | null) {
    if (!files) return;
    const items = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      note: "",
    }));
    setD((old) => ({ ...old, items: [...old.items, ...items] }));
  }
  function move(idx: number, offset: number) {
    setD((old) => {
      const items = [...old.items];
      [items[idx], items[idx + offset]] = [items[idx + offset], items[idx]];
      return { ...old, items };
    });
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    msg("");
    try {
      if (d.items.some((i) => !i.photo))
        throw Error("请等待所有照片上传完成，或重试失败的照片");
      if (!d.items.length && !d.m.body.trim())
        throw Error("选一张照片或写下一句话，就可以保存了");
      const photos = d.items.map((i) => ({ ...i.photo!, note: i.note }));
      const m = {
        ...d.m,
        photos,
        cover: photos.some((p) => p.id === d.m.cover)
          ? d.m.cover
          : photos[0]?.id || "",
        updated: Date.now(),
      };
      await save(m, d.revision);
      uploaded.current = true;
      await draftOp("delete", key);
    } catch (e) {
      msg(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="inner editor">
      <p className="overline">MEMORY JOURNAL</p>
      <h1>{original ? "编辑回忆" : "记下一刻"}</h1>
      <div className="actions">
        <button className="solid" onClick={() => input.current?.click()}>
          <Camera />
          选照片
        </button>
        <button className="outline" onClick={() => text.current?.focus()}>
          <FileText />
          写一段话
        </button>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          select(e.target.files);
          e.target.value = "";
        }}
      />
      <fieldset disabled={!ready || busy}>
        <label>
          标题
          <input
            value={d.m.title}
            placeholder="给这段回忆起个名字"
            onChange={(e) => mutate({ title: e.target.value })}
          />
        </label>
        <label>
          正文
          <textarea
            ref={text}
            rows={5}
            value={d.m.body}
            placeholder="你想记住什么？"
            onChange={(e) => mutate({ body: e.target.value })}
          />
        </label>
        <div className="editphotos">
          {d.items.map((i, idx) => (
            <div className="editphoto" key={i.id}>
              <img
                src={
                  urls[i.id] || (i.photo ? fileUrl(i.photo.thumb) : undefined)
                }
                alt={i.file?.name || i.photo?.name}
              />
              <div>
                <strong>{i.file?.name || i.photo?.name}</strong>
                <small>
                  {i.error ||
                    (!i.photo
                      ? "上传中 " + (progress[i.id] || 0) + "%"
                      : "已就绪")}
                </small>
                <input
                  placeholder="照片背面的手记"
                  value={i.note}
                  onChange={(e) => patch(i.id, { note: e.target.value })}
                />
                <div className="actions tiny">
                  {i.error && (
                    <button onClick={() => patch(i.id, { error: undefined })}>
                      <RefreshCw />
                      重试
                    </button>
                  )}
                  <button onClick={() => mutate({ cover: i.id })}>
                    <Check />
                    {d.m.cover === i.id || (!d.m.cover && idx === 0)
                      ? "封面照片"
                      : "设为封面"}
                  </button>
                  <button
                    aria-label="前移照片"
                    disabled={!idx}
                    onClick={() => move(idx, -1)}
                  >
                    <ArrowUp />
                  </button>
                  <button
                    aria-label="后移照片"
                    disabled={idx === d.items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown />
                  </button>
                  <button
                    aria-label="移出照片"
                    onClick={() =>
                      setD((old) => ({
                        ...old,
                        items: old.items.filter((x) => x.id !== i.id),
                      }))
                    }
                  >
                    <X />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <details>
          <summary>日期、人物与地点</summary>
          <label>
            回忆发生的时间
            <input
              placeholder="如 2024-06、1998 或小时候的夏天"
              value={d.m.date}
              onChange={(e) => mutate({ date: e.target.value })}
            />
          </label>
          {(["people", "places"] as const).map((k) => (
            <label key={k}>
              {k === "people" ? "同行的人" : "所在的地方"}
              <input
                value={d.m[k].join("，")}
                placeholder="多个名称用逗号隔开"
                onChange={(e) => mutate({ [k]: e.target.value.split(/[,，]/) })}
              />
            </label>
          ))}
        </details>
      </fieldset>
      {((d.m.id === original?.id && d.revision !== revision) ||
        message.includes("已更新")) && (
        <button
          className="outline"
          onClick={() => {
            setD((old) => ({
              ...old,
              m: { ...old.m, id: crypto.randomUUID(), created: Date.now() },
              revision: 0,
            }));
            msg("草稿将另存为一段新回忆");
          }}
        >
          将草稿另存为新回忆
        </button>
      )}
      <p role="status" className="status">
        {message}
      </p>
      <button className="solid" disabled={!ready || busy} onClick={submit}>
        <ImagePlus />
        {busy ? "保存中…" : "保存这段回忆"}
      </button>
    </section>
  );
}
