"use client";
import { useState, useRef } from "react";
import {
  Plus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  BookOpen,
  Check,
  Settings2,
} from "lucide-react";
import {
  type Book,
  type Memory,
  type Entry,
  type Row,
  label,
  cover,
  fileUrl,
} from "../lib/model";
import { sampleBook, samples } from "../lib/samples";
type Props = {
  books: Book[];
  memories: Memory[];
  go: (s: string) => void;
  save: (v: Entry) => Promise<void>;
};
export function Books({ books, memories, go, save }: Props) {
  const [show, set] = useState(false);
  return (
    <section className="inner wide">
      <p className="overline">THE BOOKSHELF</p>
      <h1>主题小册</h1>
      <div className="actions">
        <button className="solid" onClick={() => set(!show)}>
          <Plus />
          制作一本小册
        </button>
      </div>
      {show && (
        <BookForm
          memories={memories}
          save={async (b) => {
            await save(b);
            set(false);
            go("/books/" + b.id);
          }}
        />
      )}
      <div className="booksgrid">
        {[...books, sampleBook].map((b) => {
          const demo = b.id === sampleBook.id;
          const all = demo ? samples : memories;
          const m = all.find((m) => m.id === (b.cover || b.items[0]));
          const p = m && cover(m);
          return (
            <button
              className="book"
              key={b.id}
              onClick={() => go("/books/" + b.id)}
            >
              {p && <img src={fileUrl(p.thumb)} alt="" />}
              <span>
                <small>
                  {demo ? "示例小册" : "私人小册"} · {b.items.length} 段回忆
                </small>
                <strong>{b.title}</strong>
                <BookOpen />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function BookForm({
  book,
  memories,
  save,
}: {
  book?: Book;
  memories: Memory[];
  save: (b: Book) => Promise<void>;
}) {
  const [b, set] = useState<Book>(
    () =>
      book || {
        id: crypto.randomUUID(),
        kind: "book",
        title: "",
        items: [],
        cover: "",
      },
  );
  const [busy, sb] = useState(false),
    [msg, sm] = useState("");
  function reorder(i: number, dir: number) {
    let items = [...b.items];
    [items[i], items[i + dir]] = [items[i + dir], items[i]];
    set({ ...b, items });
  }
  return (
    <div className="panel">
      <label>
        小册名称
        <input
          value={b.title}
          onChange={(e) => set({ ...b, title: e.target.value })}
          placeholder="比如：我们住过的房间"
        />
      </label>
      <p>选入回忆</p>
      {!memories.length && (
        <small>记下第一段回忆后，就可以把它收入小册。</small>
      )}
      <div className="actions tags">
        {memories.map((m) => (
          <button
            aria-pressed={b.items.includes(m.id)}
            key={m.id}
            onClick={() => {
              const items = b.items.includes(m.id)
                ? b.items.filter((x) => x !== m.id)
                : [...b.items, m.id];
              set({
                ...b,
                items,
                cover: items.includes(b.cover) ? b.cover : items[0] || "",
              });
            }}
          >
            {b.items.includes(m.id) ? <Check /> : <Plus />}
            {label(m)}
          </button>
        ))}
      </div>
      {b.items.map((id, i) => (
        <div className="bookrow" key={id}>
          <span>
            {i + 1}. {label(memories.find((m) => m.id === id)!)}
          </span>
          <button onClick={() => set({ ...b, cover: id })}>
            {b.cover === id ? "已设封面" : "设为封面"}
          </button>
          <button
            aria-label="向前移动"
            disabled={!i}
            onClick={() => reorder(i, -1)}
          >
            <ArrowUp />
          </button>
          <button
            aria-label="向后移动"
            disabled={i === b.items.length - 1}
            onClick={() => reorder(i, 1)}
          >
            <ArrowDown />
          </button>
        </div>
      ))}
      <button
        className="solid"
        disabled={!b.title.trim() || busy}
        onClick={async () => {
          sb(true);
          try {
            await save(b);
          } catch (e) {
            sm(String(e));
          } finally {
            sb(false);
          }
        }}
      >
        保存小册
      </button>
      <p role="status">{msg}</p>
    </div>
  );
}
export function BookPage({
  book,
  memories,
  go,
  save,
}: {
  book: Book;
  memories: Memory[];
  go: (s: string) => void;
  save: (v: Entry) => Promise<void>;
}) {
  const [edit, se] = useState(false),
    [busy, sb] = useState(false),
    [msg, sm] = useState("");
  const demo = book.id === sampleBook.id;
  return (
    <section className="inner wide bookopen">
      <button className="textbtn" onClick={() => go("/books")}>
        ← 全部小册
      </button>
      <p className="overline">
        {demo ? "示例小册" : "私人小册"} / {book.items.length} 段回忆
      </p>
      <h1>{book.title}</h1>
      <div className="actions">
        {!demo && (
          <button className="outline" onClick={() => se(!edit)}>
            <Settings2 />
            编排小册
          </button>
        )}
        <button
          className="outline"
          disabled={busy}
          onClick={async () => {
            sb(true);
            try {
              await (await import("../lib/archive")).gift(book, memories);
              sm("赠阅包已生成，解压后打开 index.html 即可翻阅。");
            } catch (e) {
              sm(String(e));
            } finally {
              sb(false);
            }
          }}
        >
          <Download />
          {busy ? "制作中…" : "导出离线赠阅册"}
        </button>
      </div>
      <p role="status">{msg}</p>
      {edit && (
        <BookForm
          book={book}
          memories={memories}
          save={async (v) => {
            await save(v);
            se(false);
          }}
        />
      )}
      <div className="bookpages">
        {book.items.map((id, i) => {
          const m = memories.find((m) => m.id === id);
          if (!m) return null;
          const p = cover(m);
          return (
            <button key={id} onClick={() => go("/memories/" + id)}>
              {p && (
                <img loading="lazy" src={fileUrl(p.preview)} alt={label(m)} />
              )}
              <span>
                <small>
                  {String(i + 1).padStart(2, "0")} / {m.date}
                </small>
                <h2>{label(m)}</h2>
                <p>{m.body}</p>
                <ArrowRight />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
export function Settings({
  rows,
  replace,
  save,
}: {
  rows: Row[];
  replace: (r: Row[]) => void;
  save: (v: Entry) => Promise<void>;
}) {
  const [busy, sb] = useState(false),
    [msg, sm] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const memories = rows
    .map((x) => x.value)
    .filter((v): v is Memory => v.kind === "memory" && !!v.photos.length);
  const pref = rows.find((r) => r.value.kind === "settings")?.value;
  async function run(action: () => Promise<string>) {
    sb(true);
    try {
      sm(await action());
    } catch (e) {
      sm("操作未完成 · " + String(e));
    } finally {
      sb(false);
    }
  }
  return (
    <section className="inner">
      <p className="overline">ALBUM SETTINGS</p>
      <h1>相册管理</h1>
      <div className="panel">
        <h2>首页封面</h2>
        <label>
          选择一段带照片的回忆
          <select
            disabled={busy}
            value={pref?.kind === "settings" ? pref.cover : ""}
            onChange={(e) => {
              const id = e.target.value;
              run(async () => {
                await save({ kind: "settings", id: "settings", cover: id });
                return "首页封面已更新";
              });
            }}
          >
            <option value="">自动选用最近的照片</option>
            {memories.map((m) => (
              <option value={m.id} key={m.id}>
                {label(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel">
        <h2>完整备份</h2>
        <p>
          导出原图、照片手记、后记和小册顺序。恢复时按标识补入缺失内容，同名标识有差异时保留当前版本。
        </p>
        <div className="actions">
          <button
            className="solid"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await (await import("../lib/archive")).backup(rows);
                return "完整备份已生成";
              })
            }
          >
            <Download />
            导出备份
          </button>
          <button
            className="outline"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            <Upload />
            恢复备份
          </button>
        </div>
        <input
          hidden
          ref={file}
          type="file"
          accept=".zip"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f)
              run(async () => {
                const result = await (
                  await import("../lib/archive")
                ).restore(f);
                replace(result.rows);
                return result.conflicts.length
                  ? "恢复完毕，以下现有记录已保留：" +
                      result.conflicts
                        .map((c) => c.name + " (" + c.id + ")")
                        .join("、")
                  : "备份已恢复，重复记录已跳过。";
              });
          }}
        />
      </div>
      <p role="status">{busy ? "正在处理…" : msg}</p>
    </section>
  );
}
