const header = document.querySelector("[data-header]");
const revealItems = document.querySelectorAll("[data-reveal]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const RETURN_STATE_KEY = "colin-story-return-v1";
const RESTORE_REQUEST_KEY = "colin-story-restore-v1";

const details = window.COLIN_PAGE_DETAILS ?? {};

const readSessionValue = (key) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch (_error) {
    return null;
  }
};

const writeSessionValue = (key, value) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
};

document.querySelectorAll("[data-story-link]").forEach((link) => {
  link.addEventListener("click", () => {
    const target = new URL(link.href, window.location.href);
    writeSessionValue(RETURN_STATE_KEY, {
      sourceUrl: window.location.href.split("#")[0],
      sourcePath: window.location.pathname,
      targetPath: target.pathname,
      scrollY: window.scrollY,
      linkId: link.id || null,
      viewportTop: link.getBoundingClientRect().top,
      recordedAt: Date.now(),
    });
  });
});

document.querySelectorAll("[data-return-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const saved = readSessionValue(RETURN_STATE_KEY);
    const isFresh = saved && Date.now() - Number(saved.recordedAt) < 12 * 60 * 60 * 1000;
    const matchesThisPage = isFresh && saved.targetPath === window.location.pathname;
    if (!matchesThisPage || !saved.sourceUrl || !Number.isFinite(Number(saved.scrollY))) return;

    event.preventDefault();
    writeSessionValue(RESTORE_REQUEST_KEY, {
      sourcePath: saved.sourcePath,
      scrollY: Number(saved.scrollY),
      linkId: saved.linkId,
      viewportTop: Number(saved.viewportTop),
    });
    window.location.assign(saved.sourceUrl);
  });
});

const restoreRequest = readSessionValue(RESTORE_REQUEST_KEY);
if (restoreRequest && restoreRequest.sourcePath === window.location.pathname && Number.isFinite(Number(restoreRequest.scrollY))) {
  try {
    window.sessionStorage.removeItem(RESTORE_REQUEST_KEY);
  } catch (_error) {
    // The fallback anchor still works if session storage is unavailable.
  }

  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  const savedScrollY = Number(restoreRequest.scrollY);
  const restorePosition = () => {
    const sourceLink = restoreRequest.linkId ? document.getElementById(restoreRequest.linkId) : null;
    const hasElementPosition = sourceLink && Number.isFinite(Number(restoreRequest.viewportTop));
    const targetY = hasElementPosition
      ? window.scrollY + sourceLink.getBoundingClientRect().top - Number(restoreRequest.viewportTop)
      : savedScrollY;
    window.scrollTo({ top: targetY, left: 0, behavior: "auto" });
  };
  restorePosition();
  window.requestAnimationFrame(() => window.requestAnimationFrame(restorePosition));
  window.addEventListener("load", restorePosition, { once: true });
  window.setTimeout(restorePosition, 180);
  document.fonts?.ready.then(restorePosition).catch(() => {});
}

document.querySelectorAll("[data-detail]").forEach((element) => {
  const key = element.dataset.detail;
  if (key && typeof details[key] === "string" && details[key].trim()) {
    element.textContent = details[key];
  }
});

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 28);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const closeNav = () => {
  navToggle?.setAttribute("aria-expanded", "false");
  nav?.classList.remove("is-open");
};

navToggle?.addEventListener("click", () => {
  const nextState = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(nextState));
  nav?.classList.toggle("is-open", nextState);
});

nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", href);
    closeNav();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNav();
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
