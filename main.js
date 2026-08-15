(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function waLink(nivel, mensaje) {
    const base = "https://wa.me/" + (data.whatsapp || "");
    if (mensaje) return base + "?text=" + encodeURIComponent(mensaje);
    const text = data.whatsappText || "Hola, quiero info";
    const full = nivel ? text + " — nivel " + nivel : text;
    return base + "?text=" + encodeURIComponent(full);
  }

  function initWhatsApp() {
    $$("[data-whatsapp]").forEach(a => {
      a.href = waLink(a.dataset.nivel || "", a.dataset.mensaje || "");
    });
  }

  // Precio: elegís Plan Híbrido o Plan Personalizado, y ahí adentro las 2 opciones de cada uno
  function initPlanSelector() {
    const root = $("[data-plan-selector]");
    if (!root) return;
    function mostrarPaso(paso) {
      $$("[data-plan-step]", root).forEach(el => { el.hidden = el.dataset.planStep !== paso; });
    }
    root.addEventListener("click", e => {
      const abrir = e.target.closest("[data-open-plan]");
      if (abrir) { mostrarPaso(abrir.dataset.openPlan); return; }
      if (e.target.closest("[data-plan-back]")) mostrarPaso("inicio");
    });
  }

  function initReveals() {
    const targets = $$(".reveal");
    if (!targets.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    targets.forEach(t => io.observe(t));

    setTimeout(() => {
      targets.forEach(el => {
        if (!el.classList.contains("is-revealed") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-revealed");
        }
      });
    }, 6000);
  }

  function initCountUp() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const target = parseInt(el.dataset.count, 10) || 0;
        const suffix = el.dataset.suffix || "";
        if (reduced) { el.textContent = target + suffix; return; }
        const dur = 900;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(target * p) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.2 });
    els.forEach(el => io.observe(el));
  }

  function initSmoothAnchors() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#" || id === "#top") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navOffset = 76;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  function initServiceWorker() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  function boot() {
    safe(initWhatsApp, "initWhatsApp");
    safe(initPlanSelector, "initPlanSelector");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initServiceWorker, "initServiceWorker");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
