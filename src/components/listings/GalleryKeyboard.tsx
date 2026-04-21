/**
 * GalleryKeyboard.tsx — T22
 * Keyboard navigation island for DetailGallery.
 * Only handles ← → keys; CSS scroll-snap does the actual scroll motion.
 * aria-live announces current slide index.
 * REQ-DETAIL-01, REQ-A11Y-01, REQ-A11Y-03, SC-07-gallery, SC-08-gallery.
 */
import { useCallback, useEffect, useState } from "react";

interface GalleryKeyboardProps {
  totalSlides: number;
  prevLabel: string;
  nextLabel: string;
  /** Template string: "{current} / {total}" */
  slideLabel: string;
}

export default function GalleryKeyboard({
  totalSlides,
  prevLabel,
  nextLabel,
  slideLabel,
}: GalleryKeyboardProps) {
  const [current, setCurrent] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const track = document.getElementById("gallery-track");
    const slide = document.getElementById(`slide-${index}`);
    if (!track || !slide) return;
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });
    setCurrent(index);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setCurrent((prev) => {
        const next = Math.max(0, Math.min(totalSlides - 1, prev + delta));
        scrollTo(next);
        return next;
      });
    },
    [totalSlides, scrollTo]
  );

  // Track scroll position to sync state when user swipes
  useEffect(() => {
    const track = document.getElementById("gallery-track");
    if (!track) return;

    function onScroll() {
      const track = document.getElementById("gallery-track");
      if (!track) return;
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      setCurrent(idx);
    }

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard handler — attached to gallery section
  useEffect(() => {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    }

    gallery.setAttribute("tabindex", "0");
    gallery.addEventListener("keydown", onKeyDown);
    return () => gallery.removeEventListener("keydown", onKeyDown);
  }, [go]);

  const announcement = slideLabel
    .replace("{current}", String(current + 1))
    .replace("{total}", String(totalSlides));

  return (
    <>
      {/* aria-live region for screen reader announcements (REQ-A11Y-03) */}
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </output>

      {/* Navigation buttons */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={current === 0}
          aria-label={prevLabel}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity disabled:opacity-0 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={current === totalSlides - 1}
          aria-label={nextLabel}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity disabled:opacity-0 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
        >
          →
        </button>
      </div>
    </>
  );
}
