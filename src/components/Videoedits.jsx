import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, Pause, ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { VIDEOS } from '../../data';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────
// REPLACE these with your actual video files
// Put videos in /public/videos/
// orientation: 'landscape' (16:9) | 'portrait' (9:16)
// ─────────────────────────────────────────────


export default function VideoEdits() {
  const sectionRef = useRef();
  const trackRef = useRef();
  const headerRef = useRef();
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null); // { video, idx }
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const lightboxVideoRef = useRef();
  const cardRefs = useRef([]);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const total = VIDEOS.length;

  // ── Scroll entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header
      gsap.from(headerRef.current.querySelectorAll('.ve-anim'), {
        y: 48, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 82%', toggleActions: 'play none none none' },
      });

      // Cards stagger reveal
      gsap.from(cardRefs.current, {
        y: 60, opacity: 0, stagger: 0.1, duration: 0.85, ease: 'expo.out',
        scrollTrigger: { trigger: trackRef.current, start: 'top 85%', toggleActions: 'play none none none' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // ── Active card scale pulse
  useEffect(() => {
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      gsap.to(card, {
        scale: i === activeIdx ? 1.03 : 1,
        duration: 0.45,
        ease: 'power2.out',
      });
    });
  }, [activeIdx]);

  // ── Smooth scroll to card
  const scrollToCard = useCallback((idx) => {
    const card = cardRefs.current[idx];
    const track = trackRef.current;
    if (!card || !track) return;
    const cardLeft = card.offsetLeft;
    const trackWidth = track.clientWidth;
    const cardWidth = card.offsetWidth;
    const target = cardLeft - (trackWidth / 2) + (cardWidth / 2);
    gsap.to(track, { scrollLeft: target, duration: 0.6, ease: 'power3.inOut' });
    setActiveIdx(idx);
  }, []);

  const prev = () => scrollToCard((activeIdx - 1 + total) % total);
  const next = () => scrollToCard((activeIdx + 1) % total);

  // ── Drag / swipe
  const onPointerDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX || e.touches?.[0]?.clientX;
    dragStartScroll.current = trackRef.current.scrollLeft;
    trackRef.current.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const x = e.clientX || e.touches?.[0]?.clientX;
    const delta = dragStartX.current - x;
    trackRef.current.scrollLeft = dragStartScroll.current + delta;
  };
  const onPointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    trackRef.current.style.cursor = 'grab';
    // Snap to nearest
    const x = e.clientX || e.changedTouches?.[0]?.clientX;
    const delta = dragStartX.current - x;
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev();
    } else {
      scrollToCard(activeIdx);
    }
  };

  // ── Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (lightbox) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') openLightbox((lightbox.idx - 1 + total) % total);
        if (e.key === 'ArrowRight') openLightbox((lightbox.idx + 1) % total);
      } else {
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, activeIdx]);

  // ── Lightbox
  const openLightbox = (idx) => {
    setLightbox({ video: VIDEOS[idx], idx });
    setPlaying(true);
    document.body.style.overflow = 'hidden';
    // Animate in
    gsap.fromTo('.ve-lightbox-inner', { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.4)' });
  };
  const closeLightbox = () => {
    gsap.to('.ve-lightbox-inner', {
      scale: 0.88, opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => { setLightbox(null); document.body.style.overflow = ''; },
    });
  };

  useEffect(() => {
    if (lightboxVideoRef.current) {
      lightboxVideoRef.current.muted = muted;
      playing ? lightboxVideoRef.current.play() : lightboxVideoRef.current.pause();
    }
  }, [playing, muted, lightbox]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap');

        .ve-section {
          background: var(--color-bg-primary, #1e1e2f);
          padding: 100px 0 120px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* ── Bg decorations ── */
        .ve-bg {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        }
        .ve-bg-blob {
          position: absolute; border-radius: 50%; filter: blur(100px);
        }
        .ve-bg-blob-1 {
          width: 600px; height: 600px;
          top: -150px; left: -100px;
          background: radial-gradient(circle, rgba(26,188,156,0.07) 0%, transparent 70%);
          animation: float-soft 10s ease-in-out infinite;
        }
        .ve-bg-blob-2 {
          width: 500px; height: 500px;
          bottom: -120px; right: -80px;
          background: radial-gradient(circle, rgba(26,188,156,0.05) 0%, transparent 70%);
          animation: float-soft 13s ease-in-out infinite 5s;
        }
        .ve-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(26,188,156,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,188,156,0.03) 1px, transparent 1px);
          background-size: 52px 52px;
        }
        .ve-scanline {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.04) 3px,
            rgba(0,0,0,0.04) 4px
          );
          pointer-events: none;
        }

        /* ── Header ── */
        .ve-header {
          max-width: 1200px; margin: 0 auto;
          padding: 0 32px;
          margin-bottom: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative; z-index: 1;
        }
        .ve-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase;
          color: #1abc9c; margin-bottom: 14px;
        }
        .ve-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #1abc9c; box-shadow: 0 0 8px rgba(26,188,156,0.7);
          animation: ct-dot-pulse 2s ease-in-out infinite;
        }
        .ve-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 900; letter-spacing: 0.04em; line-height: 1.1;
          background: linear-gradient(135deg, #f5f5f7 30%, #1abc9c);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          margin-bottom: 14px;
        }
        .ve-subtitle {
          font-size: 0.95rem; color: var(--color-text-muted, #6b6b80);
          max-width: 480px; line-height: 1.7;
        }
        .ve-ruler {
          display: flex; align-items: center; gap: 12px; margin-top: 24px;
        }
        .ve-ruler-line {
          height: 1px; width: 80px;
          background: linear-gradient(to right, transparent, rgba(26,188,156,0.5));
        }
        .ve-ruler-line-r {
          background: linear-gradient(to left, transparent, rgba(26,188,156,0.5));
        }
        .ve-ruler-gem {
          width: 8px; height: 8px; background: #1abc9c;
          transform: rotate(45deg);
          box-shadow: 0 0 12px rgba(26,188,156,0.6);
        }

        /* ── Carousel wrapper ── */
        .ve-carousel-wrap {
          position: relative; z-index: 1;
        }

        /* ── Track ── */
        .ve-track {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          scroll-behavior: auto;
          cursor: grab;
          padding: 32px 40px 48px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          /* hide scrollbar */
          scrollbar-width: none;
        }
        .ve-track::-webkit-scrollbar { display: none; }
        .ve-track:active { cursor: grabbing; }

        /* left/right fade edges */
        .ve-carousel-wrap::before,
        .ve-carousel-wrap::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          z-index: 2;
          pointer-events: none;
        }
        .ve-carousel-wrap::before {
          left: 0;
          background: linear-gradient(to right, var(--color-bg-primary, #1e1e2f), transparent);
        }
        .ve-carousel-wrap::after {
          right: 0;
          background: linear-gradient(to left, var(--color-bg-primary, #1e1e2f), transparent);
        }

        /* ── Card ── */
        .ve-card {
          flex-shrink: 0;
          scroll-snap-align: center;
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          background: #252538;
          border: 1px solid rgba(26,188,156,0.12);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          will-change: transform;
        }
        .ve-card.landscape {
          width: 420px;
          aspect-ratio: 16 / 9;
        }
        .ve-card.portrait {
          width: 220px;
          aspect-ratio: 9 / 16;
          max-height: 390px;
        }
        .ve-card.active {
          border-color: rgba(26,188,156,0.55);
          box-shadow:
            0 0 0 1px rgba(26,188,156,0.15),
            0 12px 48px rgba(0,0,0,0.5),
            0 0 32px rgba(26,188,156,0.12);
        }
        .ve-card:hover {
          border-color: rgba(26,188,156,0.4);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(26,188,156,0.1);
        }

        /* Thumbnail */
        .ve-thumb {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }
        .ve-card:hover .ve-thumb {
          transform: scale(1.04);
        }

        /* Overlay */
        .ve-card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(0deg, rgba(15,15,30,0.85) 0%, rgba(15,15,30,0.2) 50%, transparent 100%);
          transition: background 0.3s ease;
        }
        .ve-card:hover .ve-card-overlay {
          background: linear-gradient(0deg, rgba(15,15,30,0.9) 0%, rgba(15,15,30,0.35) 60%, transparent 100%);
        }

        /* Play button */
        .ve-play-btn {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0.85);
          width: 52px; height: 52px;
          border-radius: 50%;
          background: rgba(26,188,156,0.15);
          border: 1.5px solid rgba(26,188,156,0.5);
          display: flex; align-items: center; justify-content: center;
          color: #1abc9c;
          transition: all 0.25s ease;
          opacity: 0;
        }
        .ve-card:hover .ve-play-btn,
        .ve-card.active .ve-play-btn {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .ve-card:hover .ve-play-btn {
          background: rgba(26,188,156,0.25);
          box-shadow: 0 0 24px rgba(26,188,156,0.3);
        }

        /* Card info */
        .ve-card-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 16px;
          transform: translateY(4px);
          transition: transform 0.3s ease;
        }
        .ve-card:hover .ve-card-info { transform: translateY(0); }
        .ve-card-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase;
          color: #1abc9c; margin-bottom: 4px; display: block;
        }
        .ve-card-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.85rem; font-weight: 700;
          color: #f5f5f7; letter-spacing: 0.03em;
        }
        .ve-card.portrait .ve-card-title { font-size: 0.75rem; }

        /* Active border glow bottom line */
        .ve-card-line {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #1abc9c, transparent);
          transform: scaleX(0); transition: transform 0.4s ease;
        }
        .ve-card.active .ve-card-line { transform: scaleX(1); }

        /* Card number */
        .ve-card-num {
          position: absolute; top: 12px; left: 14px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(26,188,156,0.4);
        }

        /* ── Controls ── */
        .ve-controls {
          display: flex; align-items: center; justify-content: center;
          gap: 24px; margin-top: 8px; padding: 0 32px;
          position: relative; z-index: 1;
        }
        .ve-ctrl-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(26,188,156,0.07);
          border: 1px solid rgba(26,188,156,0.2);
          color: #1abc9c;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ve-ctrl-btn:hover {
          background: rgba(26,188,156,0.15);
          border-color: rgba(26,188,156,0.5);
          transform: scale(1.08);
          box-shadow: 0 0 14px rgba(26,188,156,0.2);
        }

        /* Dots */
        .ve-dots {
          display: flex; gap: 8px; align-items: center;
        }
        .ve-dot {
          height: 3px; border-radius: 9999px;
          background: rgba(26,188,156,0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .ve-dot.active {
          background: #1abc9c;
          box-shadow: 0 0 8px rgba(26,188,156,0.5);
        }

        /* ── LIGHTBOX ── */
        .ve-lightbox {
          position: fixed; inset: 0;
          background: rgba(10,10,20,0.95);
          z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(12px);
        }
        .ve-lightbox-inner {
          position: relative;
          display: flex; flex-direction: column;
          align-items: center; gap: 16px;
          max-width: 90vw;
          will-change: transform;
        }
        .ve-lightbox-video {
          border-radius: 12px;
          border: 1px solid rgba(26,188,156,0.3);
          box-shadow: 0 0 60px rgba(0,0,0,0.7), 0 0 30px rgba(26,188,156,0.1);
          background: #000;
          display: block;
        }
        .ve-lightbox-video.landscape {
          width: min(880px, 90vw);
          height: auto;
          max-height: 80vh;
        }
        .ve-lightbox-video.portrait {
          height: min(80vh, 700px);
          width: auto;
          max-width: 90vw;
        }

        /* Lightbox controls bar */
        .ve-lb-bar {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%;
          padding: 0 4px;
        }
        .ve-lb-title-wrap {
          display: flex; flex-direction: column; gap: 2px;
        }
        .ve-lb-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase;
          color: #1abc9c;
        }
        .ve-lb-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.95rem; font-weight: 700; color: #f5f5f7;
        }
        .ve-lb-btns {
          display: flex; gap: 10px; align-items: center;
        }
        .ve-lb-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #f5f5f7;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ve-lb-btn:hover {
          background: rgba(26,188,156,0.15);
          border-color: rgba(26,188,156,0.4);
          color: #1abc9c;
        }
        .ve-lb-btn.close:hover {
          background: rgba(231,76,60,0.15);
          border-color: rgba(231,76,60,0.4);
          color: #e74c3c;
        }

        /* Lightbox nav arrows */
        .ve-lb-nav {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(26,188,156,0.1);
          border: 1px solid rgba(26,188,156,0.25);
          color: #1abc9c;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
        }
        .ve-lb-nav:hover {
          background: rgba(26,188,156,0.2);
          box-shadow: 0 0 16px rgba(26,188,156,0.25);
        }
        .ve-lb-nav.left { left: -64px; }
        .ve-lb-nav.right { right: -64px; }
        @media (max-width: 768px) {
          .ve-lb-nav { display: none; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .ve-section { padding: 72px 0 90px; }
          .ve-header { padding: 0 20px; margin-bottom: 40px; }
          .ve-track { padding: 20px 20px 36px; gap: 16px; }
          .ve-card.landscape { width: calc(85vw); }
          .ve-card.portrait { width: calc(55vw); max-height: 340px; }
          .ve-carousel-wrap::before,
          .ve-carousel-wrap::after { width: 24px; }
          .ve-controls { gap: 16px; }
        }
        @media (max-width: 480px) {
          .ve-card.landscape { width: calc(88vw); }
          .ve-card.portrait { width: calc(60vw); max-height: 300px; }
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

        {/* ── Header ── */}
        <div className="ve-header" ref={headerRef}>
          <div className="ve-eyebrow ve-anim">
            <div className="ve-eyebrow-dot" />
            Video Editing
          </div>
          <h2 className="ve-title ve-anim">Creative Edits</h2>
          <p className="ve-subtitle ve-anim">
            A curated showcase of video work — from cinematic reels to snappy short-form content.
          </p>
          <div className="ve-ruler ve-anim">
            <div className="ve-ruler-line" />
            <div className="ve-ruler-gem" />
            <div className="ve-ruler-line ve-ruler-line-r" />
          </div>
        </div>

        {/* ── Carousel ── */}
        <div className="ve-carousel-wrap">
          <div
            className="ve-track"
            ref={trackRef}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          >
            {/* spacer start */}
            <div style={{ flexShrink: 0, width: 'max(60px, calc(50vw - 220px))' }} />

            {VIDEOS.map((video, i) => (
              <div
                key={video.id}
                ref={(el) => (cardRefs.current[i] = el)}
                className={`ve-card ${video.orientation} ${i === activeIdx ? 'active' : ''}`}
                onClick={() => {
                  if (Math.abs(dragStartX.current - (window.event?.clientX || dragStartX.current)) < 5) {
                    scrollToCard(i);
                    openLightbox(i);
                  }
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                {/* Thumbnail */}
                {video.thumb
                  ? <img className="ve-thumb" src={video.thumb} alt={video.title} draggable={false} />
                  : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: `linear-gradient(135deg, #252538 0%, #1a1a2e 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Play size={32} color="rgba(26,188,156,0.3)" />
                    </div>
                  )
                }

                <div className="ve-card-overlay" />

                {/* Number */}
                <span className="ve-card-num">{String(i + 1).padStart(2, '0')}</span>

                {/* Play icon */}
                <div className="ve-play-btn">
                  <Play size={20} fill="#1abc9c" />
                </div>

                {/* Info */}
                <div className="ve-card-info">
                  <span className="ve-card-label">{video.label}</span>
                  <div className="ve-card-title">{video.title}</div>
                </div>

                {/* Active line */}
                <div className="ve-card-line" />
              </div>
            ))}

            {/* spacer end */}
            <div style={{ flexShrink: 0, width: 'max(60px, calc(50vw - 220px))' }} />
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="ve-controls">
          <button className="ve-ctrl-btn" onClick={prev} aria-label="Previous">
            <ChevronLeft size={20} />
          </button>

          <div className="ve-dots">
            {VIDEOS.map((_, i) => (
              <div
                key={i}
                className={`ve-dot ${i === activeIdx ? 'active' : ''}`}
                style={{ width: i === activeIdx ? 28 : 10 }}
                onClick={() => scrollToCard(i)}
              />
            ))}
          </div>

          <button className="ve-ctrl-btn" onClick={next} aria-label="Next">
            <ChevronRight size={20} />
          </button>
        </div>

      </section>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className="ve-lightbox" onClick={(e) => { if (e.target.classList.contains('ve-lightbox')) closeLightbox(); }}>
          <div className="ve-lightbox-inner">

            {/* Side nav */}
            <button className="ve-lb-nav left" onClick={() => openLightbox((lightbox.idx - 1 + total) % total)}>
              <ChevronLeft size={20} />
            </button>
            <button className="ve-lb-nav right" onClick={() => openLightbox((lightbox.idx + 1) % total)}>
              <ChevronRight size={20} />
            </button>

            {/* Video */}
            <video
              ref={lightboxVideoRef}
              key={lightbox.video.src}
              className={`ve-lightbox-video ${lightbox.video.orientation}`}
              src={lightbox.video.src}
              autoPlay
              loop
              muted={muted}
              playsInline
              controls={false}
            />

            {/* Bottom bar */}
            <div className="ve-lb-bar">
              <div className="ve-lb-title-wrap">
                <span className="ve-lb-label">{lightbox.video.label}</span>
                <span className="ve-lb-title">{lightbox.video.title}</span>
              </div>
              <div className="ve-lb-btns">
                <button className="ve-lb-btn" onClick={() => setPlaying(!playing)} aria-label="Play/Pause">
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="ve-lb-btn" onClick={() => setMuted(!muted)} aria-label="Mute">
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button className="ve-lb-btn close" onClick={closeLightbox} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}