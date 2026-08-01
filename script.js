/* ==========================================================================
   WENDEL 3D PORTFOLIO - SCRIPT UNIFICADO OTIMIZADO 100 FPS
   Combina o Hero 3D do backap + Todas as seções e animações do projeto/Site
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// 1. CARREGAMENTO DE VÍDEOS DINÂMICOS (footer)
window.addEventListener("load", () => {
  const midiaBackgroundFooter = document.querySelector("footer .midiaBackground");
  if (midiaBackgroundFooter && !midiaBackgroundFooter.querySelector("video")) {
    const videoFooter = document.createElement("video");
    videoFooter.src = "assets/img/video-footer.mp4";
    videoFooter.autoplay = true;
    videoFooter.muted = true;
    videoFooter.playsInline = true;
    videoFooter.loop = true;
    videoFooter.style.opacity = "0";
    videoFooter.style.transition = "opacity 0.8s ease";

    videoFooter.addEventListener("canplaythrough", () => {
      videoFooter.style.opacity = "1";
    });

    midiaBackgroundFooter.appendChild(videoFooter);
  }
});

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

let mainSmoother = null;

// 2. REGISTRO DE PLUGINS DO GSAP
if (typeof gsap !== "undefined") {
  if (typeof ScrollTrigger !== "undefined" && typeof ScrollSmoother !== "undefined" && typeof SplitText !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  } else if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  if (window.innerWidth > 1000 && typeof ScrollSmoother !== "undefined") {
    try {
      mainSmoother = ScrollSmoother.create({
        smooth: 2,
        effects: true,
      });
    } catch (e) {
      console.warn("ScrollSmoother não carregado:", e);
    }
  }
}

// 3. NOSSO HERO 3D (hopper_car.glb DO BACKAP - OTIMIZADO 100 FPS)
let sceneHero, cameraHero, rendererHero, modelHero, mixerHero;

function initHero3D() {
  const canvasContainer = document.getElementById("canvas-container");
  const canvas = document.getElementById("webgl-canvas");
  if (!canvasContainer || !canvas) return;

  sceneHero = new THREE.Scene();

  cameraHero = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  cameraHero.position.set(0, 0, 8);

  rendererHero = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  rendererHero.setSize(window.innerWidth, window.innerHeight);
  rendererHero.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  rendererHero.outputColorSpace = THREE.SRGBColorSpace;
  rendererHero.toneMapping = THREE.ACESFilmicToneMapping;
  rendererHero.toneMappingExposure = 1.35;
  rendererHero.shadowMap.enabled = true;
  rendererHero.shadowMap.type = THREE.PCFSoftShadowMap;

  // ILUMINAÇÃO ESTÚDIO DO BACKAP
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  sceneHero.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
  keyLight.position.set(6, 8, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 512;
  keyLight.shadow.mapSize.height = 512;
  sceneHero.add(keyLight);

  const rimLightWhite = new THREE.DirectionalLight(0xffffff, 2.0);
  rimLightWhite.position.set(-8, 5, -6);
  sceneHero.add(rimLightWhite);

  const fillLight = new THREE.DirectionalLight(0xffaa55, 1.3);
  fillLight.position.set(0, -6, 5);
  sceneHero.add(fillLight);

  let initialPosX = -0.3;
  let initialRotX = 0.18;
  let initialRotY = -0.45;
  let initialPosY = -0.25;
  let maxDimGlobal = 1;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  function getResponsiveScaleFactor() {
    const w = window.innerWidth;
    if (w <= 480) return 3.0; // Mobile pequeno (iPhone SE, etc)
    if (w <= 768) return 3.4; // Mobile padrão
    if (w <= 1024) return 4.3; // Tablet
    return 5.2; // Desktop
  }

  function applyModel(gltf) {
    modelHero = gltf.scene;

    // Embedded GLTF Animations
    if (gltf.animations && gltf.animations.length > 0) {
      mixerHero = new THREE.AnimationMixer(modelHero);
      gltf.animations.forEach((clip) => {
        const action = mixerHero.clipAction(clip);
        action.play();
      });
    }

    const box = new THREE.Box3().setFromObject(modelHero);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const isMobile = window.innerWidth <= 768;
    const posXOffset = isMobile ? initialPosX + 0.15 : initialPosX;
    const posYOffset = isMobile ? initialPosY + 0.22 : initialPosY;

    modelHero.position.x = -center.x + posXOffset;
    modelHero.position.y = -center.y + posYOffset;
    modelHero.position.z = -center.z;

    maxDimGlobal = Math.max(size.x, size.y, size.z);
    const targetScale = getResponsiveScaleFactor() / maxDimGlobal;
    modelHero.scale.setScalar(targetScale);

    modelHero.rotation.x = initialRotX;
    modelHero.rotation.y = initialRotY;

    modelHero.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1.5;
        }
      }
    });

    sceneHero.add(modelHero);
  }

  gltfLoader.load(
    "assets/gltf/hopper_car.glb",
    (gltf) => applyModel(gltf),
    undefined,
    () => {
      gltfLoader.load("public/hopper_car.glb", (gltf) => applyModel(gltf));
    }
  );

  const clock = new THREE.Clock();
  let heroAnimationId = null;
  let isHeroVisible = true;

  function animateHero() {
    if (!isHeroVisible) return;
    heroAnimationId = requestAnimationFrame(animateHero);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (mixerHero) {
      mixerHero.update(delta);
    }

    if (modelHero) {
      const isMobile = window.innerWidth <= 768;
      const posXOffset = isMobile ? initialPosX + 0.15 : initialPosX;
      const posYOffset = isMobile ? initialPosY + 0.22 : initialPosY;

      const slowDriftRight = Math.sin(elapsedTime * 0.12) * (isMobile ? 0.25 : 0.55);
      modelHero.position.x = posXOffset + slowDriftRight;
      modelHero.rotation.y = initialRotY + (elapsedTime * 0.035);
      modelHero.rotation.x = initialRotX;
      modelHero.position.y = posYOffset + Math.sin(elapsedTime * 1.2) * 0.04;
    }
    if (rendererHero && sceneHero && cameraHero) {
      rendererHero.render(sceneHero, cameraHero);
    }
  }

  // IntersectionObserver to pause rendering when hero section is out of screen
  const observerHero = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isHeroVisible = entry.isIntersecting;
      if (isHeroVisible) {
        if (!heroAnimationId) {
          clock.start();
          animateHero();
        }
      } else {
        if (heroAnimationId) {
          cancelAnimationFrame(heroAnimationId);
          heroAnimationId = null;
        }
      }
    });
  }, { threshold: 0.02 });

  observerHero.observe(canvasContainer);
  animateHero();

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!cameraHero || !rendererHero) return;
      cameraHero.aspect = window.innerWidth / window.innerHeight;
      cameraHero.updateProjectionMatrix();
      rendererHero.setSize(window.innerWidth, window.innerHeight);
      rendererHero.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      if (modelHero && maxDimGlobal) {
        modelHero.scale.setScalar(getResponsiveScaleFactor() / maxDimGlobal);
      }
    }, 100);
  });
}

// 4. PRELOADER EXATO DO PROJETO/SITE (0% -> 100% + fadeOut)
const preloaderText = document.querySelector(".preloader-text");
const preloader = document.getElementById("preloader");
let count = 0;

const interval = setInterval(() => {
  if (document.readyState === "complete") count = 100;
  else count += Math.random() * 5;

  if (count >= 100) count = 100;

  if (preloaderText) preloaderText.textContent = `${Math.floor(count)}%`;

  if (count === 100) {
    clearInterval(interval);
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          preloader.remove();
          if (typeof gsap !== "undefined") {
            gsap.fromTo(".btn, .hero-subtitle, .nav-links li, .nav-footer", 
              { y: 30, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 1,
                stagger: 0.1,
                ease: "power3.out",
                delay: 0.2,
                clearProps: "transform,opacity"
              }
            );
          }
        },
      });
  }
}, 50);

// 5. TIMELINES DO PROJETO/SITE
if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
  // 1. PIN DA MAIN HERO & TRANSIÇÃO COM AS 11 COLUNAS PRETAS
  const tlTransitionHero = gsap.timeline({
    scrollTrigger: {
      trigger: "main",
      scrub: 1,
      pin: true,
      start: "top top",
      end: "+=1200",
    },
  });

  tlTransitionHero.to(".transition div", {
    height: "100%",
    duration: 1,
    stagger: 0.08,
    ease: "none",
  });

  // TEXTOS DE TRANSIÇÃO (Sobre as 11 colunas pretas pinadas)
  const paragrafos2 = document.querySelectorAll(".textoTransicao p.textoAnimado2");
  if (paragrafos2.length && typeof SplitText !== "undefined") {
    try {
      gsap.set(paragrafos2, { opacity: 0 });

      const splits2 = Array.from(paragrafos2).map((p) =>
        new SplitText(p, { types: "lines, words, chars", mask: "lines" })
      );

      splits2.forEach((split, i) => {
        const p = paragrafos2[i];

        // Torna visível
        tlTransitionHero.set(p, { opacity: 1 });

        // Chars sobem de baixo
        tlTransitionHero.from(split.chars, {
          y: "100%",
          opacity: 0,
          duration: 0.4,
          stagger: 0.02,
        });

        // Pausa para leitura (o texto FICA visível na tela, sem apagar!)
        tlTransitionHero.to({}, { duration: 0.8 });
      });
    } catch (e) {
      console.warn("SplitText fallback textoAnimado2:", e);
      gsap.set(paragrafos2, { opacity: 1 });
    }
  } else {
    gsap.set(paragrafos2, { opacity: 1 });
  }


  // Posição inicial oculta fora da tela e texto invisível até o gatilho
  gsap.set(".fig-left-top", { x: "-60vw", opacity: 0 });
  gsap.set(".fig-left-bottom", { x: "-60vw", opacity: 0 });
  gsap.set(".fig-right-top", { x: "60vw", opacity: 0 });
  gsap.set(".fig-right-bottom", { x: "60vw", opacity: 0 });
  gsap.set("#about-me-desc", { opacity: 0 });

  window.footerAboutAnimated = false;

  window.triggerFooterAboutAnimations = function () {
    if (window.footerAboutAnimated) return;
    window.footerAboutAnimated = true;

    const svgStrokeText = document.getElementById("svg-stroke-text");
    const editorialDraw = document.getElementById("editorial-draw");
    const aboutDesc = document.getElementById("about-me-desc");

    // 1. Título Desenhado (Stroke Outline -> Solid Fill)
    if (svgStrokeText) {
      svgStrokeText.classList.add("drawn");
    }
    if (editorialDraw) {
      editorialDraw.classList.add("drawn");
    }

    // 2. Entrada das 4 Figuras 3D Saindo de Fora da Tela (-60vw / 60vw)
    gsap.fromTo(
      ".fig-left-top",
      { x: "-60vw", opacity: 0, rotation: -72 },
      { x: 0, opacity: 1, rotation: -12, duration: 1.4, ease: "back.out(1.3)" }
    );

    gsap.fromTo(
      ".fig-left-bottom",
      { x: "-60vw", opacity: 0, rotation: 65 },
      { x: 0, opacity: 1, rotation: 15, duration: 1.6, ease: "back.out(1.3)" }
    );

    gsap.fromTo(
      ".fig-right-top",
      { x: "60vw", opacity: 0, rotation: 72 },
      { x: 0, opacity: 1, rotation: 18, duration: 1.5, ease: "back.out(1.3)" }
    );

    gsap.fromTo(
      ".fig-right-bottom",
      { x: "60vw", opacity: 0, rotation: -60 },
      { x: 0, opacity: 1, rotation: -10, duration: 1.7, ease: "back.out(1.3)" }
    );

    // 3. Texto Descritivo Datilografado no parágrafo inteiro
    if (aboutDesc) {
      gsap.to(aboutDesc, { opacity: 1, duration: 0.1 });
      if (typeof SplitText !== "undefined") {
        try {
          const splitDesc = new SplitText(aboutDesc, { types: "lines, words, chars" });
          gsap.fromTo(
            splitDesc.chars,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.04, stagger: 0.015, ease: "power1.out" }
          );
        } catch (e) {
          gsap.fromTo(aboutDesc, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 });
        }
      }
    }
  };

  window.resetFooterAboutAnimations = function () {
    if (!window.footerAboutAnimated) return;
    window.footerAboutAnimated = false;
    const svgStrokeText = document.getElementById("svg-stroke-text");
    if (svgStrokeText) svgStrokeText.classList.remove("drawn");
    gsap.set("#about-me-desc", { opacity: 0 });
    gsap.set(".fig-left-top", { x: "-60vw", opacity: 0 });
    gsap.set(".fig-left-bottom", { x: "-60vw", opacity: 0 });
    gsap.set(".fig-right-top", { x: "60vw", opacity: 0 });
    gsap.set(".fig-right-bottom", { x: "60vw", opacity: 0 });
  };

  if (typeof ScrollTrigger !== "undefined") {
    ScrollTrigger.create({
      trigger: ".editorial-statement",
      start: "top 60%",
      onEnter: () => {
        const drawSvg = document.getElementById("draw-svg");
        if (drawSvg) drawSvg.classList.add("active");
        if (window.triggerFooterAboutAnimations) window.triggerFooterAboutAnimations();
      },
      onLeaveBack: () => {
        const drawSvg = document.getElementById("draw-svg");
        if (drawSvg) drawSvg.classList.remove("active");
      }
    });
  }

  // Flutuação Contínua das Figuras
  gsap.to(".fig-left-top img", { y: -16, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".fig-left-bottom img", { y: 18, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".fig-right-top img", { y: -20, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".fig-right-bottom img", { y: 15, duration: 4.0, repeat: -1, yoyo: true, ease: "sine.inOut" });

  // TITULOS ANIMADOS COM SPLITTEXT
  const textos = document.querySelectorAll(".textoAnimado");
  textos.forEach((texto) => {
    if (typeof SplitText !== "undefined") {
      try {
        const split = new SplitText(texto, { types: "lines, words, chars" });
        gsap.from(split.chars, {
          filter: "blur(20px)",
          opacity: 0,
          duration: 0.3,
          stagger: {
            each: 0.02,
            from: "random",
          },
          scrollTrigger: {
            trigger: texto,
            start: "top 80%",
            toggleActions: "play none restart none",
          },
        });
      } catch (e) {
        gsap.from(texto, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          scrollTrigger: {
            trigger: texto,
            start: "top 80%",
          },
        });
      }
    }
  });

  // PROJETO SCROLL REVEAL (ABRIR E FECHAR DOS CARDS)
  const projetos = document.querySelectorAll(".projeto");
  projetos.forEach((projeto) => {
    const imgProjeto = projeto.querySelector("img");
    gsap.to(projeto, {
      width: "100%",
      borderRadius: 0,
      scrollTrigger: {
        trigger: projeto,
        end: "50% 50%",
        scrub: 1,
      },
    });

    if (imgProjeto) {
      gsap.to(imgProjeto, {
        filter: "saturate(100%)",
        scrollTrigger: {
          trigger: projeto,
          start: "0% 70%",
          end: "50% 50%",
          scrub: 1,
        },
      });
    }
  });
}

// 6. CÓDIGO THREEJS DIAMOND E TEXTOS (.div3d) DO PROJETO/SITE
function initDiamond3D() {
  const div3d = document.querySelector(".div3d");
  if (!div3d) return;

  const cena = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 4;

  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderizador.setSize(window.innerWidth, window.innerHeight);
  renderizador.physicallyCorrectLights = true;
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.2;
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  div3d.appendChild(renderizador.domElement);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load("assets/img/hdri.webp", function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderizador);
    const envMap = pmrem.fromEquirectangular(texture).texture;
    cena.environment = envMap;
    texture.dispose();
    pmrem.dispose();
  });

  let objeto = new THREE.Group();
  objeto.position.z = -8;
  objeto.position.y = 0;
  cena.add(objeto);

  const loader = new GLTFLoader();
  loader.load("assets/img/diamond-compressed.glb", (objetoCarregado) => {
    objeto.add(objetoCarregado.scene);
  });

  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    const tl3d = gsap.timeline({
      scrollTrigger: {
        trigger: ".animations",
        scrub: 1,
        pin: true,
        start: "top top",
        end: "+=1200",
      },
    });

    tl3d.to(objeto.position, {
      x: 0,
      y: 0,
      duration: 1,
    });

    tl3d.to(
      objeto.rotation,
      {
        x: 1.5 * Math.PI,
        duration: 1,
      },
      "<"
    );

    tl3d.to(
      objeto.position,
      {
        duration: 0.2,
        z: 3.2,
      },
      "-=.1"
    );

    // Oculta o diamante quando o footer aparece
    tl3d.to(".div3d", {
      opacity: 0,
      duration: 0.1,
    }, "footerFade");

    tl3d.fromTo("footer", 
      { opacity: 0 },
      { opacity: 1, duration: 0.1 }, 
      "footerFade"
    );

    // Adiciona um tempo extra no final para segurar o scroll (evita a engasgada)
    tl3d.to({}, { duration: 0.15 });
  }

  // TEXTOS 3D (.div3d h2)
  const h2s = document.querySelectorAll(".div3d h2");
  if (h2s.length > 0 && typeof gsap !== "undefined") {
    try {
      const config = {
        duration: 1,
        blur: "20px",
        pauseEntre: 2,
      };

      const tlTextos3d = gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: ".animations",
          start: "top top",
          end: "+=1200",
        },
      });

      if (typeof SplitText !== "undefined") {
        gsap.set(h2s, { opacity: 1 });
        const splits = Array.from(h2s).map((h2) => new SplitText(h2, { type: "chars" }));
        
        splits.forEach((split) => {
          gsap.set(split.chars, { opacity: 0, filter: `blur(${config.blur})` });
        });

        splits.forEach((split) => {
          tlTextos3d.to(split.chars, {
            opacity: 1,
            filter: "blur(0px)",
            duration: config.duration,
            stagger: { each: 0.3, from: "random" },
          });

          tlTextos3d.to({}, { duration: config.pauseEntre });

          tlTextos3d.to(split.chars, {
            opacity: 0,
            filter: `blur(${config.blur})`,
            duration: config.duration,
            stagger: { each: 0.3, from: "random" },
          });
        });
      } else {
        h2s.forEach((h2) => {
          gsap.set(h2, { filter: `blur(${config.blur})` });
          tlTextos3d.to(h2, {
            opacity: 1,
            filter: "blur(0px)",
            duration: config.duration,
          });
          tlTextos3d.to({}, { duration: config.pauseEntre });
          tlTextos3d.to(h2, {
            opacity: 0,
            filter: `blur(${config.blur})`,
            duration: config.duration,
          });
        });
      }
    } catch (e) {
      console.warn("Erro nos textos 3D:", e);
    }
  }

  let diamondAnimationId = null;
  let isDiamondVisible = true;

  function animar() {
    if (!isDiamondVisible) return;
    diamondAnimationId = requestAnimationFrame(animar);
    if (objeto) {
      objeto.rotation.y += 0.005;
    }
    renderizador.render(cena, camera);
  }

  const observerDiamond = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isDiamondVisible = entry.isIntersecting;
      if (isDiamondVisible) {
        if (!diamondAnimationId) {
          animar();
        }
      } else {
        if (diamondAnimationId) {
          cancelAnimationFrame(diamondAnimationId);
          diamondAnimationId = null;
        }
      }
    });
  }, { threshold: 0.02 });

  observerDiamond.observe(div3d);
  animar();
}

// 7. INTERATIVIDADE DO MENU DRAWER & NAVEGAÇÃO SUAVE
function initNavigation() {
  const menuToggle = document.getElementById("menu-toggle");
  const navOverlay = document.getElementById("nav-overlay");

  if (menuToggle && navOverlay) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      navOverlay.classList.toggle("active");

      if (navOverlay.classList.contains("active")) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
  }

  // Captura todos os links de ancoragem interna (#hero, #secao-competencias, #projects, etc)
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      // Suporte para múltiplos apelidos de id (#secao-competencias ou #competencias)
      let targetEl = document.querySelector(href);
      if (!targetEl) {
        if (href === "#secao-competencias") targetEl = document.getElementById("competencias");
        else if (href === "#competencias") targetEl = document.getElementById("secao-competencias");
      }

      if (targetEl) {
        e.preventDefault();

        // Se o menu overlay estiver aberto, fecha imediatamente
        if (menuToggle && navOverlay && navOverlay.classList.contains("active")) {
          menuToggle.classList.remove("active");
          navOverlay.classList.remove("active");
          document.body.style.overflow = "";
        }

        // Rola suavemente usando ScrollSmoother (se ativo) ou scrollIntoView nativo
        if (mainSmoother) {
          mainSmoother.scrollTo(targetEl, true, "top top");
        } else {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
}



// 10. REVEAL DO VÍDEO VIA CLIP-PATH + PLAY/PAUSE
function initVideoReveal() {
  const wrapper = document.getElementById("video-reveal");
  const info = document.querySelector(".video-info");
  const video = document.getElementById("projeto-video");
  const playBtn = document.getElementById("video-play-btn");

  if (!wrapper || typeof gsap === "undefined") return;

  // Animação do vídeo subir
  gsap.to(wrapper, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 1.4,
    ease: "power3.out",
    scrollTrigger: {
      trigger: wrapper,
      start: "top 85%",
      toggleActions: "play none none none",
    },
  });

  // Pin do vídeo no meio e expansão para fullscreen
  const tlVideoPin = gsap.timeline({
    scrollTrigger: {
      trigger: ".secao-video",
      start: "top top",
      end: "+=1000",
      scrub: 1,
      pin: true,
    }
  });

  const isMobile = window.innerWidth <= 768;

  tlVideoPin.to(".secao-video", {
    backgroundColor: "rgba(5, 13, 26, 0)",
    padding: isMobile ? "10px" : "0px",
    ease: "power1.inOut"
  }, 0);

  tlVideoPin.to(wrapper, {
    maxWidth: "100vw",
    width: isMobile ? "100%" : "100vw",
    height: isMobile ? "auto" : "100vh",
    aspectRatio: isMobile ? "16 / 9" : "auto",
    borderRadius: isMobile ? "12px" : "0px",
    ease: "power1.inOut"
  }, 0);

  if (info) {
    gsap.to(info, {
      opacity: 1,
      duration: 0.8,
      delay: 0.4,
      ease: "power2.out",
      scrollTrigger: {
        trigger: wrapper,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  }

  // Play/Pause toggle (clique no botão ou no próprio vídeo)
  if (video) {
    const togglePlay = () => {
      if (video.paused) {
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play();
        });
        if (playBtn) playBtn.classList.add("is-playing");
      } else {
        video.pause();
        if (playBtn) playBtn.classList.remove("is-playing");
      }
    };

    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlay();
      });
    }

    if (wrapper) {
      wrapper.style.cursor = "pointer";
      wrapper.addEventListener("click", togglePlay);
    }

    video.addEventListener("pause", () => {
      if (playBtn) playBtn.classList.remove("is-playing");
    });
    video.addEventListener("play", () => {
      if (playBtn) playBtn.classList.add("is-playing");
    });
  }
}

// 11. COMPETÊNCIAS - ANIMAÇÃO DOS BADGES EM ARCO + FORMAÇÃO
function initCompetencias() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  const skillsTrack = document.querySelector(".skills-arc-track");
  // As badges agora são animadas pelo CSS Marquee infinitamente.
  // Não precisamos animar a opacidade com GSAP, pois os clones não pegariam o estilo.

  // O marquee CSS agora cuida da movimentação infinita da track, 
  // então não precisamos mais animar o x da track com ScrollTrigger aqui.
  const formCards = document.querySelectorAll(".form-card");

  if (formCards.length) {
    gsap.to(formCards, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".formacao-wrapper",
        start: "top 82%",
        toggleActions: "play none none none",
      },
    });
  }
}

// INICIALIZAÇÃO GERAL
document.addEventListener("DOMContentLoaded", () => {
  initHero3D();
  initDiamond3D();
  initNavigation();
  initFooterForm();
  initVideoReveal();
  initCompetencias();
  initMarquee();
});

// 7.5 MARQUEE INFINITO PARA SKILLS
function initMarquee() {
  const arcTrack = document.querySelector('.skills-arc-track');
  if (arcTrack) {
    const items = Array.from(arcTrack.children);
    
    // Esvazia a track
    arcTrack.innerHTML = '';
    
    // Cria o grupo original
    const group = document.createElement('div');
    group.classList.add('marquee-group');
    items.forEach(item => group.appendChild(item));
    
    // Adiciona o grupo original e 3 cópias para garantir que preencha telas gigantes
    arcTrack.appendChild(group); // Mantém os elementos originais no DOM
    for (let i = 0; i < 3; i++) {
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      arcTrack.appendChild(clone);
    }
  }
}

// 8. INTERATIVIDADE DO FORMULÁRIO DO RODAPÉ (DO texte.html)
function initFooterForm() {
  const form = document.getElementById("newsletter-form");
  const bloom = document.getElementById("bloom");
  const emailInput = document.getElementById("newsletter-email");

  if (!form || !bloom) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    bloom.classList.add("pulse");
    setTimeout(() => bloom.classList.remove("pulse"), 1200);
    if (emailInput) emailInput.value = "";
  });
}

