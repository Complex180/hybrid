(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function waLink(nivel) {
    const base = "https://wa.me/" + (data.whatsapp || "");
    const text = data.whatsappText || "Hola, quiero info";
    const full = nivel ? text + " — nivel " + nivel : text;
    return base + "?text=" + encodeURIComponent(full);
  }

  function initWhatsApp() {
    $$("[data-whatsapp]").forEach(a => {
      a.href = waLink(a.dataset.nivel || "");
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

  function initModal() {
    const backdrop = $("[data-modal]");
    if (!backdrop) return;
    const open = () => { backdrop.classList.add("is-open"); const i = $("input", backdrop); if (i) i.focus(); };
    const close = () => backdrop.classList.remove("is-open");
    $$("[data-open-modal]").forEach(b => b.addEventListener("click", open));
    $$("[data-close-modal]").forEach(b => b.addEventListener("click", close));
    backdrop.addEventListener("mousedown", e => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

    const form = $("[data-login-form]", backdrop);
    const msg = $("[data-login-msg]", backdrop);
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        if (msg) msg.textContent = "Esta sección se habilita en la próxima etapa. Por ahora, escribile a Gaby por WhatsApp.";
      });
    }
  }

  function initCursorCoords() {
    if (!fineHover) return;
    const el = $("[data-cursor-coords]");
    if (!el) return;
    document.addEventListener("mousemove", e => {
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
      el.textContent = "[" + e.clientX + ", " + e.clientY + "]";
      el.classList.add("is-active");
    });
    document.addEventListener("mouseleave", () => el.classList.remove("is-active"));
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

  function boot() {
    safe(initWhatsApp, "initWhatsApp");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initModal, "initModal");
    safe(initCursorCoords, "initCursorCoords");
    safe(initSmoothAnchors, "initSmoothAnchors");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
