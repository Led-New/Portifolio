/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  clamp01,
  createChromeModelScene,
  createGradientScene,
  createPlasmaScene,
  easeInOutQuart,
  easeOutQuart,
  getScrollY,
  subscribeTicker,
} from './scenes';

const LOGO_NAMES = [
  'Northwind',
  'Ledgerly',
  'Vaulted',
  'Paycore',
  'Finova',
  'Quanta',
  'Settle',
  'Corvus',
];

const SHOWCASE_ITEMS = [
  { line1: 'Nossa', line2: 'Abordagem', img: '/assets/images/3rd/approach.png' },
  { line1: 'Nossa', line2: 'Tecnologia', img: '/assets/images/3rd/technology.jpg' },
  { line1: 'Nossa', line2: 'Segurança', img: '/assets/images/3rd/security.jpg' },
  { line1: 'Nosso', line2: 'Time', img: '/assets/images/3rd/team.jpg' },
];

const PORTFOLIO_ITEMS = [
  { name: 'ATScope', img: '/assets/images/portfolio/1.jpg' },
  { name: 'Casa Silêncio', img: '/assets/images/portfolio/2.jpg' },
  { name: 'AKIRA', img: '/assets/images/portfolio/3.jpg' },
  { name: 'Gbzinn', img: '/assets/images/portfolio/4.jpg' },
  { name: 'Marco Zero', img: '/assets/images/portfolio/5.jpg' },
  { name: 'EuuTek', img: '/assets/images/portfolio/6.jpg' },
];

function LightningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" />
    </svg>
  );
}

function BarChartIcon({
  width = '0.5em',
  height = '0.5em',
}: {
  width?: string | number;
  height?: string | number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </svg>
  );
}

function LogoMark({ index }: { index: number }) {
  const mod = index % 5;
  return (
    <svg
      width={36}
      height={36}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {mod === 0 && <circle cx="12" cy="12" r="9" />}
      {mod === 1 && <rect x="4" y="4" width="16" height="16" rx="5" />}
      {mod === 2 && <path d="M12 2.5 21 20.5 3 20.5Z" />}
      {mod === 3 && <path d="M12 3a9 9 0 1 0 9 9h-9Z" />}
      {mod === 4 && (
        <path d="M12 2l2.6 6.4L21 9l-5 4.2L17.8 20 12 16.3 6.2 20 8 13.2 3 9l6.4-.6z" />
      )}
    </svg>
  );
}

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  alphaFn?: (frac: number) => number;
}

function AnimatedHeading({ text, className, alphaFn }: AnimatedHeadingProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hasDigit = /\d/.test(text);

  const words = text.split(' ');
  const totalLetters = text.replace(/\s+/g, '').length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasDigit) return;

    const letters = letterRefs.current.filter(
      (span): span is HTMLSpanElement => span !== null
    );
    const total = letters.length;
    if (total === 0) return;

    const DURATION = 1400;
    const SPREAD = 0.55;
    const RISE = 16;
    const BLUR = 8;
    const span = 1 - SPREAD;

    const applyProgress = (v: number) => {
      for (let i = 0; i < total; i++) {
        const s = total > 1 ? (i / (total - 1)) * SPREAD : 0;
        const localProg = easeOutQuart(clamp01((v - s) / span));
        const frac = total > 1 ? i / (total - 1) : 0;
        const alpha = alphaFn ? alphaFn(frac) : 1;
        const node = letters[i];
        node.style.opacity = `${alpha * localProg}`;
        node.style.transform = `translateY(${RISE * (1 - localProg)}px)`;
        node.style.filter = `blur(${BLUR * (1 - localProg)}px)`;
      }
    };

    applyProgress(0);
    let startMs: number | null = null;
    let finished = false;

    const unsub = subscribeTicker((nowMs) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;

      // Reset if scrolled completely below viewport so re-scrolling replays the cascade
      if (rect.top > vh * 1.02) {
        if (startMs !== null || finished) {
          startMs = null;
          finished = false;
          applyProgress(0);
        }
        return;
      }

      if (rect.top <= vh * 0.88 && rect.bottom >= 0) {
        if (startMs === null) startMs = nowMs;
      }

      if (startMs !== null && !finished) {
        const v = clamp01((nowMs - startMs) / DURATION);
        applyProgress(v);
        if (v >= 1) finished = true;
      }
    });

    return () => {
      unsub();
    };
  }, [text, hasDigit, alphaFn]);

  if (hasDigit) {
    return (
      <h2 ref={containerRef} className={className}>
        {text}
      </h2>
    );
  }

  let runningIdx = 0;
  letterRefs.current = [];

  return (
    <h2 ref={containerRef} className={className} aria-label={text}>
      {words.map((word, wIdx) => (
        <React.Fragment key={wIdx}>
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {Array.from(word).map((ch, cIdx) => {
              const idx = runningIdx++;
              return (
                <span
                  key={cIdx}
                  ref={(node) => {
                    letterRefs.current[idx] = node;
                  }}
                  style={{
                    display: 'inline-block',
                    willChange: 'transform, opacity, filter',
                  }}
                  aria-hidden="true"
                >
                  {ch}
                </span>
              );
            })}
          </span>
          {wIdx < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
      <span className="sr-only">{totalLetters > 0 ? '' : text}</span>
    </h2>
  );
}

export default function App() {
  const [loaderVisible, setLoaderVisible] = useState(true);
  const introReadyRef = useRef<boolean>(false);

  // Form state
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Refs for Loader
  const loaderOverlayRef = useRef<HTMLDivElement | null>(null);
  const loaderCounterWrapRef = useRef<HTMLDivElement | null>(null);
  const loaderCounterTextRef = useRef<HTMLSpanElement | null>(null);
  const loaderBarOuterRef = useRef<HTMLDivElement | null>(null);
  const loaderBarInnerRef = useRef<HTMLDivElement | null>(null);

  // Refs for Hero
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroClipRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayRef = useRef<HTMLDivElement | null>(null);
  const heroGradCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroPlasmaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroProgressRef = useRef<number>(0);
  const heroTitleLettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const heroItemsRef = useRef<(HTMLElement | null)[]>([]);

  // Refs for Logo Strips
  const logoTrack1Ref = useRef<HTMLDivElement | null>(null);
  const logoTrack2Ref = useRef<HTMLDivElement | null>(null);

  // Refs for About Section
  const aboutKickerRef = useRef<HTMLParagraphElement | null>(null);
  const aboutHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const aboutTimelineRefs = useRef<
    { el: HTMLElement | null; isChip: boolean }[]
  >([]);

  // Refs for Numbers Bento Cards
  const numbersSectionRef = useRef<HTMLElement | null>(null);
  const numbersCardsRef = useRef<(HTMLElement | null)[]>([]);

  // Refs for Showcase (Vitrine) Hover Spring
  const showcasePhotoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const showcaseScrimRefs = useRef<(HTMLDivElement | null)[]>([]);
  const showcaseHoverTargetRef = useRef<number[]>([0, 0, 0, 0]);
  const showcaseHoverPosRef = useRef<number[]>([0, 0, 0, 0]);
  const showcaseHoverVelRef = useRef<number[]>([0, 0, 0, 0]);

  // Refs for Portfolio 3D Cylinder
  const portfolioSectionRef = useRef<HTMLElement | null>(null);
  const portfolioBgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const portfolioCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const portfolioVeilRefs = useRef<(HTMLDivElement | null)[]>([]);
  const portfolioIndexRef = useRef<HTMLSpanElement | null>(null);
  const portfolioNameRef = useRef<HTMLSpanElement | null>(null);

  // Refs for Chain + Product
  const chainWrapperRef = useRef<HTMLDivElement | null>(null);
  const chainGradCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chainModelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chainFallRef = useRef<number>(0);
  const productSectionRef = useRef<HTMLElement | null>(null);
  const productCardsRef = useRef<(HTMLElement | null)[]>([]);

  // Refs for Footer + Heart
  const footerRef = useRef<HTMLElement | null>(null);
  const footerGradCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const footerHeartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const footerHeartFallRef = useRef<number>(0);

  // ==========================================================================
  // 1. Preloader & Hero Intro Reveal
  // ==========================================================================
  useEffect(() => {
    const heroLines = ['Faça o seu sonho', 'se tornar realidade'];
    const totalTitleChars =
      heroLines[0].replace(/\s+/g, '').length +
      heroLines[1].replace(/\s+/g, '').length;

    const applyHeroTitleProgress = (v: number) => {
      const SPREAD = 0.55;
      const RISE = 16;
      const BLUR = 8;
      const span = 1 - SPREAD;

      let globalIdx = 0;
      for (let lineIdx = 0; lineIdx < heroLines.length; lineIdx++) {
        const chars = Array.from(heroLines[lineIdx]).filter((c) => c !== ' ');
        const lineLen = chars.length;
        for (let cIdx = 0; cIdx < lineLen; cIdx++) {
          const el = heroTitleLettersRef.current[globalIdx];
          if (el) {
            const pos = lineLen > 1 ? cIdx / (lineLen - 1) : 0;
            const alpha =
              lineIdx % 2 === 0 ? 1 - pos * 0.6 : 0.4 + pos * 0.6;
            const s =
              totalTitleChars > 1
                ? (globalIdx / (totalTitleChars - 1)) * SPREAD
                : 0;
            const localProg = easeOutQuart(clamp01((v - s) / span));
            el.style.opacity = `${alpha * localProg}`;
            el.style.transform = `translateY(${RISE * (1 - localProg)}px)`;
            el.style.filter = `blur(${BLUR * (1 - localProg)}px)`;
          }
          globalIdx++;
        }
      }
    };

    const applyHeroItemsProgress = (v: number) => {
      const SPREAD = 0.55;
      const RISE = 20;
      const BLUR = 10;
      const span = 1 - SPREAD;
      const items = heroItemsRef.current.filter(
        (el): el is HTMLElement => el !== null
      );
      const total = items.length;
      for (let i = 0; i < total; i++) {
        const s = total > 1 ? (i / (total - 1)) * SPREAD : 0;
        const localProg = easeOutQuart(clamp01((v - s) / span));
        const item = items[i];
        item.style.opacity = `${localProg}`;
        item.style.transform = `translateY(${RISE * (1 - localProg)}px)`;
        item.style.filter = `blur(${BLUR * (1 - localProg)}px)`;
      }
    };

    applyHeroTitleProgress(0);
    applyHeroItemsProgress(0);

    const LOAD = 1900;
    const EXIT = 950;
    const TOTAL = LOAD + EXIT; // 2850ms
    const A = LOAD / TOTAL;
    const DONE_AT = A + (1 - A) * 0.6;
    const BAR_PX = 64;

    const HERO_TITLE_DURATION = 1600;
    const HERO_ITEMS_DURATION = 1400;

    let t0: number | null = null;
    let heroStartMs: number | null = null;

    const unsub = subscribeTicker((nowMs) => {
      if (t0 === null) t0 = nowMs;
      const v = clamp01((nowMs - t0) / TOTAL);
      const fill = easeOutQuart(clamp01(v / A));
      const exit = easeInOutQuart(clamp01((v - A) / (1 - A)));
      const thin = clamp01(BAR_PX / Math.max(1, window.innerHeight));

      if (loaderOverlayRef.current) {
        loaderOverlayRef.current.style.transform = `translateY(${-exit * 100}%)`;
      }
      if (loaderCounterWrapRef.current) {
        loaderCounterWrapRef.current.style.left = `${Math.max(fill, 0.16) * 100}%`;
      }
      if (loaderCounterTextRef.current) {
        loaderCounterTextRef.current.textContent = `${Math.round(fill * 100)}%`;
      }
      if (loaderBarOuterRef.current) {
        loaderBarOuterRef.current.style.transform = `scaleY(${
          thin + (1 - thin) * exit
        })`;
      }
      if (loaderBarInnerRef.current) {
        loaderBarInnerRef.current.style.transform = `scaleX(${fill})`;
      }

      if (v >= DONE_AT) {
        introReadyRef.current = true;
        if (heroStartMs === null) heroStartMs = nowMs;
      }

      if (heroStartMs !== null) {
        const vt = clamp01((nowMs - heroStartMs) / HERO_TITLE_DURATION);
        const vi = clamp01((nowMs - heroStartMs) / HERO_ITEMS_DURATION);
        applyHeroTitleProgress(vt);
        applyHeroItemsProgress(vi);

        if (v >= 1 && vt >= 1 && vi >= 1) {
          setLoaderVisible(false);
          unsub();
        }
      }

      if (v >= 1 && loaderOverlayRef.current) {
        loaderOverlayRef.current.style.display = 'none';
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // ==========================================================================
  // 2. WebGL Scenes Initialization
  // ==========================================================================
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    if (heroGradCanvasRef.current) {
      cleanups.push(
        createGradientScene(heroGradCanvasRef.current, {
          baseHex: '#1c3ee6',
          lightHex: '#eef3ff',
          seed: 0,
        })
      );
    }

    if (heroPlasmaCanvasRef.current) {
      cleanups.push(
        createPlasmaScene(heroPlasmaCanvasRef.current, {
          getHeroProgress: () => heroProgressRef.current,
          isIntroReady: () => introReadyRef.current,
        })
      );
    }

    if (chainGradCanvasRef.current) {
      cleanups.push(
        createGradientScene(chainGradCanvasRef.current, {
          baseHex: '#1c3ee6',
          lightHex: '#eef3ff',
          seed: 3.7,
        })
      );
    }

    if (chainModelCanvasRef.current) {
      cleanups.push(
        createChromeModelScene(chainModelCanvasRef.current, {
          glbUrl: '/assets/chain.glb',
          scrollSpin: true,
          spinAccel: 0.00004,
          maxSpin: 0.045,
          spinDirection: 1,
          getFallProgress: () => chainFallRef.current,
        })
      );
    }

    if (footerGradCanvasRef.current) {
      cleanups.push(
        createGradientScene(footerGradCanvasRef.current, {
          baseHex: '#1c3ee6',
          lightHex: '#eef3ff',
          seed: 7.2,
        })
      );
    }

    if (footerHeartCanvasRef.current) {
      cleanups.push(
        createChromeModelScene(footerHeartCanvasRef.current, {
          glbUrl: '/assets/heart.glb',
          scrollSpin: false,
          spinDirection: -1,
          getFallProgress: () => footerHeartFallRef.current,
        })
      );
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // ==========================================================================
  // 3. Continuous Ticker Animations (Hero Shrink, Logo Strips, Showcase Spring, Portfolio 3D, Chain & Heart Parallax)
  // ==========================================================================
  useEffect(() => {
    const ONE_SET = 100 / 6;
    let s1 = 0;
    let s2 = 0;
    let portfolioCurrent = 0;

    const unsub = subscribeTicker((_nowMs, dt) => {
      const scrollY = getScrollY();
      const vh = Math.max(1, window.innerHeight);

      // A. Hero shrink & clip-path
      if (heroSectionRef.current) {
        const sectionTop = heroSectionRef.current.getBoundingClientRect().top;
        const targetP = clamp01(-sectionTop / (vh * 0.6));
        heroProgressRef.current += (targetP - heroProgressRef.current) * 0.18;
        const p = heroProgressRef.current;

        if (heroClipRef.current) {
          const insetPx = (p * 24).toFixed(2);
          heroClipRef.current.style.clipPath = `inset(${insetPx}px round ${insetPx}px)`;
        }
        if (heroOverlayRef.current) {
          heroOverlayRef.current.style.transform = `scale(${(
            1 -
            p * 0.1
          ).toFixed(4)})`;
        }
      }

      // B. Scroll-linked Logo Strips (spring smoothed)
      const targetS1 = scrollY * 0.005;
      const targetS2 = scrollY * 0.0038;
      s1 += (targetS1 - s1) * 0.08;
      s2 += (targetS2 - s2) * 0.08;

      if (logoTrack1Ref.current) {
        const m1 = ((s1 % ONE_SET) + ONE_SET) % ONE_SET;
        const off1 = -m1;
        logoTrack1Ref.current.style.transform = `translate3d(${off1}%, 0, 0)`;
      }
      if (logoTrack2Ref.current) {
        const m2 = ((s2 % ONE_SET) + ONE_SET) % ONE_SET;
        const off2 = -(ONE_SET - m2);
        logoTrack2Ref.current.style.transform = `translate3d(${off2}%, 0, 0)`;
      }

      // C. Showcase (Vitrine) 4-column Hover Spring (tension 170, friction 26)
      const isDesktop = window.innerWidth >= 1024;
      for (let i = 0; i < 4; i++) {
        const photoEl = showcasePhotoRefs.current[i];
        const scrimEl = showcaseScrimRefs.current[i];
        if (!photoEl || !scrimEl) continue;

        if (!isDesktop) {
          photoEl.style.clipPath = 'none';
          scrimEl.style.transform = 'scaleY(0)';
          continue;
        }

        const target = showcaseHoverTargetRef.current[i];
        let pos = showcaseHoverPosRef.current[i];
        let vel = showcaseHoverVelRef.current[i];

        const force = 170 * (target - pos) - 26 * vel;
        vel += force * dt;
        pos += vel * dt;
        pos = clamp01(pos);

        showcaseHoverPosRef.current[i] = pos;
        showcaseHoverVelRef.current[i] = vel;

        const topInset = ((1 - pos) * 100).toFixed(2);
        photoEl.style.clipPath = `inset(${topInset}% 0% 0% 0%)`;
        scrimEl.style.transform = `scaleY(${pos.toFixed(4)})`;
      }

      // D. Portfolio 3D Cylinder Stack
      if (portfolioSectionRef.current) {
        const rect = portfolioSectionRef.current.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionHeight = Math.max(1, portfolioSectionRef.current.offsetHeight);
        const p = clamp01(-sectionTop / Math.max(1, sectionHeight - vh));
        const count = PORTFOLIO_ITEMS.length;
        const OVERSCAN = 0.2;
        const target = p * (count - 1 + OVERSCAN * 2) - OVERSCAN;
        portfolioCurrent += (target - portfolioCurrent) * 0.14;
        const f = portfolioCurrent;

        const RADIUS = 1350;
        const STEP = 27;

        for (let i = 0; i < count; i++) {
          const rel = i - f;
          const d = Math.abs(rel);

          const bgImg = portfolioBgRefs.current[i];
          if (bgImg) {
            bgImg.style.opacity = `${Math.max(0, 1 - d)}`;
            bgImg.style.transform = `translateY(${(i - f) * 22}%) scale(1.6)`;
          }

          const cardEl = portfolioCardRefs.current[i];
          if (cardEl) {
            const rad = (rel * STEP * Math.PI) / 180;
            const y = RADIUS * Math.sin(rad);
            const z = RADIUS * Math.cos(rad) - RADIUS;
            const op = d > 3.6 ? 0 : Math.max(0, 1 - d * 0.24);
            cardEl.style.transform = `translate3d(0, ${y.toFixed(
              2
            )}px, ${z.toFixed(2)}px) rotateX(${(rel * STEP).toFixed(
              2
            )}deg) translate(-50%, -50%)`;
            cardEl.style.opacity = `${op}`;
          }

          const veilEl = portfolioVeilRefs.current[i];
          if (veilEl) {
            veilEl.style.opacity = `${Math.min(0.35, d * 0.22)}`;
          }
        }

        const focusedIdx = Math.max(
          0,
          Math.min(count - 1, Math.round(portfolioCurrent))
        );
        if (portfolioIndexRef.current) {
          const numStr = String(focusedIdx + 1).padStart(2, '0');
          portfolioIndexRef.current.textContent = `${numStr} / 06`;
        }
        if (portfolioNameRef.current) {
          portfolioNameRef.current.textContent = PORTFOLIO_ITEMS[focusedIdx].name;
        }
      }

      // E. Chain Vertical Fall Progress
      if (chainWrapperRef.current) {
        const wt = chainWrapperRef.current.getBoundingClientRect().top;
        const pinDist = Math.max(1, chainWrapperRef.current.offsetHeight - vh);
        const target =
          wt > 0
            ? 0.5 * (1 - Math.min(wt / vh, 1))
            : 0.5 + 0.5 * Math.min(-wt / pinDist, 1);
        chainFallRef.current += (target - chainFallRef.current) * 0.12;
      }

      // F. Footer Heart Parallax Fall Progress
      if (footerRef.current) {
        const footerRect = footerRef.current.getBoundingClientRect();
        const absTop = footerRect.top + scrollY;
        const enter = clamp01((scrollY - (absTop - vh)) / vh);
        footerHeartFallRef.current = 0.5 * enter;
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // ==========================================================================
  // 4. Viewport-Driven Cascades (About, Numbers Cards, Product Cards)
  // ==========================================================================
  useEffect(() => {
    const DURATION = 1400;
    const SPREAD = 0.55;
    const span = 1 - SPREAD;

    let kickerStartMs: number | null = null;
    let kickerDone = false;

    let aboutStartMs: number | null = null;
    let aboutDone = false;

    let numbersStartMs: number | null = null;
    let numbersDone = false;

    let productStartMs: number | null = null;
    let productDone = false;

    const applyKicker = (p: number) => {
      const el = aboutKickerRef.current;
      if (!el) return;
      el.style.opacity = `${p}`;
      el.style.transform = `translateY(${12 * (1 - p)}px)`;
    };

    const applyAbout = (v: number) => {
      let items = aboutTimelineRefs.current.filter(
        (it): it is { el: HTMLElement; isChip: boolean } => it && it.el !== null
      );
      if (items.length === 0 && aboutHeadingRef.current) {
        const nodes = aboutHeadingRef.current.querySelectorAll('.about-letter, .inline-chip');
        items = Array.from(nodes).map((node) => ({
          el: node as HTMLElement,
          isChip: node.classList.contains('inline-chip'),
        }));
        aboutTimelineRefs.current = items;
      }
      const total = items.length;
      if (total === 0) return;
      const RISE = 16;
      const BLUR = 8;
      const CHIP_MIN_SCALE = 0.3;

      for (let i = 0; i < total; i++) {
        const s = total > 1 ? (i / (total - 1)) * SPREAD : 0;
        const localProg = easeOutQuart(clamp01((v - s) / span));
        const { el, isChip } = items[i];
        el.style.opacity = `${localProg}`;
        if (isChip) {
          const sc = CHIP_MIN_SCALE + (1 - CHIP_MIN_SCALE) * localProg;
          el.style.transform = `translateY(0.08em) scale(${sc})`;
        } else {
          el.style.transform = `translateY(${RISE * (1 - localProg)}px)`;
        }
        el.style.filter = `blur(${BLUR * (1 - localProg)}px)`;
      }
    };

    const applyCardList = (cardsList: (HTMLElement | null)[], v: number) => {
      const cards = cardsList.filter((c): c is HTMLElement => c !== null);
      const total = cards.length;
      const CARD_RISE = 24;
      const CARD_BLUR = 12;

      for (let i = 0; i < total; i++) {
        const s = total > 1 ? (i / (total - 1)) * SPREAD : 0;
        const localProg = easeOutQuart(clamp01((v - s) / span));
        const card = cards[i];
        card.style.opacity = `${localProg}`;
        card.style.transform = `translateY(${CARD_RISE * (1 - localProg)}px)`;
        card.style.filter = `blur(${CARD_BLUR * (1 - localProg)}px)`;
      }
    };

    applyKicker(0);
    applyAbout(0);
    applyCardList(numbersCardsRef.current, 0);
    applyCardList(productCardsRef.current, 0);

    const unsub = subscribeTicker((nowMs) => {
      const vh = window.innerHeight || 800;

      // 1. About Kicker
      if (aboutKickerRef.current) {
        const r = aboutKickerRef.current.getBoundingClientRect();
        if (r.top > vh * 1.02) {
          if (kickerStartMs !== null || kickerDone) {
            kickerStartMs = null;
            kickerDone = false;
            applyKicker(0);
          }
        } else if (r.top <= vh * 0.88 && r.bottom >= 0) {
          if (kickerStartMs === null) kickerStartMs = nowMs;
        }
        if (kickerStartMs !== null && !kickerDone) {
          const p = easeOutQuart(clamp01((nowMs - kickerStartMs) / 900));
          applyKicker(p);
          if (p >= 1) kickerDone = true;
        }
      }

      // 2. About Statement + Inline Chips
      if (aboutHeadingRef.current) {
        const r = aboutHeadingRef.current.getBoundingClientRect();
        if (r.top > vh * 1.02) {
          if (aboutStartMs !== null || aboutDone) {
            aboutStartMs = null;
            aboutDone = false;
            applyAbout(0);
          }
        } else if (r.top <= vh * 0.88 && r.bottom >= 0) {
          if (aboutStartMs === null) aboutStartMs = nowMs;
        }
        if (aboutStartMs !== null && !aboutDone) {
          const v = clamp01((nowMs - aboutStartMs) / DURATION);
          applyAbout(v);
          if (v >= 1) aboutDone = true;
        }
      }

      // 3. Numbers Bento Cards
      if (numbersSectionRef.current) {
        const r = numbersSectionRef.current.getBoundingClientRect();
        if (r.top > vh * 1.02) {
          if (numbersStartMs !== null || numbersDone) {
            numbersStartMs = null;
            numbersDone = false;
            applyCardList(numbersCardsRef.current, 0);
          }
        } else if (r.top <= vh * 0.88 && r.bottom >= 0) {
          if (numbersStartMs === null) numbersStartMs = nowMs;
        }
        if (numbersStartMs !== null && !numbersDone) {
          const v = clamp01((nowMs - numbersStartMs) / DURATION);
          applyCardList(numbersCardsRef.current, v);
          if (v >= 1) numbersDone = true;
        }
      }

      // 4. Product Bento Cards
      if (productSectionRef.current) {
        const r = productSectionRef.current.getBoundingClientRect();
        if (r.top > vh * 1.02) {
          if (productStartMs !== null || productDone) {
            productStartMs = null;
            productDone = false;
            applyCardList(productCardsRef.current, 0);
          }
        } else if (r.top <= vh * 0.88 && r.bottom >= 0) {
          if (productStartMs === null) productStartMs = nowMs;
        }
        if (productStartMs !== null && !productDone) {
          const v = clamp01((nowMs - productStartMs) / DURATION);
          applyCardList(productCardsRef.current, v);
          if (v >= 1) productDone = true;
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Helper to render Hero Title lines with letter refs
  const renderHeroTitle = () => {
    const lines = ['Faça o seu sonho', 'se tornar realidade'];
    let globalIdx = 0;
    heroTitleLettersRef.current = [];

    return (
      <h1 className="hero-title" aria-label="Faça o seu sonho se tornar realidade">
        {lines.map((line, lIdx) => {
          const words = line.split(' ');
          return (
            <span key={lIdx} style={{ display: 'block' }} aria-hidden="true">
              {words.map((word, wIdx) => (
                <React.Fragment key={wIdx}>
                  <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {Array.from(word).map((ch, cIdx) => {
                      const idx = globalIdx++;
                      return (
                        <span
                          key={cIdx}
                          ref={(el) => {
                            heroTitleLettersRef.current[idx] = el;
                          }}
                          style={{
                            display: 'inline-block',
                            willChange: 'transform, opacity, filter',
                          }}
                        >
                          {ch}
                        </span>
                      );
                    })}
                  </span>
                  {wIdx < words.length - 1 ? ' ' : null}
                </React.Fragment>
              ))}
            </span>
          );
        })}
      </h1>
    );
  };

  // Helper to render About Statement with letters + 2 inline chips
  const renderAboutStatement = () => {
    const part1 = 'Criando produtos digitais de alta performance e experiências';
    const part2 = 'únicas com design refinado, animações 3D e tecnologia moderna';
    let itemIdx = 0;

    const renderWords = (str: string, muted: boolean) => {
      const words = str.split(' ');
      return words.map((word, wIdx) => (
        <React.Fragment key={wIdx}>
          <span
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              color: muted ? 'var(--muted)' : '#000000',
            }}
          >
            {Array.from(word).map((ch, cIdx) => {
              const idx = itemIdx++;
              return (
                <span
                  key={cIdx}
                  ref={(el) => {
                    if (el) {
                      aboutTimelineRefs.current[idx] = { el, isChip: false };
                    }
                  }}
                  className="about-letter"
                  style={{
                    display: 'inline-block',
                    willChange: 'transform, opacity, filter',
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
          {wIdx < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ));
    };

    const words1 = renderWords(part1, false);
    const chip1Idx = itemIdx++;
    const words2 = renderWords(part2, true);
    const chip2Idx = itemIdx++;

    return (
      <h2
        ref={aboutHeadingRef}
        className="about-heading"
        aria-label={`${part1} ${part2}`}
      >
        <span aria-hidden="true">
          {words1}{' '}
          <span
            ref={(el) => {
              if (el) {
                aboutTimelineRefs.current[chip1Idx] = { el, isChip: true };
              }
            }}
            className="inline-chip inline-chip-blue"
            style={{ willChange: 'transform, opacity, filter' }}
            title="Código & Tecnologia"
          >
            <svg
              width="0.55em"
              height="0.55em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </span>{' '}
          {words2}{' '}
          <span
            ref={(el) => {
              if (el) {
                aboutTimelineRefs.current[chip2Idx] = { el, isChip: true };
              }
            }}
            className="inline-chip inline-chip-lime"
            style={{ willChange: 'transform, opacity, filter' }}
            title="Performance & Energia"
          >
            <svg
              width="0.55em"
              height="0.55em"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
            </svg>
          </span>
        </span>
      </h2>
    );
  };

  return (
    <>
      {/* Fixed Navigation */}
      <header className="site-header">
        <div className="header-left">
          <a href="#top" className="nav-pill-shell brand-pill">
            <LightningIcon size={18} />
            <span>Portfólio</span>
          </a>
          <nav className="nav-pill-shell links-pill" aria-label="Navegação principal">
            <a href="#servicos" className="nav-link">
              Serviços
            </a>
            <a href="#como-funciona" className="nav-link">
              Como funciona
            </a>
            <a href="#sobre" className="nav-link">
              Sobre mim
            </a>
            <a href="#depoimentos" className="nav-link">
              Depoimentos
            </a>
          </nav>
        </div>
        <a href="#contact" className="header-cta">
          Fale comigo
        </a>
      </header>

      <main id="top">
        {/* 1. HERO */}
        <section ref={heroSectionRef} className="hero-section">
          <div ref={heroClipRef} className="hero-clip-wrapper">
            <canvas ref={heroGradCanvasRef} className="webgl-canvas-layer" />
            <canvas ref={heroPlasmaCanvasRef} className="webgl-plasma-layer" />

            <div ref={heroOverlayRef} className="hero-overlay">
              {renderHeroTitle()}

              <div className="hero-bottom">
                <ul className="hero-stats">
                  <li
                    ref={(el) => {
                      heroItemsRef.current[0] = el;
                    }}
                    className="hero-stat-item"
                  >
                    <span className="hero-stat-val">4,9</span>
                    <span className="hero-stat-label">Avaliações</span>
                  </li>
                  <li
                    ref={(el) => {
                      heroItemsRef.current[1] = el;
                    }}
                    className="hero-stat-item"
                  >
                    <span className="hero-stat-val">30k</span>
                    <span className="hero-stat-label">Clientes ativos</span>
                  </li>
                  <li
                    ref={(el) => {
                      heroItemsRef.current[2] = el;
                    }}
                    className="hero-stat-item"
                  >
                    <span className="hero-stat-val">15k</span>
                    <span className="hero-stat-label">Feedbacks positivos</span>
                  </li>
                </ul>

                <div className="hero-highlight">
                  <p
                    ref={(el) => {
                      heroItemsRef.current[3] = el;
                    }}
                    className="hero-highlight-lead"
                  >
                    Design único, animações fluidas e experiências digitais que transformam ideias em projetos memoráveis.
                  </p>
                  <p
                    ref={(el) => {
                      heroItemsRef.current[4] = el;
                    }}
                    className="hero-highlight-body"
                  >
                    Desenvolvimento web moderno focado em performance, interatividade 3D e interfaces exclusivas. Do conceito inicial até a entrega final — código limpo, visual marcante e sem complicações.
                  </p>
                  <div
                    ref={(el) => {
                      heroItemsRef.current[5] = el;
                    }}
                    className="hero-ctas"
                  >
                    <a href="#servicos" className="btn-white-pill">
                      Ver projetos
                    </a>
                    <a href="#contact" className="link-underlined">
                      Falar comigo
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. FAIXA DE LOGOS */}
        <section className="logos-section" aria-label="Parceiros">
          <div className="logos-container">
            {[0, 1].map((stripIdx) => (
              <div key={stripIdx} className="logo-strip">
                <div
                  ref={stripIdx === 0 ? logoTrack1Ref : logoTrack2Ref}
                  className="logo-track"
                >
                  {Array.from({ length: 6 }).map((_, copyIdx) =>
                    LOGO_NAMES.map((name, i) => {
                      const globalIdx = copyIdx * LOGO_NAMES.length + i;
                      return (
                        <div key={`${copyIdx}-${i}`} className="logo-item">
                          <LogoMark index={globalIdx} />
                          <span className="logo-name">{name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. SOBRE */}
        <section id="sobre" className="about-section">
          <p ref={aboutKickerRef} className="about-kicker">
            <span className="about-kicker-dot" />
            Sobre nós
          </p>
          {renderAboutStatement()}
        </section>

        {/* 4. NÚMEROS */}
        <section
          id="depoimentos"
          ref={numbersSectionRef}
          className="numbers-section"
        >
          <div className="numbers-grid">
            {/* Card 1: Parcerias (azul) */}
            <article
              ref={(el) => {
                numbersCardsRef.current[0] = el;
              }}
              className="card-partnerships"
            >
              <img
                src="/assets/images/2nd/people.png"
                alt="Equipe e projetos"
                className="card-bg-img"
                referrerPolicy="no-referrer"
              />
              <div className="card-partnerships-scrim" />
              <span className="card-partnerships-brand">CRAFT</span>
              <div className="card-partnerships-badge" aria-hidden="true">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.6 6.4L21 9l-5 4.2L17.8 20 12 16.3 6.2 20 8 13.2 3 9l6.4-.6z" />
                </svg>
              </div>
              <div className="card-partnerships-inner">
                <div className="stat-big-num">50+</div>
                <p
                  style={{
                    marginTop: '0.75rem',
                    maxWidth: '20rem',
                    fontSize: '1rem',
                    lineHeight: 1.625,
                    color: 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  Projetos entregues com foco em performance, estética única e alto impacto.
                </p>
              </div>
            </article>

            {/* Card 2: Compromisso (cinza) */}
            <article
              ref={(el) => {
                numbersCardsRef.current[1] = el;
              }}
              className="card-commitment"
            >
              <div>
                <p style={{ fontSize: '1rem', color: 'rgba(0, 0, 0, 0.55)' }}>
                  Compromisso com a excelência
                </p>
                <div className="stat-big-num" style={{ marginTop: '1rem' }}>
                  100%
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div className="avatar-stack">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="avatar-item">
                      <img
                        src={`/assets/images/2nd/avatars/${n}.png`}
                        alt={`Cliente ${n}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
                <blockquote
                  style={{
                    maxWidth: '28rem',
                    fontSize: '1.5rem',
                    lineHeight: 1.375,
                    letterSpacing: '-0.02em',
                    color: 'rgba(0, 0, 0, 0.8)',
                  }}
                >
                  “A atenção aos detalhes e o nível das animações elevaram o nosso produto a outro patamar. Entrega moderna, rápida e impecável.”
                </blockquote>
              </div>
            </article>

            {/* Coluna direita (2 cards) */}
            <div className="numbers-right-col">
              {/* Card 3: Dados (azul) */}
              <article
                ref={(el) => {
                  numbersCardsRef.current[2] = el;
                }}
                className="card-data"
              >
                <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Performance & Otimização
                </p>
                <div className="stat-big-num" style={{ marginTop: '0.75rem' }}>
                  99+
                </div>
                <p
                  style={{
                    marginTop: 'auto',
                    maxWidth: '20rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.5,
                  }}
                >
                  Pontuação máxima no Lighthouse e código otimizado para carregamento instantâneo.
                </p>
              </article>

              {/* Card 4: Alcance (escuro) */}
              <article
                ref={(el) => {
                  numbersCardsRef.current[3] = el;
                }}
                className="card-reach"
              >
                <span
                  style={{
                    fontSize: '1.125rem',
                    color: 'rgba(255, 255, 255, 0.55)',
                  }}
                >
                  Clientes & Parceiros
                </span>
                <span className="stat-big-num">30+</span>
              </article>
            </div>
          </div>
        </section>

        {/* 5. VITRINE */}
        <section id="servicos" className="showcase-section">
          <div className="showcase-header">
            <AnimatedHeading
              text="Engenharia cuidadosa por trás de cada detalhe"
              className="showcase-title"
            />
            <a href="#como-funciona" className="btn-outline-dark">
              Explore a plataforma
            </a>
          </div>

          <div className="showcase-grid">
            {SHOWCASE_ITEMS.map((item, idx) => (
              <article
                key={idx}
                className="showcase-col"
                onPointerEnter={() => {
                  showcaseHoverTargetRef.current[idx] = 1;
                }}
                onPointerLeave={() => {
                  showcaseHoverTargetRef.current[idx] = 0;
                }}
              >
                <div
                  ref={(el) => {
                    showcasePhotoRefs.current[idx] = el;
                  }}
                  className="showcase-photo-layer"
                >
                  <img
                    src={item.img}
                    alt={`${item.line1} ${item.line2}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="showcase-mobile-scrim" />
                <div
                  ref={(el) => {
                    showcaseScrimRefs.current[idx] = el;
                  }}
                  className="showcase-desktop-scrim"
                />
                <div className="showcase-label">
                  <span>{item.line1}</span>
                  <span>{item.line2}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 6. PORTFÓLIO (Pilha 3D de cards fixada) */}
        <section
          id="como-funciona"
          ref={portfolioSectionRef}
          className="portfolio-section"
        >
          <div className="portfolio-sticky">
            {/* Camada 1: Fundo desfocado */}
            <div className="portfolio-bg-wrap">
              {PORTFOLIO_ITEMS.map((item, i) => (
                <img
                  key={i}
                  ref={(el) => {
                    portfolioBgRefs.current[i] = el;
                  }}
                  src={item.img}
                  alt=""
                  aria-hidden="true"
                  className="portfolio-bg-img"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="portfolio-bg-dim" />
            </div>

            {/* Camada 2: Título */}
            <AnimatedHeading text="Projetos em destaque" className="portfolio-title" />

            {/* Camada 3: Palco 3D */}
            <div className="portfolio-stage-3d">
              {PORTFOLIO_ITEMS.map((item, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    portfolioCardRefs.current[i] = el;
                  }}
                  className="portfolio-card-3d"
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                  />
                  <div
                    ref={(el) => {
                      portfolioVeilRefs.current[i] = el;
                    }}
                    className="portfolio-card-veil"
                  />
                </div>
              ))}
            </div>

            {/* Camada 4: Linha de metadados */}
            <div className="portfolio-meta-row">
              <span ref={portfolioIndexRef} className="portfolio-meta-index">
                01 / 06
              </span>
              <span ref={portfolioNameRef} className="portfolio-meta-name">
                ATScope
              </span>
              <a href="#produto" className="portfolio-meta-btn">
                Ver projeto
              </a>
            </div>
          </div>
        </section>

        {/* 7. CORRENTE + PRODUTO (Revelação fixada em camadas nº 1) */}
        <div ref={chainWrapperRef} style={{ position: 'relative' }}>
          {/* Corrente Fixada */}
          <section className="chain-sticky">
            <canvas ref={chainGradCanvasRef} className="webgl-canvas-layer" />
            <canvas ref={chainModelCanvasRef} className="webgl-canvas-layer" />

            <div className="chain-overlay">
              <AnimatedHeading
                text="Design & Engenharia"
                className="chain-title"
                alphaFn={(f) => 1 - f * 0.65}
              />

              <div className="chain-bottom">
                <p className="chain-desc">
                  Da concepção visual ao desenvolvimento de alta performance. Interfaces
                  interativas, 3D imersivo e código limpo construídos para conectar marcas a
                  experiências inesquecíveis.
                </p>
                <p className="chain-right-display">do conceito ao código</p>
              </div>
            </div>
          </section>

          {/* Produto Bento */}
          <section id="produto" ref={productSectionRef} className="product-section">
            <div className="product-header">
              <AnimatedHeading text="Como eu construo cada projeto" className="product-title" />
              <a href="#contact" className="btn-black-pill">
                Iniciar conversa
              </a>
            </div>

            <div className="product-grid">
              {/* Card 1: Largo com foto */}
              <article
                ref={(el) => {
                  productCardsRef.current[0] = el;
                }}
                className="product-card-wide"
              >
                <img
                  src="/assets/images/6th.png"
                  alt="Experiências 3D e interfaces memoráveis"
                  className="card-bg-img"
                  referrerPolicy="no-referrer"
                />
                <h3 className="product-card-title">
                  Experiências 3D e interfaces memoráveis
                </h3>
                <p className="product-card-body">
                  Criação de websites interativos, gráficos em WebGL e animações fluidas
                  que prendem a atenção e destacam a sua presença digital.
                </p>
              </article>

              {/* Card 2: Cinza */}
              <article
                ref={(el) => {
                  productCardsRef.current[1] = el;
                }}
                className="product-card-gray"
              >
                <h3 className="product-card-title">Código limpo, rápido e escalável</h3>
                <p className="product-card-body">
                  Aplicações desenvolvidas com React, TypeScript e Tailwind, focadas em
                  tempos de carregamento mínimos e máxima performance.
                </p>
              </article>

              {/* Card 3: Cinza */}
              <article
                ref={(el) => {
                  productCardsRef.current[2] = el;
                }}
                className="product-card-gray"
              >
                <h3 className="product-card-title">Design responsivo e acessível</h3>
                <p className="product-card-body">
                  Interfaces cuidadosamente adaptadas para qualquer dispositivo,
                  proporcionando navegação intuitiva em desktop e mobile.
                </p>
              </article>
            </div>
          </section>
        </div>

        {/* 8. FORMULÁRIO DE CONTATO + RODAPÉ (Revelação fixada em camadas nº 2) */}
        <div style={{ position: 'relative' }}>
          {/* Formulário de Contato Fixado */}
          <section id="contact" className="contact-section">
            <AnimatedHeading
              text="Vamos criar algo incrível juntos? Fique à vontade para mandar uma mensagem e tirar seu projeto do papel."
              className="contact-heading"
            />

            <form
              className="contact-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                const msg = encodeURIComponent(
                  `Olá Wendel! Vim pelo seu portfólio e gostaria de criar um site.${
                    nome.trim() ? ` Me chamo ${nome.trim()}.` : ''
                  }${
                    email.trim() ? ` Meu e-mail: ${email.trim()}.` : ''
                  }${
                    telefone.trim() ? ` Tel: ${telefone.trim()}.` : ''
                  }`
                );
                window.open(`https://wa.me/5577988901718?text=${msg}`, '_blank');
              }}
            >
              <div className="contact-row-1">
                <div className="field-wrapper">
                  <label htmlFor="field-nome" className="sr-only">
                    Nome
                  </label>
                  <input
                    id="field-nome"
                    type="text"
                    placeholder="NOME"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="field-input"
                  />
                  <span
                    className={`field-dot ${nome.trim().length > 0 ? 'filled' : ''}`}
                  />
                </div>

                <div className="field-wrapper">
                  <label htmlFor="field-telefone" className="sr-only">
                    Telefone
                  </label>
                  <input
                    id="field-telefone"
                    type="tel"
                    placeholder="TELEFONE"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="field-input"
                  />
                  <span
                    className={`field-dot ${
                      telefone.trim().length > 0 ? 'filled' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="field-wrapper">
                <label htmlFor="field-email" className="sr-only">
                  E-mail
                </label>
                <input
                  id="field-email"
                  type="email"
                  placeholder="E-MAIL"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                />
                <span
                  className={`field-dot ${email.trim().length > 0 ? 'filled' : ''}`}
                />
              </div>

              <div className="contact-submit-row">
                <button
                  type="submit"
                  className="btn-black-pill"
                  style={{ marginTop: 0 }}
                >
                  Enviar
                </button>
                <p className="contact-status" role="status" aria-live="polite">
                  {submitted ? 'Obrigado — entrarei em contato em breve.' : ''}
                </p>
              </div>
            </form>
          </section>

          {/* Rodapé */}
          <footer ref={footerRef} className="site-footer">
            <div className="footer-scene-wrap">
              <canvas ref={footerGradCanvasRef} className="webgl-canvas-layer" />
              <canvas ref={footerHeartCanvasRef} className="webgl-canvas-layer" />
            </div>

            <div className="footer-content">
              <div className="footer-top-cta">
                <AnimatedHeading
                  text="Tem um projeto em mente? Vamos conversar."
                  className="footer-heading"
                />
                <a
                  href="https://wa.me/5577988901718?text=Ol%C3%A1%20Wendel!%20Vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20criar%20um%20site."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-pill-btn"
                >
                  Iniciar um projeto
                </a>
              </div>

              <div style={{ flex: 1 }} />

              <nav className="footer-nav" aria-label="Links do rodapé">
                <div className="footer-nav-group">
                  <div>
                    <h3 className="footer-col-title">Links</h3>
                    <ul className="footer-col-list">
                      <li>
                        <a href="#top" className="footer-link">
                          Voltar ao topo
                        </a>
                      </li>
                      <li>
                        <a href="#como-funciona" className="footer-link">
                          Ver projetos
                        </a>
                      </li>
                      <li>
                        <a href="#contact" className="footer-link">
                          Falar comigo
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="footer-col-title">Mapa do site</h3>
                    <ul className="footer-col-list">
                      <li>
                        <a href="#top" className="footer-link">
                          Início
                        </a>
                      </li>
                      <li>
                        <a href="#servicos" className="footer-link">
                          Serviços & Habilidades
                        </a>
                      </li>
                      <li>
                        <a href="#sobre" className="footer-link">
                          Sobre mim
                        </a>
                      </li>
                      <li>
                        <a href="#como-funciona" className="footer-link">
                          Projetos 3D
                        </a>
                      </li>
                      <li>
                        <a href="#contact" className="footer-link">
                          Contato
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="footer-nav-group">
                  <div>
                    <h3 className="footer-col-title">Contato</h3>
                    <address className="footer-address">
                      Vitória da Conquista, BA — Brasil (Disponível Remoto & Presencial)
                    </address>
                    <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#22c55e', boxShadow: '0 0 8px #22c55e', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.8125rem', color: '#22c55e', fontWeight: 500 }}>Disponível para novos projetos</span>
                    </div>
                    <div className="footer-col-list">
                      <a href="mailto:wendellmottasilva356@gmail.com" className="footer-link">
                        wendellmottasilva356@gmail.com
                      </a>
                      <a
                        href="https://wa.me/5577988901718?text=Ol%C3%A1%20Wendel!%20Vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20criar%20um%20site."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        WhatsApp: (77) 98890-1718
                      </a>
                    </div>
                  </div>

                  <div>
                    <h3 className="footer-col-title">Redes Sociais</h3>
                    <ul className="footer-col-list">
                      <li>
                        <a
                          href="https://github.com/Led-New"
                          target="_blank"
                          rel="noopener"
                          className="footer-link"
                        >
                          GitHub
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.linkedin.com/in/wendel-mota-silva/"
                          target="_blank"
                          rel="noopener"
                          className="footer-link"
                        >
                          LinkedIn
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.instagram.com/_wendel_m/"
                          target="_blank"
                          rel="noopener"
                          className="footer-link"
                        >
                          Instagram
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </nav>

              <div
                className="footer-credit-row"
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderTop: '1px solid rgba(242, 244, 241, 0.1)',
                  paddingTop: '1.5rem',
                }}
              >
                <span>© {new Date().getFullYear()} Wendel · Todos os direitos reservados.</span>
                <span style={{ color: 'var(--footer-muted)' }}>
                  Design & Desenvolvimento Frontend Criativo
                </span>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Loader Overlay */}
      {loaderVisible && (
        <div ref={loaderOverlayRef} className="preloader-overlay" aria-hidden="true">
          <div className="preloader-center-logo">
            <LightningIcon size={28} />
            <span>Portfólio</span>
          </div>

          <div
            ref={loaderCounterWrapRef}
            className="preloader-counter-wrap"
            style={{ left: '16%' }}
          >
            <span ref={loaderCounterTextRef} className="preloader-counter-text">
              0%
            </span>
          </div>

          <div
            ref={loaderBarOuterRef}
            className="preloader-bar-outer"
            style={{ transform: 'scaleY(0.08)' }}
          >
            <div
              ref={loaderBarInnerRef}
              className="preloader-bar-inner"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
