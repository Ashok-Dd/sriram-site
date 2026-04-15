import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { VIDEOS } from '../../data';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const CARD_W_LANDSCAPE = 480;   // px — base card width
const CARD_W_PORTRAIT  = 230;
const CARD_GAP         = 28;
const DEPTH_OFFSET     = 120;   // z translate for non-center cards
const SIDE_SCALE       = 0.82;
const SIDE_OPACITY     = 0.45;
const EASE_CAROUSEL    = 'power4.out';
const DRAG_THRESHOLD   = 8;     // px before drag is real

/* ─────────────────────────────────────────────────────────
   VIDEO LOADER SPINNER
───────────────────────────────────────────────────────── */
function Loader() {
  return (
    <div className="ve-loader">
      <svg viewBox="0 0 44 44" className="ve-loader-ring" fill="none">
        <circle cx="22" cy="22" r="18" stroke="rgba(26,188,156,0.15)" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" stroke="#1abc9c" strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="28 84"
          className="ve-loader-arc" />
      </svg>
      <span className="ve-loader-txt">Loading</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SINGLE CARD
───────────────────────────────────────────────────────── */
function VideoCard({ video, index, activeIdx, total, onSelect, isPlaying, onTogglePlay, isMuted, onToggleMute }) {
  const cardRef     = useRef(null);
  const videoRef    = useRef(null);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const isCenter  = index === activeIdx;
  const offset    = index - activeIdx;
  const isVisible = Math.abs(offset) <= 2;   // only render heavy stuff for nearby cards

  /* ── Position this card via GSAP whenever activeIdx changes ── */
  useEffect(() => {
    if (!cardRef.current) return;
    const isL = video.orientation === 'landscape';
    const cardW = isL ? CARD_W_LANDSCAPE : CARD_W_PORTRAIT;

    const xBase    = offset * (cardW + CARD_GAP);
    const scale    = isCenter ? 1 : Math.max(SIDE_SCALE - Math.abs(offset) * 0.04, 0.65);
    const zVal     = isCenter ? 0 : -DEPTH_OFFSET * Math.min(Math.abs(offset), 2);
    const opacity  = isCenter ? 1 : Math.max(SIDE_OPACITY - Math.abs(offset) * 0.08, 0.1);
    const rotY     = isCenter ? 0 : offset > 0 ? -18 : 18;
    const yVal     = isCenter ? 0 : Math.abs(offset) * 12;

    gsap.to(cardRef.current, {
      x: xBase,
      y: yVal,
      scale,
      opacity,
      rotateY: rotY,
      z: zVal,
      zIndex: total - Math.abs(offset),
      duration: 0.72,
      ease: EASE_CAROUSEL,
      overwrite: 'auto',
    });
  }, [activeIdx, index, offset, total, video.orientation]);

  /* ── When card becomes active, start loading & show video ── */
  useEffect(() => {
    if (isCenter) {
      setShowVideo(true);
      if (!loaded) setLoading(true);
    } else {
      // Slight delay before hiding — lets outgoing card fade away cleanly
      const t = setTimeout(() => {
        setShowVideo(false);
        // Pause if video ref exists
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isCenter, loaded]);

  /* ── Autoplay when ready and center ── */
  useEffect(() => {
    if (!videoRef.current || !showVideo) return;
    if (isCenter) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [showVideo, isCenter, isMuted]);

  /* ── Sync play/pause from parent toggle ── */
  useEffect(() => {
    if (!videoRef.current || !isCenter) return;
    if (isPlaying) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isPlaying, isCenter]);

  /* ── Sync mute ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const isL = video.orientation === 'landscape';
  const cardW = isL ? CARD_W_LANDSCAPE : CARD_W_PORTRAIT;

  return (
    <div
      ref={cardRef}
      className={`ve-card ${video.orientation} ${isCenter ? 'center' : ''}`}
      style={{
        width: cardW,
        position: 'absolute',
        left: '50%',
        marginLeft: -cardW / 2,
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
        cursor: isCenter ? 'default' : 'pointer',
      }}
      onClick={() => { if (!isCenter) onSelect(index); }}
    >
      {/* ── THUMBNAIL (shown when no video) ── */}
      {(!showVideo || !loaded) && (
        <div className="ve-card-thumb-wrap">
          {video.thumb
            ? <img src={video.thumb} alt={video.title} className="ve-thumb" draggable={false} />
            : (
              <div className="ve-thumb-placeholder">
                <Play size={36} color="rgba(26,188,156,0.25)" />
              </div>
            )}
          {/* Loader overlay while video loading */}
          {loading && isCenter && <Loader />}
          {/* Play overlay for non-center */}
          {!isCenter && (
            <div className="ve-thumb-overlay">
              <div className="ve-play-icon"><Play size={22} fill="#1abc9c" color="#1abc9c" /></div>
            </div>
          )}
        </div>
      )}

      {/* ── VIDEO (only mounted when active or nearby to preload) ── */}
      {showVideo && (
        <video
          ref={videoRef}
          key={video.src}
          src={video.src}
          className={`ve-inline-video ${loaded ? 've-video-ready' : ''}`}
          loop
          playsInline
          muted={isMuted}
          preload="auto"
          onWaiting={() => setLoading(true)}
          onCanPlay={() => { setLoading(false); setLoaded(true); }}
          onLoadedData={() => { setLoading(false); setLoaded(true); }}
        />
      )}

      {/* ── OVERLAY (always on top) ── */}
      <div className="ve-card-overlay" />

      {/* ── INFO FOOTER ── */}
      <div className={`ve-card-info ${isCenter ? 'visible' : ''}`}>
        <span className="ve-card-label">{video.label}</span>
        <div className="ve-card-title-row">
          <span className="ve-card-title">{video.title}</span>
          {isCenter && (
            <div className="ve-inline-controls">
              <button
                className="ve-ic-btn"
                onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                className="ve-ic-btn"
                onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* card num badge */}
      <span className="ve-card-num">{String(index + 1).padStart(2, '0')}</span>

      {/* active glow line */}
      <div className="ve-card-line" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────── */
export default function VideoEdits() {
  const sectionRef  = useRef(null);
  const headerRef   = useRef(null);
  const stageRef    = useRef(null);   // the 3D carousel container

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted,   setIsMuted]   = useState(true);

  /* touch / mouse drag state */
  const drag = useRef({ active: false, startX: 0, startTime: 0, lastX: 0, velocity: 0 });

  const total = VIDEOS.length;

  /* ── Scroll-trigger header entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const els = headerRef.current.querySelectorAll('.ve-anim');
      gsap.fromTo(els,
        { y: 42, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.09, duration: 0.85, ease: 'expo.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 84%', once: true },
        }
      );
      gsap.fromTo(stageRef.current,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0, duration: 1.0, ease: 'expo.out',
          scrollTrigger: { trigger: stageRef.current, start: 'top 88%', once: true },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  /* ── Navigation ── */
  const goTo = useCallback((idx) => {
    const clamped = ((idx % total) + total) % total;
    setActiveIdx(clamped);
    setIsPlaying(true);
  }, [total]);

  const prev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo]);
  const next = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo]);

  /* ── Pointer / Touch drag (no scroll jank) ── */
  const onDragStart = useCallback((e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    drag.current = { active: true, startX: x, startTime: Date.now(), lastX: x, velocity: 0 };
    // Prevent text selection during drag
    e.currentTarget.style.userSelect = 'none';
  }, []);

  const onDragMove = useCallback((e) => {
    if (!drag.current.active) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    drag.current.velocity = x - drag.current.lastX;
    drag.current.lastX = x;
    // Prevent default scroll on touch so horizontal drag doesn't also scroll page
    if (e.cancelable) e.preventDefault();
  }, []);

  const onDragEnd = useCallback((e) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    e.currentTarget.style.userSelect = '';

    const delta    = drag.current.lastX - drag.current.startX;
    const elapsed  = Date.now() - drag.current.startTime;
    const isFlick  = Math.abs(drag.current.velocity) > 3 && elapsed < 300;

    if (Math.abs(delta) > DRAG_THRESHOLD || isFlick) {
      if (delta < 0) next();
      else prev();
    }
  }, [next, prev]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  /* ── Dynamic stage height based on active card ── */
  const activeVideo = VIDEOS[activeIdx];
  const stageHeight = activeVideo?.orientation === 'portrait' ? 460 : 320;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap');

        /* ── SECTION ─────────────────────── */
        .ve-section {
          background: var(--color-bg-primary, #1e1e2f);
          padding: 96px 0 100px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* ── BACKGROUND ──────────────────── */
        .ve-bg { position:absolute;inset:0;pointer-events:none;overflow:hidden; }
        .ve-bg-blob {
          position:absolute;border-radius:50%;filter:blur(100px);
        }
        .ve-bg-blob-1 {
          width:560px;height:560px;top:-130px;left:-90px;
          background:radial-gradient(circle,rgba(26,188,156,0.07) 0%,transparent 70%);
          animation:ve-blob-float 11s ease-in-out infinite;
        }
        .ve-bg-blob-2 {
          width:480px;height:480px;bottom:-110px;right:-70px;
          background:radial-gradient(circle,rgba(26,188,156,0.05) 0%,transparent 70%);
          animation:ve-blob-float 15s ease-in-out infinite 5s;
        }
        .ve-bg-grid {
          position:absolute;inset:0;
          background-image:
            linear-gradient(rgba(26,188,156,0.028) 1px,transparent 1px),
            linear-gradient(90deg,rgba(26,188,156,0.028) 1px,transparent 1px);
          background-size:52px 52px;
        }
        .ve-scanline {
          position:absolute;inset:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px);
          pointer-events:none;
        }
        @keyframes ve-blob-float {
          0%,100% { transform:translate(0,0) scale(1); }
          40%     { transform:translate(18px,-14px) scale(1.03); }
          70%     { transform:translate(-10px,9px) scale(0.98); }
        }

        /* ── HEADER ──────────────────────── */
        .ve-header {
          max-width:1100px;margin:0 auto;padding:0 32px;
          margin-bottom:56px;
          display:flex;flex-direction:column;align-items:center;text-align:center;
          position:relative;z-index:1;
        }
        .ve-eyebrow {
          display:inline-flex;align-items:center;gap:8px;
          font-family:'Share Tech Mono',monospace;font-size:10px;
          letter-spacing:0.42em;text-transform:uppercase;color:#1abc9c;margin-bottom:14px;
        }
        .ve-eyebrow-dot {
          width:6px;height:6px;border-radius:50%;background:#1abc9c;
          box-shadow:0 0 8px rgba(26,188,156,0.7);
          animation:ve-dot-pulse 2s ease-in-out infinite;
        }
        @keyframes ve-dot-pulse {
          0%,100%{opacity:1;box-shadow:0 0 6px rgba(26,188,156,.7);}
          50%{opacity:.4;box-shadow:none;}
        }
        .ve-title {
          font-family:'Orbitron',sans-serif;
          font-size:clamp(2rem,5vw,3.4rem);font-weight:900;
          letter-spacing:0.04em;line-height:1.1;
          background:linear-gradient(135deg,#f5f5f7 30%,#1abc9c);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          margin-bottom:12px;
        }
        .ve-subtitle {
          font-size:0.92rem;color:var(--color-text-muted,#6b6b80);
          max-width:460px;line-height:1.72;
        }
        .ve-ruler { display:flex;align-items:center;gap:12px;margin-top:22px; }
        .ve-ruler-line { height:1px;width:76px;background:linear-gradient(to right,transparent,rgba(26,188,156,0.5)); }
        .ve-ruler-line-r { background:linear-gradient(to left,transparent,rgba(26,188,156,0.5)); }
        .ve-ruler-gem { width:8px;height:8px;background:#1abc9c;transform:rotate(45deg);box-shadow:0 0 10px rgba(26,188,156,0.65); }

        /* ── STAGE ───────────────────────── */
        .ve-stage-wrap {
          position:relative;z-index:1;
          padding:0 0 24px;
        }

        /* left/right vignette */
        .ve-stage-wrap::before,
        .ve-stage-wrap::after {
          content:'';position:absolute;top:0;bottom:0;width:120px;z-index:10;pointer-events:none;
        }
        .ve-stage-wrap::before {
          left:0;background:linear-gradient(to right,var(--color-bg-primary,#1e1e2f) 0%,transparent 100%);
        }
        .ve-stage-wrap::after {
          right:0;background:linear-gradient(to left,var(--color-bg-primary,#1e1e2f) 0%,transparent 100%);
        }

        .ve-stage {
          position:relative;
          perspective:1200px;
          perspective-origin:50% 50%;
          /* height controlled by inline style so it adapts */
          margin: 0 auto;
          max-width:100%;
          overflow:visible;
          cursor:grab;
          touch-action:pan-y;  /* allow vertical scroll but intercept horizontal */
          user-select:none;
        }
        .ve-stage:active { cursor:grabbing; }

        /* ── CARD ─────────────────────────── */
        .ve-card {
          position:absolute;
          top:0;
          border-radius:18px;
          overflow:hidden;
          background:#111120;
          border:1px solid rgba(26,188,156,0.1);
          box-shadow:0 12px 48px rgba(0,0,0,0.55);
          transition:border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .ve-card.landscape { aspect-ratio:16/9; }
        .ve-card.portrait  { aspect-ratio:9/16;max-height:460px; }
        .ve-card.center {
          border-color:rgba(26,188,156,0.45);
          box-shadow:
            0 0 0 1px rgba(26,188,156,0.12),
            0 20px 60px rgba(0,0,0,0.6),
            0 0 40px rgba(26,188,156,0.1);
          z-index:100 !important;
        }

        /* ── CARD INTERNALS ─────────────── */
        .ve-card-thumb-wrap {
          position:absolute;inset:0;
          background:#0d0d1e;
        }
        .ve-thumb {
          width:100%;height:100%;object-fit:cover;display:block;
          transition:transform 0.5s ease;
        }
        .ve-card:hover .ve-thumb { transform:scale(1.03); }
        .ve-thumb-placeholder {
          width:100%;height:100%;
          display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#1a1a2e,#111120);
        }
        .ve-thumb-overlay {
          position:absolute;inset:0;
          background:rgba(10,10,20,0.35);
          display:flex;align-items:center;justify-content:center;
          transition:background 0.3s ease;
        }
        .ve-card:hover .ve-thumb-overlay { background:rgba(10,10,20,0.55); }
        .ve-play-icon {
          width:48px;height:48px;border-radius:50%;
          background:rgba(26,188,156,0.15);
          border:1.5px solid rgba(26,188,156,0.45);
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.25s ease, background 0.25s ease;
        }
        .ve-card:hover .ve-play-icon {
          transform:scale(1.1);
          background:rgba(26,188,156,0.25);
          box-shadow:0 0 20px rgba(26,188,156,0.3);
        }

        /* inline video — crossfades in */
        .ve-inline-video {
          position:absolute;inset:0;
          width:100%;height:100%;
          object-fit:cover;
          opacity:0;
          transition:opacity 0.5s ease;
          background:#000;
        }
        .ve-inline-video.ve-video-ready { opacity:1; }

        /* overlay gradient */
        .ve-card-overlay {
          position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(0deg,rgba(10,10,22,0.88) 0%,rgba(10,10,22,0.18) 45%,transparent 100%);
          transition:opacity 0.35s ease;
          z-index:2;
        }
        .ve-card.center .ve-card-overlay {
          background:linear-gradient(0deg,rgba(10,10,22,0.82) 0%,rgba(10,10,22,0.1) 40%,transparent 100%);
        }

        /* card info */
        .ve-card-info {
          position:absolute;bottom:0;left:0;right:0;
          padding:14px 16px 16px;
          z-index:3;
          transform:translateY(6px);
          opacity:0;
          transition:transform 0.35s ease, opacity 0.35s ease;
        }
        .ve-card-info.visible,
        .ve-card:hover .ve-card-info {
          opacity:1;transform:translateY(0);
        }
        .ve-card-label {
          display:block;font-family:'Share Tech Mono',monospace;
          font-size:8px;letter-spacing:0.32em;text-transform:uppercase;
          color:#1abc9c;margin-bottom:4px;
        }
        .ve-card-title-row {
          display:flex;align-items:center;justify-content:space-between;gap:10px;
        }
        .ve-card-title {
          font-family:'Orbitron',sans-serif;
          font-size:0.82rem;font-weight:700;color:#f0f0f8;
          letter-spacing:0.03em;line-height:1.25;
        }
        .ve-card.portrait .ve-card-title { font-size:0.72rem; }

        /* inline video controls */
        .ve-inline-controls {
          display:flex;gap:6px;flex-shrink:0;
        }
        .ve-ic-btn {
          width:30px;height:30px;border-radius:50%;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.14);
          color:#f0f0f8;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;
          transition:background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .ve-ic-btn:hover {
          background:rgba(26,188,156,0.2);
          border-color:rgba(26,188,156,0.5);
          color:#1abc9c;
          transform:scale(1.1);
        }

        /* card number */
        .ve-card-num {
          position:absolute;top:11px;left:13px;z-index:3;
          font-family:'Share Tech Mono',monospace;
          font-size:9px;letter-spacing:0.22em;color:rgba(26,188,156,0.45);
        }

        /* bottom accent line */
        .ve-card-line {
          position:absolute;bottom:0;left:0;right:0;height:2px;z-index:4;
          background:linear-gradient(90deg,transparent,#1abc9c,transparent);
          transform:scaleX(0);transition:transform 0.45s ease;
        }
        .ve-card.center .ve-card-line { transform:scaleX(1); }

        /* ── LOADER ─────────────────────── */
        .ve-loader {
          position:absolute;inset:0;z-index:5;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:10px;background:rgba(10,10,22,0.6);
          backdrop-filter:blur(4px);
        }
        .ve-loader-ring {
          width:44px;height:44px;
          animation:ve-loader-spin 0.9s linear infinite;
        }
        @keyframes ve-loader-spin { to{transform:rotate(360deg);} }
        .ve-loader-arc { transform-origin:center; }
        .ve-loader-txt {
          font-family:'Share Tech Mono',monospace;font-size:9px;
          letter-spacing:0.3em;text-transform:uppercase;color:rgba(26,188,156,0.6);
        }

        /* ── NAV ARROWS ─────────────────── */
        .ve-nav-btn {
          position:absolute;top:50%;transform:translateY(-50%);
          z-index:20;
          width:46px;height:46px;border-radius:50%;
          background:rgba(26,188,156,0.08);
          border:1px solid rgba(26,188,156,0.22);
          color:#1abc9c;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;
          transition:background 0.22s ease, border-color 0.22s ease, transform 0.2s ease, box-shadow 0.22s ease;
          /* sit just outside stage on desktop */
        }
        .ve-nav-btn:hover {
          background:rgba(26,188,156,0.18);
          border-color:rgba(26,188,156,0.5);
          box-shadow:0 0 18px rgba(26,188,156,0.22);
          transform:translateY(-50%) scale(1.08);
        }
        .ve-nav-btn:active { transform:translateY(-50%) scale(0.96); }
        .ve-nav-prev { left:24px; }
        .ve-nav-next { right:24px; }

        /* ── DOTS ────────────────────────── */
        .ve-dots-row {
          display:flex;align-items:center;justify-content:center;
          gap:8px;margin-top:28px;position:relative;z-index:1;
        }
        .ve-dot {
          height:3px;border-radius:9999px;
          background:rgba(26,188,156,0.18);
          cursor:pointer;
          transition:width 0.35s ease, background 0.35s ease, box-shadow 0.35s ease;
        }
        .ve-dot.active {
          background:#1abc9c;
          box-shadow:0 0 8px rgba(26,188,156,0.55);
        }

        /* ── RESPONSIVE ─────────────────── */
        @media (max-width:768px) {
          .ve-section { padding:64px 0 80px; }
          .ve-header  { padding:0 18px;margin-bottom:36px; }
          .ve-stage-wrap::before,
          .ve-stage-wrap::after { width:32px; }
          .ve-nav-prev { left:10px; }
          .ve-nav-next { right:10px; }
          .ve-nav-btn  { width:38px;height:38px; }
        }
        @media (max-width:480px) {
          .ve-title { font-size:1.85rem; }
        }
      `}</style>

      <section className="ve-section" ref={sectionRef} id="edits">

        {/* Background */}
        <div className="ve-bg">
          <div className="ve-bg-blob ve-bg-blob-1" />
          <div className="ve-bg-blob ve-bg-blob-2" />
          <div className="ve-bg-grid" />
          <div className="ve-scanline" />
        </div>

        {/* ── HEADER ── */}
        <div className="ve-header" ref={headerRef}>
          <div className="ve-eyebrow ve-anim">
            <div className="ve-eyebrow-dot" />
            Video Editing
          </div>
          <h2 className="ve-title ve-anim">Creative Edits</h2>
          <p className="ve-subtitle ve-anim">
            A curated showcase of video work — cinematic reels to snappy short-form content.
          </p>
          <div className="ve-ruler ve-anim">
            <div className="ve-ruler-line" />
            <div className="ve-ruler-gem" />
            <div className="ve-ruler-line ve-ruler-line-r" />
          </div>
        </div>

        {/* ── CAROUSEL ── */}
        <div className="ve-stage-wrap">

          {/* Left / Right nav — outside the drag zone */}
          <button className="ve-nav-btn ve-nav-prev" onClick={prev} aria-label="Previous">
            <ChevronLeft size={20} />
          </button>
          <button className="ve-nav-btn ve-nav-next" onClick={next} aria-label="Next">
            <ChevronRight size={20} />
          </button>

          {/* 3-D stage */}
          <div
            ref={stageRef}
            className="ve-stage"
            style={{ height: stageHeight, opacity: 0 }}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
          >
            {VIDEOS.map((video, i) => (
              <VideoCard
                key={video.id}
                video={video}
                index={i}
                activeIdx={activeIdx}
                total={total}
                onSelect={goTo}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
              />
            ))}
          </div>
        </div>

        {/* ── DOTS ── */}
        <div className="ve-dots-row">
          {VIDEOS.map((_, i) => (
            <div
              key={i}
              className={`ve-dot ${i === activeIdx ? 'active' : ''}`}
              style={{ width: i === activeIdx ? 30 : 10 }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

      </section>
    </>
  );
}