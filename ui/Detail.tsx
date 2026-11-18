"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Expand,
  X,
  ChevronLeft,
  ChevronRight,
  PenLine,
  MapPin,
  UserRound,
} from "lucide-react";
import { fileUrl, label, type Memory } from "../lib/model";
import { humanDate } from "../lib/client";
export default function Detail({
  m,
  photoId,
  back,
  go,
  save,
}: {
  m: Memory;
  photoId: string;
  back: () => void;
  go: (p: string) => void;
  save: (m: Memory) => Promise<void>;
}) {
  const [idx, si] = useState(
      Math.max(
        0,
        m.photos.findIndex((p) => p.id === photoId),
      ),
    ),
    [flip, sf] = useState(false),
    [full, fs] = useState(false),
    [bar, sb] = useState(true),
    [note, sn] = useState(""),
    [edit, se] = useState(false),
    [err, msg] = useState(""),
    [saving, ss] = useState(false);
  const start = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    closeBtn = useRef<HTMLButtonElement>(null),
    expandBtn = useRef<HTMLButtonElement>(null);
  const p = m.photos[idx];
  const demo = m.id.startsWith("sample-");
  function step(n: number) {
    si((i) => (i + n + m.photos.length) % m.photos.length);
    sf(false);
  }
  function wake() {
    sb(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => sb(false), 2500);
  }
  useEffect(() => {
    if (!full) return;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    wake();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") fs(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Tab") {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>(".viewer button"),
        );
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      wake();
    }
    window.addEventListener("keydown", keys);
    return () => {
      clearTimeout(timer.current);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", keys);
      expandBtn.current?.focus();
    };
  }, [full, m.photos.length]);
  return (
    <section className="inner detail">
      <button className="textbtn" onClick={back}>
        <ArrowLeft />
        返回翻阅
      </button>
      <div className="detailhead">
        <p className="overline">
          {demo ? "摄影样章" : "私人手记"}　/　{humanDate(m.date)}
        </p>
        <h1>{label(m)}</h1>
      </div>
      {p && (
        <>
          <div className={"flipbox " + (flip ? "turned" : "")}>
            <div className="flipper">
              <div className="face front" inert={flip}>
                <img
                  data-shared={p.id}
                  src={fileUrl(p.preview)}
                  alt={label(m)}
                />
              </div>
              <div className="face reverse" inert={!flip}>
                <small>照片背面</small>
                <p>{p.note || "这张照片还没有手记。"}</p>
                {!p.note && !demo && (
                  <button
                    className="textbtn"
                    onClick={() => go("/memories/" + m.id + "/edit")}
                  >
                    写下手记 <PenLine />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="detailbar">
            <div className="actions">
              <button onClick={() => sf(!flip)}>
                <RotateCw />
                {flip ? "回到正面" : "翻到背面"}
              </button>
              <button
                ref={expandBtn}
                aria-label="全屏观片"
                onClick={() => fs(true)}
              >
                <Expand />
              </button>
            </div>
            <div className="actions">
              {m.photos.length > 1 && (
                <button aria-label="上一张" onClick={() => step(-1)}>
                  <ChevronLeft />
                </button>
              )}
              <small>
                {idx + 1} / {m.photos.length}
              </small>
              {m.photos.length > 1 && (
                <button aria-label="下一张" onClick={() => step(1)}>
                  <ChevronRight />
                </button>
              )}
            </div>
          </div>
        </>
      )}
      <div className="story">
        <p>{m.body}</p>
        <div className="actions tags">
          {[
            ...m.people.map((x) => ["people", x]),
            ...m.places.map((x) => ["places", x]),
          ].map(([k, v]) => (
            <button
              key={k + v}
              onClick={() =>
                go(
                  "/memories?" +
                    (demo ? "sample=1&" : "") +
                    k +
                    "=" +
                    encodeURIComponent(v),
                )
              }
            >
              {k === "places" ? <MapPin /> : <UserRound />}
              {v}
            </button>
          ))}
        </div>
        {m.notes.map((n) => (
          <aside key={n.id}>
            <small>{new Date(n.at).toLocaleDateString("zh-CN")}</small>
            <p>{n.text}</p>
          </aside>
        ))}
        {!demo && (
          <>
            <div className="actions">
              <button className="outline" onClick={() => se(!edit)}>
                <PenLine />
                后来又想起
              </button>
              <button
                className="textbtn"
                onClick={() => go("/memories/" + m.id + "/edit")}
              >
                编辑回忆 <ArrowRight />
              </button>
            </div>
            {edit && (
              <div>
                <label>
                  后记
                  <textarea value={note} onChange={(e) => sn(e.target.value)} />
                </label>
                <button
                  className="solid"
                  disabled={!note.trim() || saving}
                  onClick={async () => {
                    ss(true);
                    try {
                      await save({
                        ...m,
                        updated: Date.now(),
                        notes: [
                          ...m.notes,
                          {
                            id: crypto.randomUUID(),
                            text: note.trim(),
                            at: Date.now(),
                          },
                        ],
                      });
                      se(false);
                      sn("");
                      msg("");
                    } catch (e) {
                      msg(String(e));
                    } finally {
                      ss(false);
                    }
                  }}
                >
                  保存后记
                </button>
                <p role="status">{err}</p>
              </div>
            )}
          </>
        )}
      </div>
      {full && p && (
        <div
          className={"viewer " + (bar ? "awake" : "")}
          role="dialog"
          aria-label="全屏观片"
          aria-modal="true"
          onPointerMove={wake}
          onFocus={wake}
          onClick={wake}
          onTouchStart={(e) => {
            start.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientX - start.current;
            if (Math.abs(delta) > 45) step(delta < 0 ? 1 : -1);
            wake();
          }}
        >
          <img src={fileUrl(p.original)} alt={label(m)} />
          <div className="viewtools">
            <span>
              {idx + 1} / {m.photos.length}
            </span>
            <button
              ref={closeBtn}
              aria-label="关闭全屏"
              onClick={() => fs(false)}
            >
              <X />
            </button>
          </div>
          {m.photos.length > 1 && (
            <div className="viewarrows">
              <button aria-label="上一张原图" onClick={() => step(-1)}>
                <ArrowLeft />
              </button>
              <button aria-label="下一张原图" onClick={() => step(1)}>
                <ArrowRight />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
