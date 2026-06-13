import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tokens } from './themeTokens.js';
import { i18n } from './translations.js';

// Thomas Reolon portfolio - theme-aware, mobile preview, projects menu, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "mobile": false
}/*EDITMODE-END*/;

// Shared frosted-glass surface treatment so every floating element reads as one family.
const glass = (T, blur = 14) => ({
  background: T.cardBg,
  border: '1px solid ' + T.cardBorder,
  backdropFilter: `blur(${blur}px) saturate(140%)`,
  WebkitBackdropFilter: `blur(${blur}px) saturate(140%)`,
});

// ---------- Tweaks plumbing ----------
function useTweaks() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const setTweak = (key, value) => {
    setTweaks((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
      } catch (_) {}
      return next;
    });
  };
  return [tweaks, setTweak];
}

function TweaksPanel({ tweaks, setTweak, theme }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setShow(true);
      if (e.data.type === '__deactivate_edit_mode') setShow(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (_) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  if (!show) return null;
  const dark = theme === 'dark';
  const close = () => {
    setShow(false);
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (_) {}
  };
  return (
    <div
      className="fixed bottom-6 right-6 w-72 rounded-xl shadow-2xl backdrop-blur-md p-5"
      style={{
        zIndex: 60,
        background: dark ? 'rgba(20,18,30,0.85)' : 'rgba(255,250,242,0.92)',
        color: dark ? '#e8e2d8' : '#2a1a14',
        border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-70">Tweaks</span>
        <button onClick={close} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
      </div>
      <div className="space-y-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-2">Theme</div>
          <div className="flex gap-2">
            {[['light', 'Day'], ['dark', 'Night']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTweak('theme', k)}
                className="flex-1 py-2 rounded-md text-sm transition"
                style={{
                  background: tweaks.theme === k ? (dark ? '#e8e2d8' : '#2a1a14') : 'transparent',
                  color: tweaks.theme === k ? (dark ? '#1a1428' : '#fbeed8') : 'inherit',
                  border: '1px solid ' + (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                }}
              >{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-2">Viewport</div>
          <div className="flex gap-2">
            {[[false, 'Desktop'], [true, 'Mobile']].map(([k, l]) => (
              <button
                key={l}
                onClick={() => setTweak('mobile', k)}
                className="flex-1 py-2 rounded-md text-sm transition"
                style={{
                  background: tweaks.mobile === k ? (dark ? '#e8e2d8' : '#2a1a14') : 'transparent',
                  color: tweaks.mobile === k ? (dark ? '#1a1428' : '#fbeed8') : 'inherit',
                  border: '1px solid ' + (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                }}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Scene wiring ----------
function useScrollScene(canvasRef, theme, scrollerRef, mobile) {
  const sceneRef = useRef(null);
  const triggerRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (sceneRef.current) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    (async () => {
      const mod = await import('./scene.js');
      if (cancelled || sceneRef.current) return;
      sceneRef.current = mod.createScene(canvasRef.current);
      setSceneReady(true);
    })();
    return () => {
      cancelled = true;
      setSceneReady(false);
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    if (triggerRef.current) {
      triggerRef.current.kill();
      triggerRef.current = null;
    }
    const trigger = ScrollTrigger.create({
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.35,
      scroller: mobile ? scrollerRef.current : undefined,
      onUpdate: (self) => sceneRef.current && sceneRef.current.setProgress(self.progress),
    });
    triggerRef.current = trigger;
    ScrollTrigger.refresh();
    return () => {
      trigger.kill();
      if (triggerRef.current === trigger) triggerRef.current = null;
    };
  }, [mobile, scrollerRef, sceneReady]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.setTheme(theme);
  }, [theme]);
}

// ---------- Scroll-triggered reveal ----------
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ---------- Active section tracking (journey rail) ----------
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      // Narrow horizontal band around the viewport center decides the current chapter.
      { rootMargin: '-45% 0px -45% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids.join(',')]);
  return active;
}

function JourneyRail({ T, L }) {
  const items = [
    { id: 'hero', label: L.rail.hero },
    { id: 'finance', label: L.rail.finance },
    { id: 'ai', label: L.rail.ai },
    { id: 'real-estate', label: L.rail.realEstate },
    { id: 'altro', label: L.rail.more },
    { id: 'contact', label: L.rail.contact },
  ];
  const active = useActiveSection(items.map((i) => i.id));
  return (
    <nav
      aria-label="Journey progress"
      className="fixed right-7 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-end gap-5"
      style={{ zIndex: 30 }}
    >
      {items.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <a key={id} href={'#' + id} className="group flex items-center gap-3" aria-label={label}>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.25em] transition-opacity duration-300"
              style={{
                color: T.onScene,
                textShadow: T.onSceneShadow,
                opacity: isActive ? 0.95 : 0,
              }}
            >
              <span className="group-hover:opacity-95 transition-opacity duration-300" style={{ opacity: isActive ? 1 : undefined }}>
                {label}
              </span>
            </span>
            <span
              className="rounded-full transition-all duration-500"
              style={{
                width: isActive ? 22 : 6,
                height: 6,
                background: isActive ? T.onScene : 'transparent',
                border: '1px solid ' + T.onScene,
                opacity: isActive ? 0.95 : 0.55,
                boxShadow: isActive ? T.onSceneShadow.replace('text-shadow', '') : 'none',
              }}
            />
          </a>
        );
      })}
    </nav>
  );
}

// ---------- Theme toggle ----------
function ThemeToggle({ theme, onToggle, T }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-full transition-transform duration-200 hover:scale-105"
      style={{ ...glass(T, 10), color: T.heading }}
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

// ---------- Language toggle ----------
function LangToggle({ lang, onChange, T }) {
  return (
    <div
      className="flex items-center font-mono text-[11px] tracking-[0.2em] rounded-full overflow-hidden h-9"
      style={glass(T, 10)}
    >
      {['en', 'it'].map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => onChange(l)}
            aria-label={'Switch to ' + l.toUpperCase()}
            className="px-3 h-full transition-colors duration-200"
            style={{
              background: active ? T.heading : 'transparent',
              color: active ? T.bg : T.heading,
              opacity: active ? 1 : 0.6,
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Projects nav (top right) ----------
function ProjectsMenu({ T, L }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);
  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2.5 h-9 px-4 rounded-full font-mono text-[11px] tracking-[0.25em] uppercase transition-transform duration-200 hover:scale-[1.03]"
        style={{ ...glass(T, 10), color: T.heading }}
      >
        <span className="hidden md:inline">{L.nav.projects}</span>
        <svg
          className="hidden md:block transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
        <svg className="md:hidden" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="14" y2="4.5" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="11.5" x2="14" y2="11.5" />
        </svg>
      </button>
      {open && (
        <div
          className="menu-pop absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden"
          style={{ ...glass(T, 18), boxShadow: '0 24px 50px -18px rgba(0,0,0,0.35)' }}
        >
          {L.nav.items.map((p, i) => (
            <a
              key={p.id}
              href={'#' + p.id}
              onClick={() => setOpen(false)}
              className="group flex justify-between items-center px-5 py-3.5 text-sm transition-colors duration-150"
              style={{
                color: T.heading,
                borderTop: i === 0 ? 'none' : '1px solid ' + T.hairline,
              }}
            >
              <span className="transition-transform duration-200 group-hover:translate-x-1">{p.label}</span>
              <span className="font-mono text-[10px] tracking-[0.2em] opacity-45 group-hover:opacity-100 transition-opacity" style={{ color: T.accent }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Hero with exploding letters ----------
function SplitLetters({ text, color, shadow, filter }) {
  const chars = [...text];
  return (
    <span aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="hero-letter inline-block"
          style={{ whiteSpace: 'pre', color, textShadow: shadow, filter }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

function Hero({ T, L }) {
  const heroRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!titleRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const letters = titleRef.current.querySelectorAll('.hero-letter');
    const targets = Array.from(letters).map((_, i) => {
      const angle = (i * 137.5 * Math.PI) / 180;
      const dist = 560 + ((i * 173) % 300);
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.5 - 30,
        rot: ((i * 35) % 360) - 180,
      };
    });

    const tween = gsap.to(letters, {
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'top top',
        end: '48% top',
        scrub: 0.3,
      },
      x: (i) => targets[i].x,
      y: (i) => targets[i].y,
      rotate: (i) => targets[i].rot,
      opacity: 0,
      ease: 'power2.out',
      stagger: { amount: 0.1, from: 'center' },
    });

    return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); };
  }, []);

  // Entrance staggers animate wrappers only, so they never fight the letter scroll-tween.
  const stagger = (delay) => ({ animationDelay: delay + 's' });

  return (
    <section
      id="hero"
      ref={heroRef}
      data-screen-label="01 Hero"
      className="relative min-h-screen flex flex-col px-8 md:px-16 py-10"
    >
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <p
          className="hero-stagger font-mono text-[11px] md:text-[12px] tracking-[0.42em] uppercase mb-8 md:mb-10 flex items-center gap-4"
          style={{ color: T.heroSub, textShadow: T.heroSubShadow, ...stagger(0.1) }}
        >
          <span className="hidden md:inline-block h-px w-10" style={{ background: 'currentColor', opacity: 0.5 }} />
          {L.hero.eyebrow}
          <span className="hidden md:inline-block h-px w-10" style={{ background: 'currentColor', opacity: 0.5 }} />
        </p>
        <h1
          ref={titleRef}
          className="font-display-black text-[17vw] md:text-[clamp(5.5rem,11.5vw,11rem)] leading-[0.92] select-none"
        >
          <div className="hero-stagger block" style={stagger(0.25)}>
            <SplitLetters text="THOMAS" color={T.titleHero} shadow={T.titleHeroShadow} filter={T.titleHeroFilter} />
          </div>
          <div className="hero-stagger block" style={stagger(0.4)}>
            <SplitLetters text="REOLON" color={T.titleHero} shadow={T.titleHeroShadow} filter={T.titleHeroFilter} />
          </div>
        </h1>
        <p
          className="hero-stagger mt-10 md:mt-12 max-w-xl text-lg md:text-[22px] leading-relaxed font-medium"
          style={{ color: T.heroSub, textShadow: T.heroSubShadow, ...stagger(0.6) }}
        >
          {L.hero.subtitle}
        </p>
      </div>

      <footer
        className="hero-stagger flex flex-col items-center gap-3 pb-2"
        style={{ color: T.onScene, textShadow: T.onSceneShadow, ...stagger(0.95) }}
      >
        <span className="font-mono text-[10px] tracking-[0.42em] uppercase">{L.hero.scroll}</span>
        <span className="scroll-cue-line" aria-hidden />
      </footer>
    </section>
  );
}

// ---------- Chapters ----------
function ChapterHeading({ index, label, T, L }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
      <span className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: T.accent }}>
        {L.chapterPrefix} {String(index).padStart(2, '0')}
      </span>
      <h2 className="font-display text-3xl md:text-4xl" style={{ color: T.heading }}>
        {label}
      </h2>
    </div>
  );
}

function ProjectRow({ T, L, index, title, blurb, href, divider }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block"
      style={{ borderTop: divider ? '1px solid ' + T.hairline : 'none' }}
    >
      <div className="flex items-start gap-5 md:gap-7 py-6 md:py-7">
        <span
          className="font-mono text-[11px] tracking-[0.25em] pt-2 shrink-0 transition-colors duration-300"
          style={{ color: T.muted }}
        >
          {String(index).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3
              className="font-display text-[22px] md:text-[26px] leading-tight transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: T.heading }}
            >
              {title}
            </h3>
          </div>
          <p className="mt-2 text-[14px] md:text-[15px] leading-relaxed" style={{ color: T.body, opacity: 0.88 }}>
            {blurb}
          </p>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10.5px] tracking-wider" style={{ color: T.accent }}>
            <span className="uppercase tracking-[0.22em] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              {L.visit}
            </span>
            <span className="truncate opacity-55 group-hover:opacity-90 transition-opacity duration-300" style={{ color: T.mono }}>
              {href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          </div>
        </div>
        <span
          className="shrink-0 mt-1 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group-hover:-translate-y-0.5"
          style={{
            border: '1px solid ' + T.hairline,
            color: T.heading,
          }}
          aria-hidden
        >
          <svg
            className="transition-transform duration-300 group-hover:translate-x-[1.5px] group-hover:-translate-y-[1.5px]"
            width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M3 11 L11 3 M5 3 H11 V9" />
          </svg>
        </span>
      </div>
    </a>
  );
}

function Chapter({ id, screenLabel, index, label, projects, align, T, L }) {
  const ref = useReveal();
  return (
    <section id={id} data-screen-label={screenLabel} className="px-5 md:px-16 py-12 flex items-center">
      <div className={'max-w-3xl w-full ' + (align === 'right' ? 'ml-auto' : '')}>
        <div
          ref={ref}
          className="reveal rounded-[26px] px-6 py-7 md:px-11 md:py-10"
          style={{
            ...glass(T, 18),
            boxShadow: '0 30px 70px -32px rgba(10,4,2,0.45)',
          }}
        >
          <ChapterHeading index={index} label={label} T={T} L={L} />
          <div className="mt-5 md:mt-6">
            {projects.map((p, i) => (
              <ProjectRow
                key={p.href}
                T={T}
                L={L}
                index={i + 1}
                title={p.title}
                blurb={p.blurb}
                href={p.href}
                divider={i > 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Contact ----------
function Contact({ T, L }) {
  const ref = useReveal();
  return (
    <section
      id="contact"
      data-screen-label="06 Contact"
      className="min-h-screen px-6 md:px-16 pt-28 pb-10 flex flex-col"
    >
      <div ref={ref} className="reveal flex flex-col items-center text-center">
        <p
          className="font-mono text-[11px] tracking-[0.42em] uppercase mb-5"
          style={{ color: T.onScene, textShadow: T.onSceneShadow, opacity: 0.85 }}
        >
          {L.contact.kicker}
        </p>
        <h2
          className="font-display-black text-[11vw] md:text-[clamp(2.8rem,5vw,4.2rem)] leading-tight"
          style={{ color: T.onScene, textShadow: '0 2px 24px rgba(0,0,0,0.45)' }}
        >
          {L.contact.heading}
        </h2>
        <p
          className="mt-4 max-w-md text-[15px] leading-relaxed"
          style={{ color: T.onScene, textShadow: T.onSceneShadow, opacity: 0.85 }}
        >
          {L.contact.sub}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {L.contact.links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 h-10 px-5 rounded-full font-mono text-[11px] uppercase tracking-[0.22em] transition-all duration-300 hover:-translate-y-0.5"
              style={{ ...glass(T, 12), color: T.heading }}
            >
              {label}
              <svg
                className="transition-transform duration-300 group-hover:translate-x-[1.5px] group-hover:-translate-y-[1.5px]"
                width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M3 11 L11 3 M5 3 H11 V9" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <footer
        className="flex justify-between items-end font-mono text-[10px] tracking-[0.32em] uppercase"
        style={{ color: T.onScene, textShadow: T.onSceneShadow }}
      >
        <span style={{ opacity: 0.85 }}>{L.contact.copyright}</span>
        <span className="relative group cursor-help select-none" style={{ opacity: 0.85 }}>
          {L.contact.credits}
          <span
            className="absolute bottom-full right-0 mb-3 w-[320px] rounded-xl px-4 py-3 text-[11px] normal-case tracking-normal leading-relaxed text-left opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100"
            style={{ ...glass(T, 14), color: T.heading, fontFamily: "'Manrope', sans-serif" }}
          >
            {L.contact.creditsBody.map((line, i) => (
              <span key={i}>
                {line}
                {i < L.contact.creditsBody.length - 1 && <br />}
              </span>
            ))}
          </span>
        </span>
      </footer>
    </section>
  );
}

// ---------- Links popup (opened from the altar runes) ----------
const LINK_ICONS = {
  LinkedIn: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>
    </svg>
  ),
  GitHub: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/>
    </svg>
  ),
  default: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>
    </svg>
  ),
};

function LinksPopup({ T, L, onClose }) {
  return (
    <div
      data-altar-overlay
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 50, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="popup-in relative rounded-3xl p-8 w-[340px]"
        style={{ ...glass(T, 20), boxShadow: '0 40px 90px -30px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full opacity-60 hover:opacity-100 transition"
          style={{ color: T.heading, border: '1px solid ' + T.hairline }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 2 L10 10 M10 2 L2 10" />
          </svg>
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: T.accent }}>Links</p>
        <div className="grid grid-cols-3 gap-3">
          {L.contact.links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2.5 rounded-2xl py-5 px-2 transition-all duration-200 hover:-translate-y-1"
              style={{
                border: '1px solid ' + T.hairline,
                color: T.heading,
                textDecoration: 'none',
              }}
            >
              <span className="transition-transform duration-200 group-hover:scale-110" style={{ color: T.accent }}>
                {LINK_ICONS[label] || LINK_ICONS.default}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-center leading-tight" style={{ color: T.muted }}>
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const SCENE_ONLY_REVIEW = false;
  const [tweaks, setTweak] = useTweaks();
  const T = tokens(tweaks.theme);
  const [showLinksPopup, setShowLinksPopup] = useState(false);
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem('lang');
      if (stored === 'en' || stored === 'it') return stored;
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('it')) return 'it';
    } catch (_) {}
    return 'en';
  });
  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch (_) {}
  }, [lang]);
  const L = i18n(lang);
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  useScrollScene(canvasRef, tweaks.theme, scrollContainerRef, tweaks.mobile);

  // Apply background color to body so it matches theme during reload/spaces
  useEffect(() => {
    document.body.style.background = T.bg;
  }, [tweaks.theme]);

  // The moon rune on the altar dispatches this event when clicked.
  useEffect(() => {
    const onToggle = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');
    window.addEventListener('altar-theme-toggle', onToggle);
    return () => window.removeEventListener('altar-theme-toggle', onToggle);
  }, [tweaks.theme]);

  useEffect(() => {
    const onOpen = () => setShowLinksPopup(true);
    window.addEventListener('altar-links-popup', onOpen);
    return () => window.removeEventListener('altar-links-popup', onOpen);
  }, []);

  const inner = (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />
      {/* Cinematic unifiers: top scrim for header legibility, vignette, film grain */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 20, height: 130, background: `linear-gradient(to bottom, ${T.scrim}, transparent)` }}
      />
      <div className="vignette-overlay" style={{ zIndex: 15, background: T.vignette }} />
      <div className="grain-overlay" style={{ zIndex: 15 }} />
      <>
      <header
        className="fixed top-0 left-0 right-0 px-5 md:px-10 py-5 flex justify-between items-center"
        style={{
          zIndex: 30,
          opacity: SCENE_ONLY_REVIEW ? 0 : 1,
          pointerEvents: SCENE_ONLY_REVIEW ? 'none' : 'auto',
        }}
      >
        <a
          href="#hero"
          className="font-mono text-[11px] tracking-[0.32em] uppercase flex items-center gap-2.5"
          style={{ color: T.onScene, textShadow: T.onSceneShadow, textDecoration: 'none' }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: T.accent, boxShadow: `0 0 8px ${T.accent}` }}
          />
          <span className="hidden sm:inline">Thomas Reolon</span>
          <span className="sm:hidden">TR</span>
        </a>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} T={T} />
          <ThemeToggle theme={tweaks.theme} onToggle={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')} T={T} />
          <ProjectsMenu T={T} L={L} />
        </div>
      </header>
      <JourneyRail T={T} L={L} />
      <main className="relative" style={{ zIndex: 1, opacity: SCENE_ONLY_REVIEW ? 0 : 1, pointerEvents: SCENE_ONLY_REVIEW ? 'none' : 'auto' }}>
        <Hero T={T} L={L} />
        <Chapter
          id="finance"
          screenLabel="02 Finance"
          index={1}
          label={L.chapters.finance}
          align="right"
          projects={[
            { ...L.finance.project1, href: 'https://report-server-rz3teebbga-ew.a.run.app/' },
            { ...L.finance.project2, href: 'https://ff-analysis-6489314693.europe-west1.run.app/' },
          ]}
          T={T}
          L={L}
        />
        <Chapter
          id="ai"
          screenLabel="03 Machine Learning"
          index={2}
          label={L.chapters.ai}
          align="left"
          projects={[
            { ...L.ai.project1, href: 'https://github.com/thomasreolon/UNITN-master-thesis/blob/main/report.pdf' },
            { ...L.ai.project2, href: 'https://github.com/thomasreolon/DeepfakeDetection/blob/main/DeepFake_paper.pdf' },
            { ...L.ai.project3, href: 'https://drive.google.com/file/d/1SX61ZjEsS0FKgPZ0w1NP2nB9fu8fVezR/view?usp=drive_link' },
          ]}
          T={T}
          L={L}
        />
        <Chapter
          id="real-estate"
          screenLabel="04 Real Estate"
          index={3}
          label={L.chapters.realEstate}
          align="right"
          projects={[
            { ...L.realEstate.project1, href: 'https://ita-house-data.web.app' },
          ]}
          T={T}
          L={L}
        />
        <Chapter
          id="altro"
          screenLabel="05 More"
          index={4}
          label={L.chapters.more}
          align="left"
          projects={[
            { ...L.more.project1, href: 'https://funzioni-gratis.web.app/' },
            { ...L.more.project2, href: 'https://app-lettura.web.app/' },
          ]}
          T={T}
          L={L}
        />
        <Contact T={T} L={L} />
      </main>
      </>
    </>
  );

  // Mobile preview: constrain to a phone frame
  return (
    <>
      {tweaks.mobile ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: tweaks.theme === 'dark' ? '#050409' : '#3a261c', zIndex: 0 }}
        >
          <div
            className="relative overflow-hidden shadow-2xl"
            style={{
              width: 390,
              height: 844,
              borderRadius: 44,
              border: '10px solid #111',
              background: T.bg,
            }}
          >
            <div ref={scrollContainerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
              {inner}
            </div>
          </div>
        </div>
      ) : (
        inner
      )}
      {!SCENE_ONLY_REVIEW && <TweaksPanel tweaks={tweaks} setTweak={setTweak} theme={tweaks.theme} />}
      {showLinksPopup && <LinksPopup T={T} L={L} onClose={() => setShowLinksPopup(false)} />}
    </>
  );
}

export default App;
