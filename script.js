// mark JS availability so CSS only hides .reveal content when we can reveal it
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// ============ pixel art: shared renderer ============
// Every sprite/icon is a character map — one char per pixel. Edit the maps to
// redraw. Palette matches the site tokens.
const PIXEL_COLORS = {
  o: "#1b1830", // outline
  b: "#7C3AED", // body violet
  l: "#A78BFA", // light violet
  w: "#F4F2FF", // white
  p: "#0B0A12", // pupil / dark
  a: "#FBBF24", // amber
};

function renderPixels(el, map, { extra } = {}) {
  if (!el) return;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${map[0].length} ${map.length}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PIXEL_COLORS[ch];
      if (!color) return;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", color);
      svg.appendChild(rect);
    });
  });

  if (extra) extra(svg, svgNS);
  el.appendChild(svg);
}

// ============ the starter blob (meowl-adjacent, drawn from scratch) ============
const SPRITE_MAP = [
  "..o..........o..",
  ".obo........obo.",
  ".obbo......obbo.",
  "..obboooooobbo..",
  ".obbbbbbbbbbbbo.",
  "obbwwwbbbbwwwbbo",
  "obwwwwwbbwwwwwbo",
  "obwppwwbbwwppwbo",
  "obwwwwwaawwwwwbo",
  "obbwwwbaabwwwbbo",
  "obbbbbbbbbbbbbbo",
  "obblbbbbbbbblbbo",
  ".obbllbbbbllbbo.",
  ".obbbbbbbbbbbbo.",
  "..oobbbbbbbboo..",
  "....oa....ao....",
];

// eye bounding boxes (col, row, w, h) for the blink eyelids
const EYES = [
  [2, 5, 5, 5],
  [9, 5, 5, 5],
];

function renderSprite(el, { blink = true } = {}) {
  renderPixels(el, SPRITE_MAP, {
    extra: blink
      ? (svg, svgNS) => {
          EYES.forEach(([x, y, w, h], i) => {
            const lid = document.createElementNS(svgNS, "rect");
            lid.setAttribute("x", x);
            lid.setAttribute("y", y);
            lid.setAttribute("width", w);
            lid.setAttribute("height", h);
            lid.setAttribute("fill", PIXEL_COLORS.b);
            lid.setAttribute("class", "eyelid");
            lid.style.animationDelay = `${i * 0.02}s`;
            svg.appendChild(lid);
          });
        }
      : undefined,
  });
}

renderSprite(document.getElementById("hero-sprite-stage"));
renderSprite(document.getElementById("waitlist-sprite"));
renderSprite(document.getElementById("nav-sprite"), { blink: false });
renderSprite(document.getElementById("footer-sprite"), { blink: false });

// ============ feature-card icons: same technique, 10×10 ============
const ICONS = {
  chat: [
    ".oooooooo.",
    "obbbbbbbbo",
    "obwbwbwbbo",
    "obbbbbbbbo",
    "obbbbbbbbo",
    ".ooobbooo.",
    "...obbo...",
    "...obo....",
    "...oo.....",
    "..........",
  ],
  mask: [
    ".oooooooo.",
    "obbbbbbbbo",
    "obwwbbwwbo",
    "obwpbbpwbo",
    "obbbbbbbbo",
    "obabbbbabo",
    "obbbaabbbo",
    ".obbbbbbo.",
    "..oooooo..",
    "..........",
  ],
  heart: [
    "..........",
    ".oo....oo.",
    "obbo..obbo",
    "oblboobbbo",
    "obbbbbbbbo",
    ".obbbbbbo.",
    "..obbbbo..",
    "...obbo...",
    "....oo....",
    "..........",
  ],
  flag: [
    ".oo.......",
    ".obaooo...",
    ".obaaaao..",
    ".obaaaaao.",
    ".obaaaao..",
    ".obaooo...",
    ".obo......",
    ".obo......",
    ".obo......",
    ".oo.......",
  ],
  floppy: [
    "oooooooooo",
    "obbbbbbabo",
    "obwwwwbbbo",
    "obwwwwbbbo",
    "obbbbbbbbo",
    "obbwwwwbbo",
    "obbwppwbbo",
    "obbwppwbbo",
    "oooooooooo",
    "..........",
  ],
  scissors: [
    "oo......oo",
    "obo....obo",
    ".obo..obo.",
    "..oboobo..",
    "...obbo...",
    "...obbo...",
    "..oboobo..",
    ".obo..obo.",
    "oao....oao",
    "oo......oo",
  ],
  books: [
    "..........",
    "oooooooooo",
    "obbbabbbbo",
    "obbbabbbbo",
    "oooooooooo",
    "olllllallo",
    "olllllallo",
    "oooooooooo",
    "..........",
    "..........",
  ],
};

document.querySelectorAll(".card-icon[data-icon]").forEach((el) => {
  const map = ICONS[el.dataset.icon];
  if (map) renderPixels(el, map);
});

// ============ mood-ring color shift on scroll ============
const moodRing = document.getElementById("mood-ring");
if (moodRing && !reduceMotion.matches) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      moodRing.style.filter = `blur(46px) hue-rotate(${window.scrollY * 0.15}deg)`;
      ticking = false;
    });
  }, { passive: true });
}

// ============ emote-burst particles on primary CTA hover ============
const EMOTES = ["✨", "💜", "⭐", "🐾"];
let lastBurst = 0;

function burst(x, y) {
  if (reduceMotion.matches) return;
  const now = Date.now();
  if (now - lastBurst < 350) return; // don't spam
  lastBurst = now;
  for (let i = 0; i < 5; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.textContent = EMOTES[Math.floor(Math.random() * EMOTES.length)];
    p.setAttribute("aria-hidden", "true");
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    document.body.appendChild(p);
    const dx = (Math.random() - 0.5) * 120;
    const dy = -60 - Math.random() * 70;
    p.animate(
      [
        { transform: "translate(0, 0) scale(0.6)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 350, easing: "cubic-bezier(0.2, 0.6, 0.3, 1)" }
    ).onfinish = () => p.remove();
  }
}

document.querySelectorAll(".burst").forEach((btn) => {
  btn.addEventListener("mouseenter", () => {
    const r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top);
  });
});

// ============ scroll reveal ============
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

function scrollToWaitlist() {
  document.getElementById("waitlist").scrollIntoView({
    behavior: reduceMotion.matches ? "auto" : "smooth",
  });
}

// ============ demo placeholder (caption says it jumps to the waitlist) ============
const demoBtn = document.getElementById("demo-play");
if (demoBtn) demoBtn.addEventListener("click", scrollToWaitlist);

// ============ tier intent → waitlist form ============
// Tier CTAs carry data-interest; clicking one pre-fills the hidden field and
// swaps the waitlist note so the ask matches the button they pressed.
const INTEREST_NOTES = {
  free: "no spam. one email when it's your turn.",
  dfy: "asking about a done-for-you seat — we'll reply personally.",
  pro: "pro waitlist — one email when hosted mira opens up.",
};

document.querySelectorAll("[data-interest]").forEach((link) => {
  link.addEventListener("click", () => {
    const interest = link.dataset.interest;
    document.querySelectorAll(".waitlist-form input[name='interest']").forEach((input) => {
      input.value = interest;
    });
    const note = document.getElementById("form-note");
    if (note && INTEREST_NOTES[interest]) {
      note.textContent = INTEREST_NOTES[interest];
      note.className = "form-note reveal visible";
    }
  });
});

// ============ waitlist forms (hero + footer share one handler) ============
// Front-end only for now. LAUNCH BLOCKER: point WAITLIST_ENDPOINT at the real
// store (Resend audience or Supabase table, per the launch checklist) before
// any traffic — until then signups only persist in the visitor's localStorage.
const WAITLIST_ENDPOINT = "https://iocrdajipzkytfzuojiy.supabase.co/functions/v1/waitlist";
if (!WAITLIST_ENDPOINT) {
  console.warn("mira: WAITLIST_ENDPOINT not configured — signups are stored in the visitor's localStorage only.");
}

function wireForm(formId, noteId) {
  const form = document.getElementById(formId);
  const note = document.getElementById(noteId);
  if (!form || !note) return;
  const button = form.querySelector("button[type='submit']");
  let submitting = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    const email = form.email.value.trim();
    const interest = form.interest ? form.interest.value : "free";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.email.setAttribute("aria-invalid", "true");
      note.textContent = "that email looks a little cursed — try again?";
      note.className = "form-note error reveal visible";
      return;
    }
    form.email.removeAttribute("aria-invalid");

    submitting = true;
    if (button) button.disabled = true;
    try {
      if (WAITLIST_ENDPOINT) {
        const res = await fetch(WAITLIST_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, interest }),
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      } else {
        // dev fallback so signups aren't silently lost pre-backend;
        // guarded — storage can be blocked in strict privacy modes
        try {
          const saved = JSON.parse(localStorage.getItem("mira-waitlist") || "[]");
          if (!saved.some((entry) => entry.email === email)) {
            saved.push({ email, interest });
            localStorage.setItem("mira-waitlist", JSON.stringify(saved));
          }
        } catch (storageErr) {
          // storage unavailable — still show success; nothing else to do client-side
        }
      }

      form.reset();
      // success persists — no revert timer (visitors doubt a message that vanishes)
      note.textContent = "summoning… you're on the list. ✦";
      note.className = "form-note success reveal visible";
    } catch (err) {
      note.textContent = "something went wrong — please try again.";
      note.className = "form-note error reveal visible";
    } finally {
      submitting = false;
      if (button) button.disabled = false;
    }
  });
}

wireForm("hero-form", "hero-note");
wireForm("waitlist-form", "form-note");
