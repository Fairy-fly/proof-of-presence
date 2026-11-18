"use client";
import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Aperture,
  Settings as Gear,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Search,
  Menu,
  X,
  Layers,
  LockKeyhole,
  Feather,
  Camera,
} from "lucide-react";
import {
  cover,
  label,
  fileUrl,
  sorted,
  type Memory,
  type Row,
  type Entry,
  type Photo,
  type Book,
} from "../lib/model";
import { samples, sampleBook } from "../lib/samples";
import { humanDate, putEntry } from "../lib/client";
import Editor from "./Editor";
import CoverStory from "./CoverStory";
import Detail from "./Detail";
import { Books, BookPage, Settings } from "./Library";
type Open = (m: Memory, p?: Photo, el?: HTMLElement) => void;
const pad = (n: number) => String(n).padStart(2, "0");
const urlNow = () => location.pathname + location.search;
function category(m: Memory) {
  return m.people.length
    ? "人物"
    : m.places.includes("家里") || !m.places.length
      ? "日常"
      : "旅途";
}
function Card({
  m,
  open,
  index = 0,
  full = false,
}: {
  m: Memory;
  open: Open;
  index?: number;
  full?: boolean;
}) {
  const p = cover(m);
  return (
    <article
      className={"card reveal " + (!p ? "words" : "")}
      style={{ "--delay": (index % 3) * 70 + "ms" } as React.CSSProperties}
    >
      <button className="cardlink" onClick={(e) => open(m, p, e.currentTarget)}>
        {p ? (
          <div
            className={"cardimage " + (p.height > p.width ? "portrait" : "")}
          >
            <img
              data-shared={p.id}
              loading="lazy"
              src={fileUrl(p.thumb)}
              alt={label(m)}
            />
            {m.photos.length > 1 && (
              <span className="photocount">
                <Layers />
                {m.photos.length}
              </span>
            )}
          </div>
        ) : (
          <div className="wordcover">
            <Feather />
            <p>{m.body}</p>
          </div>
        )}
        <div className="cardmeta">
          <span>{humanDate(m.date)}</span>
          <i /> {category(m)}
        </div>
        <div className="cardtitle">
          <h3>{label(m)}</h3>
          <ArrowUpRight />
        </div>
        {!full && p && m.body && <p className="card-excerpt">{m.body}</p>}
        {full && p && p.height > p.width && (
          <p className="portraitstory">{m.body}</p>
        )}
      </button>
      {full && m.photos.length > 1 && (
        <div className="filmstrip">
          {m.photos
            .filter((x) => x.id !== p?.id)
            .map((x) => (
              <button
                key={x.id}
                aria-label={"打开 " + x.name}
                onClick={(e) => open(m, x, e.currentTarget)}
              >
                <img
                  data-shared={x.id}
                  src={fileUrl(x.thumb)}
                  loading="lazy"
                  alt={x.note || x.name}
                />
              </button>
            ))}
        </div>
      )}
    </article>
  );
}
function Home({
  all,
  pref,
  go,
  open,
  random,
}: {
  all: Memory[];
  pref: string;
  go: (s: string) => void;
  open: Open;
  random: () => void;
}) {
  const [tab, st] = useState("全部");
  useEffect(() => {
    st(history.state?.shelfTab || "全部");
  }, []);
  function selectTab(t: string) {
    st(t);
    history.replaceState({ ...history.state, shelfTab: t }, "");
  }
  const demo = !all.length;
  const source = demo ? samples : all;
  let slides = source.filter((m) => !!cover(m));
  if (!slides.length) slides = [samples[0]];
  const idx = slides.findIndex((m) => m.id === pref);
  if (idx > 0) slides = [slides[idx], ...slides.filter((_, i) => i !== idx)];
  const wall = demo
    ? [samples[1], samples[2], samples[3], samples[4], samples[5], samples[6]]
    : all;
  const filtered = wall.filter((m) => tab === "全部" || category(m) === tab);
  return (
    <>
      <CoverStory
        slides={slides}
        open={open}
        goRead={() => go(demo ? "/memories?sample=1" : "/memories")}
        random={random}
      />
      <section className="shelf">
        <div className="shelfhead">
          <div>
            <div className="eyeline">
              <b />
              MEMORY ARCHIVE
            </div>
            <h2>
              岁月的切片<span lang="en">Fragments</span>
            </h2>
          </div>
          <button
            className="textbtn"
            onClick={() => go(demo ? "/memories?sample=1" : "/memories")}
          >
            查看全部 <ArrowRight />
          </button>
        </div>
        <div className="tabrow">
          <div className="tabs">
            {["全部", "日常", "旅途", "人物"].map((t) => (
              <button
                className={tab === t ? "sel" : ""}
                key={t}
                onClick={() => selectTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <small>
            {demo ? "摄影样章" : "私人回忆"} · {pad(filtered.length)}
          </small>
        </div>
        <div className="cardgrid">
          {filtered.slice(0, 6).map((m, i) => (
            <Card key={m.id} m={m} index={i} open={open} />
          ))}
        </div>
        {!filtered.length && <p className="empty">此分类还没有回忆。</p>}
        {demo && (
          <div className="first">
            <Camera />
            <div>
              <h3>记下第一段回忆</h3>
              <p>给自己的相册放进第一张照片，或留下一句话。</p>
            </div>
            <button className="outline" onClick={() => go("/write")}>
              记下一刻 <Plus />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
function Wall({
  list,
  query,
  go,
  open,
}: {
  list: Memory[];
  query: URLSearchParams;
  go: (s: string) => void;
  open: Open;
}) {
  const demo = query.get("sample") === "1",
    q = query.get("q") || "",
    person = query.get("people") || "",
    place = query.get("places") || "";
  const source = demo ? samples : list;
  const filtered = source.filter(
    (m) =>
      (!person || m.people.includes(person)) &&
      (!place || m.places.includes(place)) &&
      [
        m.title,
        m.body,
        m.date,
        ...m.people,
        ...m.places,
        ...m.photos.map((p) => p.note),
        ...m.notes.map((n) => n.text),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  function filter(k: string, v: string) {
    const n = new URLSearchParams(query);
    if (v) n.set(k, v);
    else n.delete(k);
    go("/memories" + (n.size ? "?" + n : ""));
  }
  return (
    <section className="inner wide">
      <p className="overline">MEMORY ARCHIVE</p>
      <h1>{demo ? "摄影样章" : "所有回忆"}</h1>
      <div className="wallfilters">
        <label className="search">
          <Search />
          <input
            aria-label="搜索回忆"
            value={q}
            placeholder="搜索照片、手记或某个人"
            onChange={(e) => filter("q", e.target.value)}
          />
        </label>
        {(
          [
            ["people", "人物", person],
            ["places", "地点", place],
          ] as const
        ).map(([k, t, v]) => (
          <select
            aria-label={t}
            key={k}
            value={v}
            onChange={(e) => filter(k, e.target.value)}
          >
            <option value="">全部{t}</option>
            {[...new Set(source.flatMap((m) => m[k]))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ))}
        <button
          className="textbtn"
          onClick={() => go(demo ? "/memories" : "/memories?sample=1")}
        >
          {demo ? "我的相册" : "摄影样章"} <ArrowRight />
        </button>
      </div>
      {!filtered.length && (
        <div className="first">
          <Feather />
          <div>
            <h3>{source.length ? "没有找到相符的回忆" : "记下第一段回忆"}</h3>
            <p>
              {source.length
                ? "试试其他人物、地点或关键词。"
                : "从一张照片，或一句话开始。"}
            </p>
          </div>
          <button
            className="outline"
            onClick={() =>
              go(
                source.length
                  ? demo
                    ? "/memories?sample=1"
                    : "/memories"
                  : "/write",
              )
            }
          >
            {source.length ? "清除筛选" : "记下一刻"}
          </button>
        </div>
      )}
      <div className="archivegrid">
        {filtered.map((m, i) => (
          <div
            className={
              "spread " +
              (m.photos.length === 2
                ? "multi pair"
                : m.photos.length > 2
                  ? "multi"
                  : cover(m) && cover(m)!.width > cover(m)!.height
                    ? "land"
                    : "single")
            }
            key={m.id}
          >
            {(!i ||
              (/^\d{4}/.exec(m.date)?.[0] || "时间未定") !==
                (/^\d{4}/.exec(filtered[i - 1].date)?.[0] || "时间未定")) && (
              <div className="year">
                {/^\d{4}(-\d{2}){0,2}$/.test(m.date)
                  ? m.date.slice(0, 4)
                  : "时间未定"}
              </div>
            )}
            <Card m={m} index={i} open={open} full />
          </div>
        ))}
      </div>
    </section>
  );
}
export default function Album({
  initialPath,
  initialRows,
  owner,
}: {
  initialPath: string;
  initialRows: Row[];
  owner: string;
}) {
  const [url, su] = useState(initialPath),
    [rows, sr] = useState(initialRows),
    [menu, sm] = useState(false),
    [toast, st] = useState(""),
    [intro, si] = useState(false);
  const navVersion = useRef(0),
    transition = useRef<any>(null),
    lastRandom = useRef(""),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [path, qs = ""] = url.split("?");
  const query = new URLSearchParams(qs);
  const all = sorted(
    rows.map((r) => r.value).filter((v): v is Memory => v.kind === "memory"),
  );
  const books = rows
    .map((r) => r.value)
    .filter((v): v is Book => v.kind === "book");
  const pref = rows.find((r) => r.value.kind === "settings")?.value;
  const ids = path.split("/").filter(Boolean);
  const m = [...all, ...samples].find((m) => m.id === ids[1]);
  const book = [...books, sampleBook].find((b) => b.id === ids[1]);
  const photoId = query.get("photo") || "";
  const isDetail = ids[0] === "memories" && ids.length === 2 && !!m;
  function flash(t: string) {
    st(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => st(""), 3000);
  }
  function change(
    next: string,
    scroll: number,
    shared?: string,
    sourceElement?: HTMLElement,
  ) {
    const version = ++navVersion.current;
    transition.current?.skipTransition?.();
    document
      .querySelectorAll<HTMLElement>("[data-shared]")
      .forEach((el) => (el.style.viewTransitionName = ""));
    const findImage = () =>
      [...document.querySelectorAll<HTMLElement>("[data-shared]")].find(
        (el) => el.dataset.shared === shared,
      );
    const source =
      sourceElement?.querySelector<HTMLElement>("[data-shared]") ||
      (shared
        ? findImage() ||
          document.querySelector<HTMLElement>(".detail .front img")
        : null);
    if (source) source.style.viewTransitionName = "active-photo";
    const update = () => {
      if (navVersion.current !== version) return;
      flushSync(() => {
        su(next);
        sm(false);
      });
      window.scrollTo(0, scroll);
      if (shared) {
        const target = findImage();
        if (target) {
          target.style.viewTransitionName = "active-photo";
          if (target instanceof HTMLImageElement && !target.complete)
            return Promise.race([
              target.decode().catch(() => {}),
              new Promise<void>((resolve) => setTimeout(resolve, 240)),
            ]);
        }
      }
    };
    if (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      document.startViewTransition
    ) {
      const t = document.startViewTransition(update);
      transition.current = t;
      t.finished
        .catch(() => {})
        .then(() => {
          if (transition.current === t) {
            document
              .querySelectorAll<HTMLElement>("[data-shared]")
              .forEach((el) => (el.style.viewTransitionName = ""));
            transition.current = null;
          }
        });
    } else update();
  }
  function go(next: string) {
    if (next === url) return;
    const filtering =
      path === "/memories" &&
      next.split("?")[0] === "/memories" &&
      query.get("sample") ===
        new URLSearchParams(next.split("?")[1]).get("sample");
    if (filtering) {
      history.replaceState(history.state, "", next);
      su(next);
      return;
    }
    history.replaceState({ ...history.state, y: scrollY }, "");
    history.pushState({ from: url, y: 0 }, "", next);
    change(next, 0);
  }
  function open(m: Memory, p = cover(m), el?: HTMLElement) {
    const next =
      "/memories/" + m.id + (p ? "?photo=" + encodeURIComponent(p.id) : "");
    history.replaceState({ ...history.state, y: scrollY, shared: p?.id }, "");
    history.pushState({ from: url, shared: p?.id, y: 0 }, "", next);
    change(next, 0, p?.id, el);
  }
  function back() {
    if (history.state?.from) history.back();
    else go(m?.id.startsWith("sample-") ? "/memories?sample=1" : "/memories");
  }
  useEffect(() => {
    history.scrollRestoration = "manual";
    su(urlNow());
    if (!sessionStorage.getItem("presence-opening")) {
      si(true);
      sessionStorage.setItem("presence-opening", "1");
      setTimeout(() => si(false), 1400);
    }
    const pop = () =>
      change(urlNow(), history.state?.y || 0, history.state?.shared);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("seen");
            observer.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px 35px" },
    );
    const watch = () =>
      document
        .querySelectorAll(".reveal:not(.seen)")
        .forEach((el) => observer.observe(el));
    watch();
    const mutation = new MutationObserver(watch);
    mutation.observe(document.querySelector("main")!, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);
  async function save(value: Entry, expected?: number) {
    const old = rows.find((r) => r.value.id === value.id);
    const r = await putEntry(value, expected ?? old?.revision ?? 0);
    sr((v) => [...v.filter((e) => e.value.id !== value.id), r]);
  }
  function random() {
    const set = all.length ? all : samples;
    const pool = set.filter((m) => m.id !== lastRandom.current);
    const chosen = (pool.length ? pool : set)[
      Math.floor(Math.random() * (pool.length || set.length))
    ];
    lastRandom.current = chosen.id;
    open(chosen);
  }
  const nav = [
    ["/", "相册首页"],
    ["/memories", "所有回忆"],
    ["/books", "主题小册"],
  ];
  const active = (link: string) =>
    link === "/" ? path === "/" : path.startsWith(link);
  return (
    <div className={intro ? "opening" : ""}>
      <header className="top">
        <div className="topin">
          <a
            href="/"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              go("/");
            }}
          >
            <Aperture />
            <strong>在场证明</strong>
          </a>
          <nav className={menu ? "shown" : ""}>
            {nav.map(([href, t]) => (
              <a
                key={href}
                href={href}
                className={active(href) ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  go(href);
                  sm(false);
                }}
              >
                {t}
              </a>
            ))}
          </nav>
          <div className="headtools">
            <button
              className="manage"
              aria-label="相册管理"
              onClick={() => go("/settings")}
            >
              <Gear />
            </button>
            <button className="record" onClick={() => go("/write")}>
              <Plus />
              记下一刻
            </button>
            <button
              className="mobilemenu"
              aria-label="导航菜单"
              aria-expanded={menu}
              onClick={() => sm(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        {path === "/" ? (
          <Home
            all={all}
            pref={pref?.kind === "settings" ? pref.cover : ""}
            go={go}
            open={open}
            random={random}
          />
        ) : path === "/memories" ? (
          <Wall list={all} query={query} go={go} open={open} />
        ) : isDetail ? (
          <Detail
            key={m!.id}
            m={m!}
            photoId={photoId}
            back={back}
            go={go}
            save={save}
          />
        ) : path === "/write" ||
          (ids[0] === "memories" &&
            ids[2] === "edit" &&
            m &&
            !m.id.startsWith("sample-")) ? (
          <Editor
            key={path}
            owner={owner}
            original={path === "/write" ? undefined : m}
            revision={rows.find((r) => r.value.id === m?.id)?.revision || 0}
            save={async (v, rev) => {
              await save(
                {
                  ...v,
                  people: v.people.map((s) => s.trim()).filter(Boolean),
                  places: v.places.map((s) => s.trim()).filter(Boolean),
                },
                rev,
              );
              go("/memories");
              flash("已收录");
            }}
          />
        ) : path === "/books" ? (
          <Books books={books} memories={all} save={save} go={go} />
        ) : ids[0] === "books" && book ? (
          <BookPage
            key={book.id}
            book={book}
            memories={book.id === sampleBook.id ? samples : all}
            save={save}
            go={go}
          />
        ) : path === "/settings" ? (
          <Settings rows={rows} replace={sr} save={save} />
        ) : (
          <section className="inner">
            <h1>这一页还没有收录</h1>
            <button className="outline" onClick={() => go("/")}>
              返回首页
            </button>
          </section>
        )}
      </main>
      <footer>
        <span>
          <Aperture />
          在场证明
        </span>
        <small>Proof of Presence</small>
        <span>
          <LockKeyhole />
          私人相册
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
