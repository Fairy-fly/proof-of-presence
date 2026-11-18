"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { cover, fileUrl, label, type Memory, type Photo } from "../lib/model";
import { humanDate } from "../lib/client";

type Props = {
  slides: Memory[];
  goRead: () => void;
  random: () => void;
  open: (m: Memory, p: Photo, el: HTMLElement) => void;
};
const pad = (n: number) => String(n).padStart(2, "0");
export default function CoverStory({ slides, goRead, random, open }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [underlay, setUnderlay] = useState("");
  const [turn, setTurn] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const generation = useRef(0);
  const i = index % slides.length,
    active = slides[i],
    photo = cover(active)!;
  const picture = fileUrl(photo.preview);
  useEffect(() => {
    const remembered = history.state?.coverIndex;
    if (Number.isInteger(remembered) && remembered >= 0)
      setIndex(remembered % slides.length);
    return () => {
      generation.current++;
    };
  }, [slides.length]);
  async function select(next: number, dir: number) {
    const ticket = ++generation.current;
    if (next === i) return;
    const img = new Image();
    img.src = fileUrl(cover(slides[next])!.preview);
    try {
      await img.decode();
    } catch {
      return;
    }
    if (ticket !== generation.current) return;
    setUnderlay(picture);
    setDirection(dir);
    setIndex(next);
    setTurn((v) => v + 1);
    history.replaceState({ ...history.state, coverIndex: next }, "");
  }
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      x = 0,
      y = 0;
    const paint = () => {
      frame = 0;
      if (reduced.matches) {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
        el.style.removeProperty("--scroll");
        return;
      }
      el.style.setProperty("--mx", (x * 20).toFixed(2) + "px");
      el.style.setProperty("--my", (y * 12).toFixed(2) + "px");
      el.style.setProperty(
        "--scroll",
        Math.min(45, Math.max(0, -el.getBoundingClientRect().top * 0.13)) +
          "px",
      );
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const pointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5;
      y = (e.clientY - r.top) / r.height - 0.5;
      queue();
    };
    const leave = () => {
      x = y = 0;
      queue();
    };
    el.addEventListener("pointermove", pointer);
    el.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", queue, { passive: true });
    reduced.addEventListener("change", queue);
    queue();
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", pointer);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", queue);
      reduced.removeEventListener("change", queue);
    };
  }, []);
  return (
    <section className="folio" ref={stage} aria-label="相册封面">
      <button
        className="folio-scene"
        onClick={(e) => open(active, photo, e.currentTarget)}
        aria-label={"翻阅 " + label(active)}
      >
        {underlay && <img className="folio-under" src={underlay} alt="" />}
        <span
          key={active.id}
          className={
            "folio-image " +
            (turn ? (direction > 0 ? "turn-forward" : "turn-back") : "")
          }
        >
          <img
            data-shared={photo.id}
            src={picture}
            alt={label(active)}
            width={photo.width}
            height={photo.height}
            fetchPriority="high"
          />
        </span>
      </button>
      <div className="folio-shade" aria-hidden="true" />
      <div className="folio-shutter" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((n) => (
          <i key={n} style={{ "--n": n } as React.CSSProperties} />
        ))}
      </div>
      <div className="folio-body">
        <div className="folio-type">
          <p className="folio-kicker">
            <span />
            私人影像手记
          </p>
          <h1 className="folio-title" aria-label="在场证明">
            <span aria-hidden="true">
              {["在", "场", "证", "明"].map((c, n) => (
                <i key={c} style={{ "--n": n } as React.CSSProperties}>
                  {c}
                </i>
              ))}
            </span>
          </h1>
          <p className="folio-script" lang="en">
            Proof of Presence
          </p>
          <p className="folio-verse">
            日子走远了，
            <br />
            光还停在那一页。
          </p>
          <div className="folio-actions">
            <button className="read-folio" onClick={goRead}>
              开始翻阅 <ArrowRight />
            </button>
            <button className="random-folio" onClick={random}>
              <Shuffle />
              随手翻翻
            </button>
          </div>
        </div>
        <div className="folio-foot">
          <div className="folio-caption" key={active.id} aria-live="polite">
            <span className="folio-dateline">
              {active.id.startsWith("sample-") ? "摄影样章" : "私人回忆"}
              <i />
              {humanDate(active.date)}
            </span>
            <button onClick={(e) => open(active, photo, e.currentTarget)}>
              {label(active)}
              <ArrowUpRight />
            </button>
          </div>
          <div className="folio-pager">
            <button
              disabled={slides.length < 2}
              aria-label="上一张封面"
              onClick={() =>
                select((i - 1 + slides.length) % slides.length, -1)
              }
            >
              <ChevronLeft />
            </button>
            <span>
              <strong>{pad(i + 1)}</strong>
              <i /> {pad(slides.length)}
            </span>
            <button
              disabled={slides.length < 2}
              aria-label="下一张封面"
              onClick={() => select((i + 1) % slides.length, 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
