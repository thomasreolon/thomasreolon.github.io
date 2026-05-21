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

// ---------- Theme toggle ----------
function ThemeToggle({ theme, onToggle, T }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-full transition"
      style={{
        background: T.cardBg,
        border: '1px solid ' + T.cardBorder,
        color: T.heading,
        backdropFilter: 'blur(8px)',
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      className="flex items-center font-mono text-[11px] tracking-[0.25em] rounded-full overflow-hidden h-9"
      style={{
        background: T.cardBg,
        border: '1px solid ' + T.cardBorder,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {['en', 'it'].map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => onChange(l)}
            aria-label={'Switch to ' + l.toUpperCase()}
            className="px-2.5 h-full transition"
            style={{
              background: active ? T.heading : 'transparent',
              color: active ? T.bg : T.heading,
              opacity: active ? 1 : 0.65,
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
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2 rounded-full text-[12px] tracking-[0.3em] uppercase transition"
        style={{
          background: T.cardBg,
          border: '1px solid ' + T.cardBorder,
          color: T.heading,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* hamburger on mobile, text+arrow on md+ */}
        <span className="hidden md:inline">{L.nav.projects}</span>
        <span className="hidden md:inline" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        <span className="md:hidden" style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden shadow-xl"
          style={{
            background: T.cardBg,
            border: '1px solid ' + T.cardBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          {L.nav.items.map((p, i) => (
            <a
              key={p.id}
              href={'#' + p.id}
              onClick={() => setOpen(false)}
              className="flex justify-between items-center px-5 py-3 text-sm hover:opacity-80 transition"
              style={{
                color: T.heading,
                borderTop: i === 0 ? 'none' : '1px solid ' + T.cardBorder,
              }}
            >
              <span>{p.label}</span>
              <span className="font-mono text-xs opacity-50">{String(i + 1).padStart(2, '0')}</span>
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
          {ch === ' ' ? '\u00A0' : ch}
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

  return (
    <section
      ref={heroRef}
      data-screen-label="01 Hero"
      className="relative min-h-screen flex flex-col px-8 md:px-16 py-10"
    >
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <p
          className="font-mono text-[13px] tracking-[0.3em] uppercase mb-10"
          style={{ color: T.muted }}
        >
          {L.hero.eyebrow}
        </p>
        <h1
          ref={titleRef}
          className="font-display text-[18vw] md:text-[clamp(6rem,12vw,11.5rem)] leading-[0.85] tracking-tight select-none"
          style={{ wordSpacing: '0.05em' }}
        >
          <div className="block"><SplitLetters text="THOMAS" color={T.titleHero} shadow={T.titleHeroShadow} filter={T.titleHeroFilter} /></div>
          <div className="block"><SplitLetters text="REOLON" color={T.titleHero} shadow={T.titleHeroShadow} filter={T.titleHeroFilter} /></div>
        </h1>
        <p
          className="mt-12 max-w-xl text-xl md:text-2xl leading-relaxed"
          style={{ color: T.body }}
        >
          <span style={{ color: '#ffffff' }}>{L.hero.subtitle}</span>
        </p>
      </div>

      <footer
        className="flex justify-between items-end text-[12px] tracking-[0.32em] uppercase"
        style={{ color: T.muted }}
      >
        <span style={{ color: '#ffffff' }}>{L.hero.scroll}</span>
        <span className="font-mono" style={{ color: '#ffffff' }}>↓</span>
      </footer>
    </section>
  );
}

// ---------- Reusable card ----------
function Card({ T, children, className = '' }) {
  return (
    <div
      className={'rounded-2xl p-8 md:p-10 ' + className}
      style={{
        background: T.cardBg,
        border: '1px solid ' + T.cardBorder,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </div>
  );
}

function ChapterMarker({ index, label, T, L }) {
  return (
    <div className="flex items-center gap-5 text-[13px] tracking-[0.3em] uppercase" style={{ color: T.muted }}>
      <span className="font-mono">{L.chapterPrefix} {String(index).padStart(2, '0')}</span>
      <span className="h-px w-16" style={{ background: T.muted, opacity: 0.4 }} />
      <span>{label}</span>
    </div>
  );
}

function ProjectTile({ T, index, title, blurb, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block relative overflow-hidden transition-transform duration-300 hover:-translate-y-0.5"
      style={{
        background: T.cardBg,
        border: '1px solid ' + T.cardBorder,
        borderRadius: 14,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500"
        style={{ background: T.heading }}
      />
      <div className="px-6 md:px-8 py-6 flex items-center gap-6">
        <div
          className="font-mono text-[11px] tracking-[0.3em] uppercase shrink-0"
          style={{ color: T.muted }}
        >
          {String(index).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-display text-2xl md:text-3xl leading-tight"
            style={{ color: T.heading }}
          >
            {title}
          </div>
          <div
            className="mt-1.5 text-sm md:text-base leading-snug"
            style={{ color: T.body }}
          >
            {blurb}
          </div>
          <div
            className="mt-3 font-mono text-[11px] tracking-wider truncate opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ color: T.mono }}
          >
            {href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </div>
        </div>
        <div
          className="shrink-0 font-display text-3xl md:text-4xl transition-transform duration-300 group-hover:translate-x-1.5"
          style={{ color: T.heading }}
          aria-hidden
        >
          →
        </div>
      </div>
    </a>
  );
}


function Finance({ T, L }) {
  const softBg = T.cardBg.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.8).toFixed(3) + ')');
  return (
    <section
      id="finance"
      data-screen-label="02 Finance"
      className="min-h-screen px-6 md:px-16 py-32 flex items-center"
    >
      <div className="max-w-3xl ml-auto w-full">
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: softBg,
            border: '1px solid ' + T.cardBorder,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <ChapterMarker index={1} label={L.chapters.finance} T={T} L={L} />
          <div className="mt-8 space-y-4">
            <ProjectTile
              T={T}
              index={1}
              title={L.finance.project1.title}
              blurb={L.finance.project1.blurb}
              href="https://report-server-rz3teebbga-ew.a.run.app/"
            />
            <ProjectTile
              T={T}
              index={2}
              title={L.finance.project2.title}
              blurb={L.finance.project2.blurb}
              href="https://ff-analysis-6489314693.europe-west1.run.app/"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AISection({ T, L }) {
  const softBg = T.cardBg.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.8).toFixed(3) + ')');
  return (
    <section
      id="ai"
      data-screen-label="03 Machine Learning"
      className="min-h-screen px-6 md:px-16 py-32 flex items-center"
    >
      <div className="max-w-3xl w-full">
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: softBg,
            border: '1px solid ' + T.cardBorder,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <ChapterMarker index={2} label={L.chapters.ai} T={T} L={L} />
          <div className="mt-8 space-y-4">
            <ProjectTile
              T={T}
              index={1}
              title={L.ai.project1.title}
              blurb={L.ai.project1.blurb}
              href="https://github.com/thomasreolon/UNITN-master-thesis/blob/main/report.pdf"
            />
            <ProjectTile
              T={T}
              index={2}
              title={L.ai.project2.title}
              blurb={L.ai.project2.blurb}
              href="https://github.com/thomasreolon/DeepfakeDetection/blob/main/DeepFake_paper.pdf"
            />
            <ProjectTile
              T={T}
              index={3}
              title={L.ai.project3.title}
              blurb={L.ai.project3.blurb}
              href="https://drive.google.com/file/d/1SX61ZjEsS0FKgPZ0w1NP2nB9fu8fVezR/view?usp=drive_link"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RealEstate({ T, L }) {
  const softBg = T.cardBg.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.8).toFixed(3) + ')');
  return (
    <section
      id="real-estate"
      data-screen-label="04 Real Estate"
      className="min-h-screen px-6 md:px-16 py-32 flex items-center"
    >
      <div className="max-w-3xl ml-auto w-full">
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: softBg,
            border: '1px solid ' + T.cardBorder,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <ChapterMarker index={3} label={L.chapters.realEstate} T={T} L={L} />
          <div className="mt-8 space-y-4">
            <ProjectTile
              T={T}
              index={1}
              title={L.realEstate.project1.title}
              blurb={L.realEstate.project1.blurb}
              href="https://ita-house-data.web.app"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ T, L }) {
  return (
    <section
      id="contact"
      data-screen-label="05 Contact"
      className="min-h-screen px-6 md:px-16 pt-32 pb-12 flex flex-col"
    >
      <div className="flex-1 flex flex-col justify-start items-center text-center w-full">
        <p
          className="mt-10 mb-14 max-w-md font-display text-2xl md:text-3xl leading-snug"
          style={{ color: '#ffffff', textShadow: '0 1px 10px rgba(0,0,0,0.50)' }}
        >
          {L.contact.altarText}
        </p>
      </div>
      <footer
        className="flex justify-between items-end text-[12px] tracking-[0.32em] uppercase mt-12"
        style={{ color: T.muted }}
      >
        <span style={{ color: '#ffffff' }}>{L.contact.copyright}</span>
        <span className="relative group font-mono cursor-help select-none">
          {L.contact.credits}
          <span
            className="absolute bottom-full right-0 mb-2 w-[320px] rounded-lg px-3 py-2 text-[11px] normal-case tracking-normal leading-relaxed opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100"
            style={{
              background: T.cardBg,
              border: '1px solid ' + T.cardBorder,
              color: 'white',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
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

function App() {
  const SCENE_ONLY_REVIEW = false;
  const [tweaks, setTweak] = useTweaks();
  const T = tokens(tweaks.theme);
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

  const inner = (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <>
      <header
        className="fixed top-0 left-0 right-0 px-6 md:px-16 py-6 flex justify-between items-center"
        style={{
          zIndex: 30,
          opacity: SCENE_ONLY_REVIEW ? 0 : 1,
          pointerEvents: SCENE_ONLY_REVIEW ? 'none' : 'auto',
        }}
      >
        <span
          className="font-mono text-[12px] tracking-[0.32em] uppercase"
          style={{
            color: T.heading,
            display: 'inline-block',
            padding: '4px 14px',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            background: tweaks.theme === 'dark' ? 'rgba(10,8,18,0.38)' : 'rgba(255,244,230,0.38)',
            borderRadius: 999,
          }}
        >
          PORTFOLIO
        </span>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} T={T} />
          <ThemeToggle theme={tweaks.theme} onToggle={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')} T={T} />
          <ProjectsMenu T={T} L={L} />
        </div>
      </header>
      <main className="relative" style={{ zIndex: 1, opacity: SCENE_ONLY_REVIEW ? 0 : 1, pointerEvents: SCENE_ONLY_REVIEW ? 'none' : 'auto' }}>
        <Hero T={T} L={L} />
        <Finance T={T} L={L} />
        <AISection T={T} L={L} />
        <RealEstate T={T} L={L} />
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
    </>
  );
}

export default App;
