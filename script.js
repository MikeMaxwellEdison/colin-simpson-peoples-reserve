const header = document.querySelector("[data-header]");
const revealItems = document.querySelectorAll("[data-reveal]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

const details = window.COLIN_PAGE_DETAILS ?? {};

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
