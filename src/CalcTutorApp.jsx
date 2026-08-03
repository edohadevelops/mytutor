import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Home, BookOpen, Timer, Layers, ChevronRight, ChevronLeft, ChevronDown,
  Check, X, Flame, Target, Clock, Calendar, Sparkles, ArrowRight,
  MessageCircleQuestion, Copy, CheckCircle2, Circle, PlayCircle,
  BookMarked, Info, Lightbulb, RotateCcw, Settings, Maximize2, Minimize2,
  Sun, Moon, FileText, Download, Type, ClipboardList, Library, Route,
  GraduationCap, ListChecks, MessageSquare, Send, Bell, BellOff, BellRing,
  Paperclip, UserCircle2, ClipboardCheck,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";

/* ============================================================
   DESIGN TOKENS
============================================================ */
const T = {
  bg: "var(--bg)",
  bgDeep: "var(--bg-deep)",
  surface: "var(--surface)",
  surface2: "var(--surface2)",
  chalk: "var(--text)",
  chalkDim: "var(--text-dim)",
  chalkFaint: "var(--border)",
  amber: "var(--primary)",
  amberDim: "var(--primary-dim)",
  coral: "var(--danger)",
  coralDim: "var(--danger-dim)",
  blue: "var(--info)",
  blueDim: "var(--info-dim)",
};

const LIGHT_VARS = {
  "--bg": "#f7f5ef",
  "--bg-deep": "#eef2ec",
  "--surface": "#ffffff",
  "--surface2": "#eef2ec",
  "--text": "#1c2a22",
  "--text-dim": "#5a6f62",
  "--border": "#dde3da",
  "--primary": "#2f6b4f",
  "--primary-dim": "rgba(47,107,79,0.12)",
  "--danger": "#b3503d",
  "--danger-dim": "rgba(179,80,61,0.12)",
  "--info": "#3d7a8a",
  "--info-dim": "rgba(61,122,138,0.12)",
  "--on-primary": "#f6fbf7",
};
const DARK_VARS = {
  "--bg": "#122019",
  "--bg-deep": "#0c1712",
  "--surface": "#1a2b22",
  "--surface2": "#22392c",
  "--text": "#eef3ee",
  "--text-dim": "#9fb5a6",
  "--border": "rgba(238,243,238,0.14)",
  "--primary": "#5fae82",
  "--primary-dim": "rgba(95,174,130,0.16)",
  "--danger": "#dd8a72",
  "--danger-dim": "rgba(221,138,114,0.16)",
  "--info": "#7fb8c9",
  "--info-dim": "rgba(127,184,201,0.16)",
  "--on-primary": "#0e1f16",
};

const STUDENT = "Noah";
const FINAL_DATE = "2026-08-18";

let katexPromise = null;
function loadKatex() {
  if (katexPromise) return katexPromise;
  katexPromise = new Promise((resolve) => {
    if (window.katex) return resolve(window.katex);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => resolve(window.katex);
    document.head.appendChild(script);
  });
  return katexPromise;
}
function PureMath({ tex, block, style }) {
  const ref = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadKatex().then((katex) => {
      if (cancelled || !ref.current || !katex) return;
      try {
        katex.render(tex, ref.current, { throwOnError: false, displayMode: !!block });
      } catch {
        ref.current.textContent = tex;
      }
    });
    return () => (cancelled = true);
  }, [tex, block]);
  return block ? (
    <div ref={ref} style={{ margin: "8px 0", overflowX: "auto", ...style }} />
  ) : (
    <span ref={ref} style={style} />
  );
}

/* Math_ handles two conventions used across this app's content:
   1. Pure LaTeX with no literal "$" characters (most Practice Bank
      problems) — rendered exactly as before, whole string to KaTeX.
   2. Prose sentences with inline $...$-delimited math (some worked
      examples) — split so only the math parts go to KaTeX and the
      English stays as plain text, instead of feeding the whole
      mixed string to KaTeX (which can't parse English and falls
      back to its red error-text rendering). */
function Math_({ tex, block, style }) {
  if (!tex) return null;
  if (!tex.includes("$")) {
    return <PureMath tex={tex} block={block} style={style} />;
  }
  const parts = tex.split(/(\$[^$]+\$)/g).filter((p) => p.length > 0);
  return (
    <div style={{ display: block ? "block" : "inline", margin: block ? "8px 0" : 0, lineHeight: 1.6, ...style }}>
      {parts.map((part, i) =>
        part.startsWith("$") && part.endsWith("$") && part.length > 2 ? (
          <PureMath key={i} tex={part.slice(1, -1)} block={false} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

const SUPABASE_URL = "https://shakvgfmpxnyimnhueqr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWt2Z2ZtcHhueWltbmh1ZXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTk2NzksImV4cCI6MjEwMDU5NTY3OX0.yDyMlmYvH17gjNYZozjFJ1MW63-DmUv5hv9vylRmOxM";
const SB_HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

// Real Supabase client (not just REST calls) — this is what gives us
// genuine websocket-based realtime for chat, instead of polling.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VAPID_PUBLIC_KEY = "BCUOgLY9qC1PH4JmsF2r6h9XBuQ6YDTsd6L9vs8iMwtgEycyUBw0TpN4BwUYFW8TU4IRL5YNuhitqeL8Tj2crRI";

/* ---------- Device role: "tutor" or "student" ----------
   No login system, so this is a per-device setting (which person is
   using this browser/computer) — safe to keep in localStorage since
   this now runs as a real deployed site, not inside the Claude
   artifact sandbox. Wrapped in try/catch so it degrades gracefully
   anywhere localStorage isn't available. */
function getStoredRole() {
  try {
    return localStorage.getItem("my-tutor-role");
  } catch {
    return null;
  }
}
function setStoredRole(role) {
  try {
    localStorage.setItem("my-tutor-role", role);
  } catch {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function enablePushNotifications(role) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications aren't supported in this browser.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ role, subscription: sub.toJSON(), updated_at: new Date().toISOString() }]),
  });
  return true;
}

async function sendPushToOther(recipientRole, title, body) {
  try {
    await fetch("/.netlify/functions/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientRole, title, body }),
    });
  } catch {
    // Fine if this fails (e.g. running locally without `netlify dev`,
    // or the function isn't deployed yet) — in-app + browser
    // notifications still work independently of this.
  }
}

const SESSIONS = [
  { id: 1, week: 1, title: "Quiz 1 Refresh", topics: ["1.7", "3.1", "3.2", "3.3", "3.4"], type: "review", quiz: "Quiz 1" },
  { id: 2, week: 1, title: "Improper Integrals & Sequences", topics: ["3.7", "5.1"], type: "new" },
  { id: 3, week: 1, title: "Infinite Series", topics: ["5.2"], type: "new", quiz: "Quiz 2" },
  { id: 4, week: 2, title: "Divergence & Integral Test", topics: ["5.3"], type: "new" },
  { id: 5, week: 2, title: "Comparison & Alternating Series", topics: ["5.4", "5.5"], type: "new" },
  { id: 6, week: 2, title: "Ratio & Root Tests", topics: ["5.6"], type: "new" },
  { id: 7, week: 3, title: "Power Series & Functions", topics: ["6.1"], type: "new", quiz: "Quiz 3" },
  { id: 8, week: 3, title: "Properties & Taylor Series", topics: ["6.2", "6.3"], type: "new" },
  { id: 9, week: 3, title: "Working with Taylor Series", topics: ["6.4"], type: "consolidate" },
  { id: 10, week: 4, title: "Parametric & Polar", topics: ["7.1", "7.2", "7.3"], type: "new", quiz: "Quiz 4" },
  { id: 11, week: 4, title: "Polar Area & Arc Length", topics: ["7.4"], type: "review" },
  { id: 12, week: 4, title: "Comprehensive Review", topics: ["3.7-7.4"], type: "final-review", quiz: "Final" },
];

const CATEGORIES = {
  Techniques: "Integration Techniques",
  Series: "Sequences & Series",
  Power: "Power Series",
  Parametric: "Parametric & Polar",
};

/* ============================================================
   FINAL EXAM MASTERY TRACKING
   Every practice problem sourced from the actual final exam
   (ids prefixed "fe", plus the two pre-existing problems that
   happened to already match the final exactly: "s8-differentiate"
   and "s11-cardioid") is tagged here by broad category. The
   Mastery Map is computed live from hwState against this list —
   it's a real "% of final exam questions solid" metric now,
   not a manual per-session increment.
============================================================ */
const FINAL_TAGS = {
  fe1a: "Techniques", fe1b: "Techniques", fe1c: "Techniques",
  fe2a: "Techniques", fe2b: "Techniques", fe2c: "Techniques",
  fe3a: "Techniques", fe3b: "Techniques",
  fe4a: "Techniques", fe4b: "Techniques",
  "fe-simpson": "Techniques", fe5b: "Techniques",
  fe6a: "Series", fe6b: "Series",
  fe7i: "Series", fe7ii: "Series",
  fe8i: "Series",
  fe8ii: "Series", fe9i: "Series", fe9ii: "Series",
  fe10i: "Series", fe10ii: "Series",
  fe11i: "Power", fe11ii: "Power", fe11iii: "Power",
  "s8-differentiate": "Power", fe12ii: "Power",
  fe13: "Power",
  fe14: "Parametric", fe16i: "Parametric",
  fe15: "Parametric", "s11-cardioid": "Parametric",
};

function computeFinalMastery(hwState) {
  const totals = {}, gots = {};
  Object.keys(CATEGORIES).forEach((k) => { totals[k] = 0; gots[k] = 0; });
  Object.entries(FINAL_TAGS).forEach(([id, cat]) => {
    totals[cat] += 1;
    if (hwState[id] === "got") gots[cat] += 1;
  });
  const out = {};
  Object.keys(CATEGORIES).forEach((k) => {
    out[k] = totals[k] ? Math.round((gots[k] / totals[k]) * 100) : 0;
  });
  return out;
}

// Overall "solid / still shaky / not yet touched" breakdown across every
// final-exam-tagged question — used for the coverage stat on the dashboard.
function computeFinalCoverage(hwState) {
  const ids = Object.keys(FINAL_TAGS);
  let solid = 0, shaky = 0;
  ids.forEach((id) => {
    if (hwState[id] === "got") solid += 1;
    else if (hwState[id] === "miss") shaky += 1;
  });
  const total = ids.length;
  return { solid, shaky, untouched: total - solid - shaky, total };
}

/* ============================================================
   FORMULA SHEET DATA
============================================================ */
const FORMULAS = [
  {
    id: "f1", cat: "Techniques", name: "Inverse Sine Integral",
    formula: "\\int \\frac{dx}{\\sqrt{a^2-x^2}} = \\sin^{-1}\\left(\\frac{x}{a}\\right) + C",
    why: "Used when the integrand has $\\sqrt{a^2-x^2}$ in the denominator with no extra $x$ factor to substitute away.",
    when: "Integrals with a plain square-root-of-difference-of-squares term, especially after completing the square.",
    example: "$\\displaystyle\\int \\frac{dx}{\\sqrt{9-x^2}}$, so $a=3$, giving $\\sin^{-1}\\left(\\frac{x}{3}\\right)+C$",
    yt: "invTrig",
  },
  {
    id: "f2", cat: "Techniques", name: "Inverse Secant Integral",
    formula: "\\int \\frac{dx}{x\\sqrt{x^2-a^2}} = \\frac{1}{a}\\sec^{-1}\\left(\\frac{|x|}{a}\\right) + C",
    why: "The $x$ outside the root combined with $x^2-a^2$ inside is the signature of this form — nothing else simplifies it as cleanly.",
    when: "Watch for domain restrictions: $x^2-a^2\\geq0$ means bounds touching $\\pm a$ often make the integral improper.",
    example: "$\\displaystyle\\int_2^4 \\frac{dx}{x\\sqrt{x^2-4}}$, so $a=2$: must be treated as improper at $x=2$, evaluates to $\\pi/6$",
    yt: "invTrigIntegrals",
  },
  {
    id: "f3", cat: "Techniques", name: "Reduction: sin^n x · cos x",
    formula: "\\int \\sin^n(x)\\cos(x)\\,dx = \\frac{\\sin^{n+1}(x)}{n+1} + C",
    why: "$\\cos(x)\\,dx$ is exactly $d(\\sin x)$ — a direct substitution, not really a 'trig identity' problem in disguise.",
    when: "Any odd power sits next to its own derivative — always check this before reaching for identities.",
    example: "$\\displaystyle\\int \\sin^2(x)\\cos(x)\\,dx$: let $u=\\sin x$, giving $\\dfrac{u^3}{3}+C = \\dfrac{\\sin^3(x)}{3}+C$",
  },
  {
    id: "f4", cat: "Techniques", name: "Triple Angle Identity",
    formula: "\\sin(3x) = 3\\sin(x) - 4\\sin^3(x)",
    why: "Converts a multiple-angle term into powers of $\\sin(x)/\\cos(x)$ so standard trig-integral substitution works.",
    when: "Any integral where a $2x$ or $3x$ appears inside a $\\sin/\\cos$ and everything else is in terms of plain $x$.",
    example: "$\\displaystyle\\int \\frac{\\sin(3x)}{1+\\cos^2x}\\,dx$ uses this identity before substituting $u=\\cos(x)$",
  },
  {
    id: "f5", cat: "Techniques", name: "Integration by Parts",
    formula: "\\int u\\,dv = uv - \\int v\\,du",
    why: "Breaks apart a product of two different function types (polynomial times exponential, etc.) that no single substitution handles.",
    when: "Use LIPET priority for choosing $u$: Log, Inverse trig, Polynomial, Exponential, Trig — earlier in the list = better choice for $u$.",
    example: "$\\displaystyle\\int x^2e^x\\,dx$: let $u=x^2,\\ dv=e^x dx$ — repeat IBP once more to fully reduce the polynomial power",
    yt: "ibp",
  },
  {
    id: "f6", cat: "Techniques", name: "Cyclic IBP (e·trig)",
    formula: "\\int e^x\\cos(x)\\,dx = \\frac{e^x}{2}(\\cos x + \\sin x) + C",
    why: "IBP on $e^x\\cdot\\text{trig}$ products returns the original integral after two passes — solve for it algebraically instead of integrating forever.",
    when: "Any $e^{ax}\\sin(bx)$ or $e^{ax}\\cos(bx)$ product.",
    example: "Do IBP twice, get \"$I=(\\text{something})-I$\" on the two sides, then solve for $I$",
    yt: "ibp",
  },
  {
    id: "f7", cat: "Techniques", name: "Partial Fractions — Repeated Linear",
    formula: "\\frac{N(x)}{(x-a)^2 D(x)} \\to \\frac{A}{x-a} + \\frac{B}{(x-a)^2} + \\cdots",
    why: "A repeated root needs one term per power, not just one — otherwise the decomposition can't match all the polynomial's degrees of freedom.",
    when: "Denominator has a factor raised to a power $\\geq2$.",
    example: "$\\dfrac{3x+1}{(x-2)^2} \\to \\dfrac{A}{x-2}+\\dfrac{B}{(x-2)^2}$",
    yt: "partialFractions",
  },
  {
    id: "f8", cat: "Techniques", name: "Partial Fractions — Repeated Irreducible Quadratic",
    formula: "\\frac{N(x)}{(x^2+b)^2 D(x)} \\to \\frac{Cx+D}{x^2+b} + \\frac{Ex+F}{(x^2+b)^2} + \\cdots",
    why: "An irreducible quadratic can't be split further, so it needs a linear numerator (not just a constant) at every power.",
    when: "Denominator has an unfactorable quadratic raised to a power $\\geq2$ — the hardest, most time-consuming case.",
    example: "$\\dfrac{x^2+1}{(x-1)^2(x^2+4)^2}$ needs all six unknowns solved simultaneously",
    yt: "partialFractions",
  },
  {
    id: "f9", cat: "Series", name: "Sequence Convergence",
    formula: "\\lim_{n\\to\\infty} a_n = L \\implies \\{a_n\\} \\text{ converges to } L",
    why: "This is the definition, not a test — it's the thing every other sequence technique is trying to compute.",
    when: "Any 'does this sequence converge' question starts here.",
    example: "$a_n=\\dfrac{2n+1}{n+3}$: divide by $n$, limit $=2$, so it converges to $2$",
    yt: "sequences",
  },
  {
    id: "f10", cat: "Series", name: "Divergence Test",
    formula: "\\text{If } \\lim_{n\\to\\infty} a_n \\neq 0, \\text{ then } \\sum a_n \\text{ diverges.}",
    why: "One-directional — it can only prove divergence. If the limit IS $0$, this test tells you nothing.",
    when: "Always check this first, before reaching for any other convergence test — it's the fastest elimination.",
    example: "$\\displaystyle\\sum \\frac{n}{n+1}$: terms $\\to1$, not $0$, so it diverges immediately, no other test needed",
    yt: "sequences",
  },
  {
    id: "f11", cat: "Series", name: "Integral Test",
    formula: "\\sum a_n \\text{ converges} \\iff \\int_1^{\\infty} f(x)\\,dx \\text{ converges } (f \\text{ positive, continuous, decreasing})",
    why: "Ties a series directly to an improper integral you may already know how to evaluate.",
    when: "Terms match a function you can actually integrate — this is why 3.7 (improper integrals) is a direct prerequisite.",
    example: "$\\displaystyle\\sum \\frac{1}{n^2} \\leftrightarrow \\int_1^{\\infty}\\frac{dx}{x^2}$ converges, so the series converges",
    yt: "integralTest",
  },
  {
    id: "f12", cat: "Series", name: "p-Series Test",
    formula: "\\sum \\frac{1}{n^p} \\text{ converges if } p>1, \\text{ diverges if } p\\leq1",
    why: "A ready-made comparison benchmark — most rational-function series get compared against a $p$-series.",
    when: "Use as the comparison target for Direct/Limit Comparison on any rational-function series.",
    example: "$\\displaystyle\\sum \\frac{1}{n^{1.5}}$: $p=1.5>1$, so it converges",
    yt: "integralTest",
  },
  {
    id: "f13", cat: "Series", name: "Alternating Series Test",
    formula: "\\text{If } b_n \\text{ decreasing and } \\lim b_n=0, \\text{ then } \\sum(-1)^n b_n \\text{ converges.}",
    why: "Both conditions are required — decreasing terms alone, or a zero limit alone, isn't enough.",
    when: "Series with $(-1)^n$ or $(-1)^{n+1}$ explicitly present.",
    example: "$\\displaystyle\\sum \\frac{(-1)^n}{n}$: $b_n=1/n$ is decreasing with limit $0$, so it converges (conditionally)",
    yt: "alternating",
  },
  {
    id: "f14", cat: "Series", name: "Ratio Test",
    formula: "L=\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|:\\ L<1 \\text{ converges},\\ L>1 \\text{ diverges},\\ L=1 \\text{ inconclusive}",
    why: "Excellent whenever factorials or exponentials are present — they collapse nicely under the ratio.",
    when: "Factorials, $a^n$ terms, or products that telescope when divided.",
    example: "$\\displaystyle\\sum \\frac{n^n}{n!}$: ratio $\\to e$ as $n\\to\\infty$, so it diverges ($L=e>1$)",
    yt: "ratioRoot",
  },
  {
    id: "f15", cat: "Series", name: "Root Test",
    formula: "L=\\lim \\sqrt[n]{|a_n|}: \\text{ same } L \\text{ rules as the Ratio Test}",
    why: "When the whole term is raised to the $n$th power, taking the $n$th root undoes it directly.",
    when: "Terms of the form (something)$^n$, especially with no factorials in sight.",
    example: "$\\displaystyle\\sum \\left(\\frac{n}{2n+1}\\right)^n$: $n$th root gives $\\dfrac{n}{2n+1}\\to\\dfrac12<1$, converges",
    yt: "ratioRoot",
  },
  {
    id: "f16", cat: "Power", name: "Radius of Convergence",
    formula: "\\text{Apply the Ratio Test to the general term} \\to \\text{solve } |x-c|<R",
    why: "Turns a power series question into a single limit inequality that pins down exactly where it converges.",
    when: "Any 'find where this power series converges' question — always the first step.",
    example: "$\\displaystyle\\sum \\frac{x^n}{n!}$: ratio $\\to 0$ for all $x$, so $R=\\infty$ (converges everywhere)",
    yt: "powerSeries",
  },
  {
    id: "f17", cat: "Power", name: "Endpoint Check",
    formula: "\\text{Test } x=c-R \\text{ and } x=c+R \\text{ separately}",
    why: "The Ratio Test is inconclusive exactly at the boundary — those two points need their own convergence test.",
    when: "Always required immediately after finding a finite radius of convergence.",
    example: "$R=1$ centered at $0$: test $x=-1$ and $x=1$ individually with Alternating/Comparison tests",
    yt: "powerSeries",
  },
  {
    id: "f18", cat: "Power", name: "Maclaurin: e^x",
    formula: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}",
    why: "The most-reused series in the whole unit — substitution into it generates dozens of other series.",
    when: "Any function built from $e^x$, $e^{-x^2}$, etc.",
    example: "$e^{-x^2} = \\displaystyle\\sum \\frac{(-1)^n x^{2n}}{n!}$ — direct substitution, no new derivation needed",
    yt: "powerSeries",
  },
  {
    id: "f19", cat: "Power", name: "Maclaurin: sin(x)",
    formula: "\\sin(x) = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n+1}}{(2n+1)!}",
    why: "Memorize this and $\\cos(x)$'s series together — they're derivatives/antiderivatives of each other.",
    when: "Trig functions inside a Taylor series problem, or approximating $\\sin/\\cos$ near $0$.",
    example: "$\\dfrac{\\sin x}{x} \\to \\displaystyle\\sum \\frac{(-1)^n x^{2n}}{(2n+1)!}$, evaluated at $x=0$ gives limit $1$",
    yt: "powerSeries",
  },
  {
    id: "f20", cat: "Power", name: "Geometric Series Substitution",
    formula: "\\frac{1}{1-u} = \\sum_{n=0}^{\\infty} u^n \\quad \\to \\quad \\text{substitute } u=(\\text{expression})",
    why: "Fastest possible path to a new series — no differentiating or integrating required, just substitution.",
    when: "Whenever the function looks like $\\dfrac{1}{1\\pm(\\text{something})}$.",
    example: "$\\dfrac{1}{1+x^2}$: substitute $u=-x^2$, giving $\\displaystyle\\sum(-1)^n x^{2n}$",
    yt: "powerSeries",
  },
  {
    id: "f21", cat: "Parametric", name: "Parametric Slope",
    formula: "\\frac{dy}{dx} = \\frac{dy/dt}{dx/dt}",
    why: "You can't solve for $y$ in terms of $x$ directly, so the chain rule gives you the slope through the shared parameter $t$.",
    when: "Any tangent-line or concavity question on a parametric curve.",
    example: "$x=t^2,\\ y=t^3$: $\\dfrac{dy}{dx} = \\dfrac{3t^2}{2t} = \\dfrac{3t}{2}$",
  },
  {
    id: "f22", cat: "Parametric", name: "Parametric Arc Length",
    formula: "L = \\int \\sqrt{\\left(\\frac{dx}{dt}\\right)^2 + \\left(\\frac{dy}{dt}\\right)^2}\\,dt",
    why: "Pythagorean theorem applied to an infinitesimal piece of the curve, integrated over the whole parameter interval.",
    when: "Any 'find the length of this curve' question where $x$ and $y$ are both functions of $t$.",
    example: "Circle $x=\\cos t,\\ y=\\sin t,\\ t\\in[0,2\\pi]$: integrand simplifies to $1$, so $L=2\\pi$",
  },
  {
    id: "f23", cat: "Parametric", name: "Polar Area",
    formula: "A = \\frac{1}{2}\\int r^2\\,d\\theta",
    why: "Comes from summing infinitesimal circular sectors, not rectangles — that's why there's no $dx/dy$ in sight.",
    when: "Area enclosed by a polar curve $r=f(\\theta)$.",
    example: "$r=2$ (a circle): $A=\\dfrac12\\displaystyle\\int_0^{2\\pi}4\\,d\\theta = 4\\pi$ (matches $\\pi r^2=4\\pi$)",
    yt: "polarArea",
  },
  {
    id: "f24", cat: "Parametric", name: "Polar–Cartesian Conversion",
    formula: "x=r\\cos(\\theta), \\quad y=r\\sin(\\theta), \\quad r^2=x^2+y^2",
    why: "The bridge between the two coordinate systems — needed whenever a problem mixes polar and Cartesian language.",
    when: "Converting equations, or finding intersection points between a polar and Cartesian curve.",
    example: "$r=2\\cos\\theta$: multiply by $r$ to get $x^2+y^2=2x$ — a circle in Cartesian form",
    yt: "polarCoords",
  },
];

const FLASHCARDS_BASE = [
  { id: "fc1", cat: "Techniques", front: "You see $\\int \\dfrac{x}{\\sqrt{1-x^2}}\\,dx$. Fastest method — inverse trig formula or u-sub?", back: "u-sub, $u=1-x^2$. The $x\\,dx$ already matches $du$." },
  { id: "fc2", cat: "Techniques", front: "General form for $\\displaystyle\\int \\frac{dx}{x\\sqrt{x^2-a^2}}$?", back: "$\\dfrac{1}{a}\\sec^{-1}\\!\\left(\\dfrac{|x|}{a}\\right)+C$" },
  { id: "fc3", cat: "Techniques", front: "A definite integral's bounds include a point where the integrand is undefined. What first?", back: "Rewrite as a limit (improper integral) approaching that bound." },
  { id: "fc4", cat: "Techniques", front: "LIPET priority order for choosing $u$ in Integration by Parts?", back: "Log, Inverse trig, Polynomial, Exponential, Trig — earlier wins." },
  { id: "fc5", cat: "Techniques", front: "$\\displaystyle\\int e^x\\cos(x)\\,dx = \\ ?$", back: "$\\dfrac{e^x}{2}(\\cos x+\\sin x)+C$ — a cyclic integral, solve algebraically." },
  { id: "fc6", cat: "Series", front: "The Divergence Test — what does it actually prove?", back: "Only divergence. If $\\lim a_n\\neq0$, diverges. If $\\lim a_n=0$, inconclusive." },
  { id: "fc7", cat: "Series", front: "$p$-series $\\displaystyle\\sum \\frac{1}{n^p}$ converges when?", back: "$p>1$." },
  { id: "fc8", cat: "Series", front: "When do you reach for the Root Test over the Ratio Test?", back: "Terms raised to the $n$th power, especially with no factorials." },
  { id: "fc9", cat: "Series", front: "Alternating Series Test — what two conditions are required?", back: "$b_n$ decreasing, and $\\lim b_n=0$. Both required." },
  { id: "fc10", cat: "Series", front: "Alternating series remainder bound: $|R_N| \\leq\\ ?$", back: "$b_{N+1}$ — the size of the very next unused term." },
  { id: "fc11", cat: "Series", front: "A geometric series $\\displaystyle\\sum ar^{n}$ converges when?", back: "$|r|<1$, and sums to $\\dfrac{a}{1-r}$." },
  { id: "fc12", cat: "Power", front: "Maclaurin series for $e^x$?", back: "$\\displaystyle\\sum_{n=0}^{\\infty}\\frac{x^n}{n!}$" },
  { id: "fc13", cat: "Power", front: "Maclaurin series for $\\cos(x)$?", back: "$\\displaystyle\\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n}}{(2n)!}$" },
  { id: "fc14", cat: "Power", front: "Maclaurin series for $\\dfrac{1}{1-x}$?", back: "$\\displaystyle\\sum_{n=0}^{\\infty} x^n$, for $|x|<1$." },
  { id: "fc15", cat: "Power", front: "How do you find the radius of convergence of a power series?", back: "Apply the Ratio Test to the general term, then solve the resulting $|x-c|<R$ inequality." },
  { id: "fc16", cat: "Power", front: "At the two endpoints $x=c\\pm R$, the Ratio Test is always...?", back: "Inconclusive ($L=1$) — check each endpoint individually with a different test." },
  { id: "fc17", cat: "Parametric", front: "Parametric slope $dy/dx = \\ ?$", back: "$\\dfrac{dy/dt}{dx/dt}$" },
  { id: "fc18", cat: "Parametric", front: "Arc length formula for a parametric curve?", back: "$\\displaystyle\\int\\sqrt{\\left(\\frac{dx}{dt}\\right)^2+\\left(\\frac{dy}{dt}\\right)^2}\\,dt$" },
  { id: "fc19", cat: "Parametric", front: "Polar-to-Cartesian conversion?", back: "$x=r\\cos\\theta,\\ y=r\\sin\\theta,\\ r^2=x^2+y^2$" },
  { id: "fc20", cat: "Parametric", front: "Polar area formula?", back: "$A=\\dfrac12\\displaystyle\\int r^2\\,d\\theta$ — built from circular sectors, not rectangles." },
];

/* ============================================================
   SESSION CONCEPTS — per-session teaching content, grounded in
   the actual course textbook (OpenStax Calculus Volume 2).
   Explanations are written fresh in my own words from reading
   the relevant sections, not copied from the book. Sessions
   without an entry here fall back to a "not built yet" state
   in SessionFlow — that's an honest gap, not a bug, and gets
   filled in the same verified way as everything else.
============================================================ */
const SESSION_CONCEPTS = {
  1: [
    {
      title: "Review: 1.7, 3.1-3.4",
      body: "The final's own Problems 1-4 (worth 60 of roughly 208 points) draw entirely from this review set, so it earns real weight even though it's 'old' material: trig substitution (a square root of a sum or difference of squares screams x=a tan(theta), a sec(theta), or a sin(theta)), trig integrals (odd powers of sine/cosine peel off one factor for a direct u-sub; even-even or the harder odd-tangent-with-secant cases need the reduction formulas), integration by parts (LIPET priority, plus the cyclic e^x times sin/cos trick where you solve algebraically instead of integrating forever), and partial fractions (distinct linear factors are quick with cover-up; repeated linear factors and irreducible quadratics need full coefficient matching). The thread connecting all four: recognize the PATTERN before picking a technique.",
      formulaIds: ["f1", "f2", "f5", "f7", "f8"],
      keyIdea: "This isn't a throwaway warm-up — nearly a third of the final's points sit right here. Every problem is a pattern-recognition exercise dressed up as an integral; once you've picked the right tool, the mechanics are usually the easy part.",
      yt: "trigSub",
    },
  ],
  2: [
    {
      title: "3.7 - Improper Integrals",
      body: "An integral is 'improper' in exactly two situations: either one of the bounds is infinite, or the function itself is undefined (blows up to infinity) somewhere on the interval, including at an endpoint. Neither case can be evaluated directly with the Fundamental Theorem of Calculus — instead, you rewrite the integral as a LIMIT of a proper integral, then evaluate that limit. If the limit exists (comes out to a finite number), the improper integral converges. If it doesn't, it diverges. When both bounds are infinite, or when a bad point sits in the middle of the interval, split it into two separate improper integrals at a convenient point — the whole thing only converges if both pieces do.",
      formulaIds: [],
      keyIdea: "Before you integrate anything, scan the WHOLE interval — both bounds and everywhere in between — for infinity or for a value that makes the function undefined. That scan is what tells you it's improper in the first place, and it's the step people skip.",
      yt: "improper",
    },
    {
      title: "5.1 - Sequences",
      body: "A sequence is just an ordered list of numbers, a_n, indexed by n = 1, 2, 3, .... The entire question this section asks is: as n gets huge, does a_n settle down toward one specific number, or not? If it does, the sequence converges to that limit. If it doesn't - either it grows without bound, or it oscillates forever - the sequence diverges.",
      formulaIds: ["f9"],
      keyIdea: "Every technique in this section is really just 'how do I compute the limit as n approaches infinity of a_n' using tools you already know from Calc 1 - you're not learning new limit rules, you're learning when to apply the old ones.",
      yt: "sequences",
    },
  ],
  3: [
    {
      title: "5.2 - Infinite Series",
      body: "An infinite series is what you get from adding up all the terms of a sequence, forever. Since you can't literally add infinitely many numbers, the definition works through partial sums: S_n is the sum of just the first n terms. That gives you a brand-new sequence, {S_n} — and the whole question of whether the SERIES converges collapses into a question you already know how to answer: does the SEQUENCE of partial sums converge? If {S_n} approaches a finite limit L, the series converges to L. If not, it diverges. Two named families make this concrete: a geometric series (each term is the last one times a constant ratio r) converges exactly when |r| < 1, and sums to a_1/(1-r). A telescoping series is built so that consecutive terms cancel out when you write the partial sum, leaving only a few terms at the start and end — so its convergence is just whatever's left over in the limit.",
      formulaIds: [],
      keyIdea: "A series is nothing more than the limit of its own partial sums. If you can find a clean closed-form expression for S_n — which geometric and telescoping series both let you do — convergence becomes an ordinary sequence-limit problem, no new machinery required.",
      yt: "sequences",
    },
  ],
};

// Backward-compatible alias for the pre-refactor single-session shape.
const SESSION2_CONTENT = {
  recap: "Last time you refreshed 1.7, 3.1, and 3.2 - the core integration techniques (inverse trig setups, basic trig integrals, and integration by parts). That foundation is what makes today's material click.",
  previewGoals: [
    "Understand what makes an integral 'improper,' and rewrite it as a limit correctly",
    "Understand what it means for a sequence to converge vs. diverge",
    "Evaluate sequence limits using algebraic manipulation, L'Hopital's Rule, and the Squeeze Theorem",
    "Classify sequences as bounded, monotone, or neither",
  ],
  concepts: SESSION_CONCEPTS[2],
};

const SESSION_PREVIEW_GOALS = {
  1: [
    "Re-solidify inverse trig integral setups from 1.7",
    "Re-solidify basic trig integral techniques from 3.1",
    "Re-solidify integration by parts and the LIPET priority order from 3.2",
  ],
  2: SESSION2_CONTENT.previewGoals,
  3: [
    "Understand what a partial sum is and how it defines series convergence",
    "Evaluate geometric series and know exactly when they converge",
    "Evaluate telescoping series by tracking which terms survive the cancellation",
    "See why the harmonic series is the classic example of terms going to zero without the series converging",
  ],
};

const SESSION_RECAPS = {
  1: "This is your first official session — today's a refresher on the three integration techniques from 1.7, 3.1, and 3.2 before Quiz 1.",
  2: SESSION2_CONTENT.recap,
  3: "Last time you covered improper integrals (3.7) and sequences (5.1) — today's material builds directly on sequences, since a series is fundamentally just the limit of a sequence of partial sums.",
};

// Session 3 practice = the final's Problem 7 (both telescoping series).
const HW_5_2 = [
  { id: "fe7i", tex: "\\sum_{n=1}^{\\infty} \\frac{2}{n(n+2)}", answer: "\\dfrac32", steps: [
    { tex: "Partial fractions: $\\dfrac{2}{n(n+2)} = \\dfrac1n-\\dfrac1{n+2}$ (check: common denominator gives $\\dfrac{(n+2)-n}{n(n+2)}=\\dfrac{2}{n(n+2)}$, confirmed).", why: "General rule: a series term with two linear factors in the denominator is almost always a disguised telescoping series — decompose with partial fractions first." },
    { tex: "Write out the partial sum: $S_N=\\displaystyle\\sum_{n=1}^N\\left(\\dfrac1n-\\dfrac1{n+2}\\right) = \\left(1-\\dfrac13\\right)+\\left(\\dfrac12-\\dfrac14\\right)+\\left(\\dfrac13-\\dfrac15\\right)+\\cdots+\\left(\\dfrac1N-\\dfrac1{N+2}\\right)$.", why: "General rule: because the gap here is 2 (not 1), TWO leading terms survive at the start and two trailing terms survive at the end — write out several terms explicitly to see which actually cancel." },
    { tex: "After cancellation: $S_N = 1+\\dfrac12-\\dfrac1{N+1}-\\dfrac1{N+2}$.", why: "" },
    { tex: "$\\displaystyle\\lim_{N\\to\\infty} S_N = 1+\\dfrac12-0-0=\\dfrac32$, so the series converges to $\\dfrac32$.", why: "" },
  ]},
  { id: "fe7ii", tex: "\\sum_{n=1}^{\\infty} \\ln\\!\\left(\\frac{n(n+2)}{(n+1)^2}\\right)", answer: "-\\ln2", steps: [
    { tex: "Split the log: $\\ln\\!\\left(\\dfrac{n(n+2)}{(n+1)^2}\\right) = \\ln n+\\ln(n+2)-2\\ln(n+1)$.", why: "General rule: whenever a series term is a log of a ratio/product, split it with log laws first — it usually reveals a hidden telescoping structure." },
    { tex: "Regroup as a difference of consecutive terms: $[\\ln n-\\ln(n+1)] - [\\ln(n+1)-\\ln(n+2)]$. Let $a_n=\\ln n-\\ln(n+1)=\\ln\\!\\left(\\dfrac{n}{n+1}\\right)$; the term is $a_n-a_{n+1}$.", why: "General rule: any expression of the form $f(n)-2f(n+1)+f(n+2)$ is secretly $[f(n)-f(n+1)]-[f(n+1)-f(n+2)]$ — a telescoping difference of differences." },
    { tex: "The $N$th partial sum telescopes: $S_N=\\displaystyle\\sum_{n=1}^N(a_n-a_{n+1}) = a_1-a_{N+1} = \\ln\\!\\left(\\dfrac12\\right) - \\ln\\!\\left(\\dfrac{N+1}{N+2}\\right)$.", why: "" },
    { tex: "As $N\\to\\infty$, $\\dfrac{N+1}{N+2}\\to1$ so $\\ln(\\cdots)\\to0$, leaving $S_N\\to\\ln\\!\\left(\\dfrac12\\right) = -\\ln2$.", why: "" },
  ]},
];

const REFRESHER_QUIZ_5_2 = [
  { q: "A series converges exactly when its sequence of partial sums:", options: ["Is always positive", "Converges to a finite number", "Is decreasing", "Has infinitely many terms"], answer: 1 },
  { q: "A geometric series with ratio r converges when:", options: ["r > 1", "r is any real number", "|r| < 1", "r = 0 only"], answer: 2 },
  { q: "In a telescoping series, what happens to most of the middle terms?", options: ["They double", "They cancel out", "They diverge", "They become negative"], answer: 1 },
  { q: "True or false: the harmonic series (sum of 1/n) converges because 1/n approaches 0.", options: ["True", "False"], answer: 1 },
];

// Session 2 practice = the final's Problem 5 (Simpson's Rule + an improper
// integral) — Simpson's Rule doesn't map to any other session, so it lives
// here next to improper integrals per the tutor's call.
const HW_3_7 = [
  { id: "fe-simpson", tex: "\\text{Use Simpson's Rule with } n=4 \\text{ to approximate } \\int_0^2 e^{-x^2}\\,dx. \\text{ Round to three decimal places.}", answer: "\\approx 0.882", steps: [
    { tex: "With $n=4$ subintervals on $[0,2]$, the width is $h=\\dfrac{2-0}{4}=0.5$, giving nodes $x_0=0,\\ x_1=0.5,\\ x_2=1,\\ x_3=1.5,\\ x_4=2$.", why: "General rule: Simpson's Rule always needs an EVEN number of subintervals — $n=4$ gives the alternating coefficient pattern 1, 4, 2, 4, 1." },
    { tex: "Evaluate $f(x)=e^{-x^2}$ at each node: $f(0)=1$, $f(0.5)\\approx0.7788$, $f(1)\\approx0.3679$, $f(1.5)\\approx0.1054$, $f(2)\\approx0.0183$.", why: "" },
    { tex: "Simpson's Rule: $\\displaystyle\\int_0^2 f(x)\\,dx \\approx \\dfrac{h}{3}\\left[f_0+4f_1+2f_2+4f_3+f_4\\right]$.", why: "General rule: memorize the coefficient pattern $1,4,2,4,\\ldots,4,1$ — endpoints always get weight 1, and it alternates 4, 2 in between." },
    { tex: "$= \\dfrac{0.5}{3}\\left[1+4(0.7788)+2(0.3679)+4(0.1054)+0.0183\\right] = \\dfrac{0.5}{3}(5.2909) \\approx 0.882$", why: "" },
  ]},
  { id: "fe5b", tex: "\\int_1^{\\infty} \\frac{\\ln(x)}{x^2}\\,dx", answer: "\\text{Converges to } 1", yt: "improper", steps: [
    { tex: "Rewrite as a limit: $\\displaystyle\\int_1^{\\infty}\\dfrac{\\ln x}{x^2}\\,dx = \\lim_{t\\to\\infty}\\int_1^t \\dfrac{\\ln x}{x^2}\\,dx$.", why: "General rule: an infinite upper bound is always converted to a limit before doing anything else." },
    { tex: "IBP with $u=\\ln x$, $dv=x^{-2}dx$: $du=\\dfrac{dx}{x}$, $v=-\\dfrac1x$. So $\\displaystyle\\int\\dfrac{\\ln x}{x^2}dx = -\\dfrac{\\ln x}{x}+\\int\\dfrac{dx}{x^2} = -\\dfrac{\\ln x+1}{x}+C$.", why: "" },
    { tex: "Evaluate: $\\left[-\\dfrac{\\ln x+1}{x}\\right]_1^t = -\\dfrac{\\ln t+1}{t}-\\left(-(0+1)\\right) = 1-\\dfrac{\\ln t+1}{t}$.", why: "" },
    { tex: "As $t\\to\\infty$, $\\dfrac{\\ln t}{t}\\to0$ (log always loses to a linear power), so the limit is $1-0=1$ — the integral converges to $1$.", why: "General rule: memorize that $\\ln t$ grows slower than ANY positive power of $t$ — this resolves the limit instantly without needing L'Hopital." },
  ]},
];

// Session 2 practice (part 2) = the final's Problem 6 (sequence limits).
const HW_5_1 = [
  { id: "fe6a", tex: "\\lim_{n\\to\\infty} n\\sin\\!\\left(\\frac1n\\right)", answer: "1", steps: [
    { tex: "Rewrite as $\\dfrac{\\sin(1/n)}{1/n}$, exactly the form $\\dfrac{\\sin\\theta}{\\theta}$ with $\\theta=1/n\\to0$.", why: "General rule: whenever $n$ is multiplied against something involving $1/n$ inside a trig function, rewrite it as a fraction to expose a known limit form." },
    { tex: "$\\displaystyle\\lim_{\\theta\\to0}\\dfrac{\\sin\\theta}{\\theta}=1$ is a standard limit (provable by L'Hopital or the Squeeze Theorem).", why: "" },
    { tex: "So $\\displaystyle\\lim_{n\\to\\infty} n\\sin(1/n) = 1$.", why: "" },
  ]},
  { id: "fe6b", tex: "\\lim_{n\\to\\infty}\\left(\\frac{2n+1}{2n+5}\\right)^n", answer: "e^{-2}", steps: [
    { tex: "This is a $1^\\infty$ indeterminate form — rewrite as an exponential: $\\left(\\dfrac{2n+1}{2n+5}\\right)^n = e^{n\\ln\\left(\\frac{2n+1}{2n+5}\\right)}$.", why: "General rule: any limit of the form (something$\\to1$)$^{(\\text{something}\\to\\infty)}$ should be rewritten as $e^{\\text{exponent}\\cdot\\ln(\\text{base})}$ before taking the limit of the exponent alone." },
    { tex: "Rewrite the base: $\\dfrac{2n+1}{2n+5} = 1-\\dfrac{4}{2n+5}$.", why: "" },
    { tex: "For large $n$, $\\ln\\!\\left(1-\\dfrac{4}{2n+5}\\right)\\approx-\\dfrac{4}{2n+5}$ (using $\\ln(1+u)\\approx u$ for small $u$), so $n\\ln(\\cdots)\\approx-\\dfrac{4n}{2n+5}\\to-2$ as $n\\to\\infty$.", why: "General rule: for $1^\\infty$ forms like this, the exponent's limit reduces to a ratio of the leading coefficients — here that shortcut gives $-4n/2n=-2$ directly." },
    { tex: "So the exponent $\\to-2$, and the original limit is $e^{-2}=\\dfrac{1}{e^2}$.", why: "" },
  ]},
];

const REFRESHER_QUIZ_5_1 = [
  { q: "If the limit as n approaches infinity of a_n does not exist as a finite number, the sequence is:", options: ["Convergent", "Divergent", "Monotone", "Bounded"], answer: 1 },
  { q: "A sequence that is bounded AND monotone is guaranteed to:", options: ["Diverge", "Be geometric", "Converge", "Oscillate"], answer: 2 },
  { q: "L'Hopital's Rule can be applied directly to a sequence a_n without any rewriting.", options: ["True", "False"], answer: 1 },
  { q: "The Squeeze Theorem is most useful when a sequence contains:", options: ["A factorial", "An oscillating term like sin(n) or (-1)^n", "A logarithm", "A repeated linear factor"], answer: 1 },
];

/* ============================================================
   SESSIONS 4-12 - concept content, worked examples, homework,
   and refresher quizzes for the rest of the course. Standard,
   well-established Calc 2 material (comparison/alternating/
   ratio/root tests, power series, Taylor series, parametric &
   polar calculus) verified against the course textbook
   (OpenStax Calculus Volume 2) for terminology and theorem
   statements, with every worked step computed by hand, not
   copied from anywhere.
============================================================ */
Object.assign(SESSION_CONCEPTS, {
  4: [{
    title: "5.3 - The Divergence and Integral Tests",
    body: "Two fast tools for series you can't easily sum directly. The Divergence Test is a quick elimination check: if the terms a_n don't approach 0, the series has no chance of converging - stop right there. But if the terms DO approach 0, that test tells you nothing; the harmonic series is the classic proof that 'terms shrink to zero' is not enough. The Integral Test goes further: if a_n = f(n) for some positive, continuous, decreasing function f, then the series and the improper integral of f rise or fall together - both converge, or both diverge. This is why 3.7 (improper integrals) was worth mastering first.",
    formulaIds: ["f10", "f11", "f12"],
    keyIdea: "Always try the Divergence Test first - it's one line of arithmetic and it eliminates a lot of series instantly. Only reach for the Integral Test (which requires actually integrating something) once the Divergence Test comes back inconclusive.",
    yt: "integralTest",
  }],
  5: [{
    title: "5.4 - Comparison Tests, 5.5 - Alternating Series",
    body: "When a series looks like a p-series or geometric series but isn't quite one, comparison tests let you borrow the answer. Direct Comparison: if your series' terms are always smaller than a known convergent series' terms, yours converges too; if always bigger than a known divergent series, yours diverges too. Limit Comparison sidesteps needing a clean inequality - just check that the RATIO of your terms to a known series' terms settles on a finite, positive number, and the two series share the same fate. Separately, alternating series (terms flipping sign every time) get their own test: if the terms shrink steadily to 0, the series converges - and remarkably, you can bound exactly how far off a partial sum is: the error is never more than the size of the next unused term.",
    formulaIds: ["f12", "f13"],
    keyIdea: "Comparison tests only work if you can name a simpler benchmark series first - almost always a p-series or geometric series. Spend a few seconds identifying what your series 'looks like' for large n before picking a benchmark.",
    yt: "integralTest",
  }],
  6: [{
    title: "5.6 - Ratio and Root Tests",
    body: "These two tests handle series that comparison and integral tests struggle with - especially anything with factorials or terms raised to the nth power. The Ratio Test looks at the limit of consecutive-term ratios |a_(n+1)/a_n|; factorials collapse beautifully here since (n+1)!/n! = n+1. The Root Test takes the nth root of |a_n| instead, which is the natural move when the whole term is already something raised to the nth power. Both share the same verdict rule: limit less than 1 means converges, greater than 1 means diverges, and exactly 1 means the test simply can't tell you - go find a different tool.",
    formulaIds: ["f14", "f15"],
    keyIdea: "Factorial in the term -> reach for the Ratio Test. Whole term raised to the nth power, no factorial -> reach for the Root Test. And if either test returns exactly 1, that's not a wrong answer - it's a signal to switch tools entirely.",
    yt: "ratioRoot",
  }],
  7: [{
    title: "6.1 - Power Series and Functions",
    body: "A power series is an 'infinite polynomial' in x, of the form the sum of c_n(x-a)^n. Unlike a normal series, whether it converges depends on WHICH x you plug in - for some x values it converges, for others it diverges. The Ratio Test applied to the general term almost always answers this: it produces an inequality like |x-a| < R, where R is the radius of convergence. That gives you an open interval centered at a - but the two endpoints (x = a-R and x = a+R) are exactly where the Ratio Test goes silent (gives you 1), so each endpoint has to be checked individually with a different test.",
    formulaIds: ["f16", "f17"],
    keyIdea: "Finding the interval of convergence is always a two-step process: (1) Ratio Test to find the radius R, giving you an open interval, then (2) plug each endpoint back into the ORIGINAL series and test it on its own - never assume both endpoints behave the same way.",
    yt: "powerSeries",
  }],
  8: [{
    title: "6.2 - Properties of Power Series, 6.3 - Taylor and Maclaurin Series",
    body: "Inside its interval of convergence, a power series behaves like a very well-behaved function - you can differentiate or integrate it term by term, and the result is still a power series with the same radius of convergence. That fact turns one known series into an entire family of new ones. Separately, a Taylor series is how you build a power series FOR a specific function: the coefficient of (x-a)^n is f^(n)(a)/n!, the nth derivative at the center divided by n factorial. A Maclaurin series is just the special case centered at a=0. A handful of Maclaurin series (e^x, sin x, cos x, 1/(1-x)) are worth memorizing outright, since substitution into them is almost always faster than computing derivatives from scratch.",
    formulaIds: ["f18", "f19", "f20"],
    keyIdea: "Before grinding through derivative after derivative, check whether your function is a disguised version of e^x, sin x, cos x, or 1/(1-x) - substitution, multiplication, differentiation, or integration applied to a KNOWN series is almost always faster and less error-prone than building a Taylor series from the definition.",
    yt: "powerSeries",
  }],
  9: [{
    title: "6.4 - Working with Taylor Series",
    body: "This section is about what Taylor series are actually FOR: approximating hard-to-compute values, evaluating limits that would otherwise need L'Hopital's Rule (sometimes repeatedly), and estimating integrals of functions with no elementary antiderivative - by integrating the series term by term instead. The Lagrange error bound tells you precisely how good a Taylor polynomial approximation is: the error is controlled by the size of the next derivative, evaluated somewhere in the interval.",
    formulaIds: [],
    keyIdea: "A Taylor series turns a hard problem (an integral with no closed form, a stubborn 0/0 limit) into an easy one (integrating or evaluating a polynomial) - the trade-off is you get an approximation, or an exact answer only if you can identify the resulting series as a known sum.",
    yt: "powerSeries",
  }],
  10: [{
    title: "7.1-7.3 - Parametric Equations and Polar Coordinates",
    body: "A parametric curve describes x and y each as separate functions of a third variable t, which lets you trace curves that aren't functions of x at all (like a full circle). Since you can't solve for y directly in terms of x, the slope comes from the chain rule instead: dy/dx equals (dy/dt) divided by (dx/dt). Arc length follows the same Pythagorean logic as always, just built from the two separate rates dx/dt and dy/dt. Polar coordinates describe a point by a distance r from the origin and an angle theta instead of (x,y) - the conversion x = r cos(theta), y = r sin(theta) is the bridge between the two systems whenever a problem mixes them.",
    formulaIds: ["f21", "f22", "f24"],
    keyIdea: "Every parametric or polar calculus formula is a repackaging of something you already know from rectangular coordinates (slope, arc length) - the new part is purely mechanical: compute dx/dt and dy/dt (or convert to x,y) first, then everything else follows the familiar pattern.",
  }],
  11: [{
    title: "7.4 - Area and Arc Length in Polar Coordinates",
    body: "Area in polar coordinates isn't built from rectangles like in rectangular coordinates - it's built from thin circular sectors, each with area one-half r-squared d(theta). Summing (integrating) those sectors across the angle range gives the area formula. Arc length in polar form accounts for the fact that both the angle AND the distance from the origin can change as theta sweeps through - so the arc length integrand includes both r itself and its derivative dr/d(theta).",
    formulaIds: ["f23"],
    keyIdea: "The single trickiest part of polar area problems is almost never the integral itself - it's correctly identifying the theta-interval that traces out exactly the region you want (one petal, one loop, the region between two curves) without doubling back over itself.",
    yt: "polarArea",
  }],
  12: [{
    title: "Comprehensive Review",
    body: "There's no new material today - this session is entirely about consolidating everything from 3.7 through 7.4 before the final. The highest-value use of this time is targeted: use the Focus Session tool to work through everything you've ever flagged 'still shaky' across every session and every Practice Bank set, then run a full Mock Exam under real time pressure to find out what's actually still slow or shaky versus just familiar-looking.",
    formulaIds: [],
    keyIdea: "Recognition (\"oh yeah, I remember this\") and recall under pressure (\"I can solve this cold, in 3 minutes, with no hints\") are different skills - the final rewards the second one, so prioritize timed practice over re-reading notes in this last stretch.",
  }],
});

// Session 4 practice = the final's Problem 8i (the Integral Test half of
// Problem 8 — the Limit Comparison half, 8ii, lives in Session 5, where
// comparison tests are taught).
const HW_5_3 = [
  { id: "fe8i", tex: "\\sum_{n=2}^{\\infty} \\frac{1}{n(\\ln n)^3}", answer: "\\text{Converges}", yt: "integralTest", steps: [
    { tex: "$f(x)=\\dfrac{1}{x(\\ln x)^3}$ is positive, continuous, and decreasing for $x\\geq2$ — the Integral Test applies.", why: "General rule: always confirm the three conditions (positive, continuous, decreasing) explicitly before invoking the Integral Test." },
    { tex: "$\\displaystyle\\int_2^{\\infty}\\dfrac{dx}{x(\\ln x)^3}$: let $u=\\ln x$, $du=dx/x$, so the integral becomes $\\displaystyle\\int_{\\ln2}^{\\infty} u^{-3}\\,du$.", why: "General rule: any integrand of the form (power of $\\ln x$)$/x$ is a direct $u=\\ln x$ substitution." },
    { tex: "$\\displaystyle\\int u^{-3}\\,du = -\\dfrac{1}{2u^2}+C$, so $\\displaystyle\\int_{\\ln2}^{b}u^{-3}\\,du = \\left[-\\dfrac{1}{2u^2}\\right]_{\\ln2}^{b} = -\\dfrac{1}{2b^2}+\\dfrac{1}{2(\\ln2)^2}$.", why: "" },
    { tex: "As $b\\to\\infty$, $-\\dfrac{1}{2b^2}\\to0$, so the integral converges to $\\dfrac{1}{2(\\ln2)^2}$ — a finite value.", why: "" },
    { tex: "The improper integral converges, so by the Integral Test the series converges too.", why: "" },
  ]},
];
const REFRESHER_QUIZ_5_3 = [
  { q: "The Divergence Test can only be used to prove:", options: ["Convergence", "Divergence", "Both convergence and divergence", "Neither"], answer: 1 },
  { q: "If lim(n->infinity) a_n = 0, the Divergence Test tells you:", options: ["The series converges", "The series diverges", "Nothing — it's inconclusive", "The series is geometric"], answer: 2 },
  { q: "The Integral Test requires f(x) to be positive, continuous, and:", options: ["Increasing", "Decreasing", "Bounded", "Periodic"], answer: 1 },
  { q: "A p-series sum 1/n^p converges when:", options: ["p < 1", "p = 1", "p > 1", "p is even"], answer: 2 },
];

// Session 5 practice = the final's Problem 8ii (Limit Comparison) plus
// both parts of Problem 9 (absolute/conditional convergence + alternating).
const HW_5_4_5_5 = [
  { id: "fe8ii", tex: "\\sum_{n=1}^{\\infty} \\frac{3n+1}{n^3+5}", answer: "\\text{Converges}", steps: [
    { tex: "For large $n$, $\\dfrac{3n+1}{n^3+5}$ behaves like $\\dfrac{3n}{n^3}=\\dfrac{3}{n^2}$ — compare to $\\sum\\dfrac{1}{n^2}$ using the Limit Comparison Test.", why: "General rule: identify the dominant terms in numerator and denominator to guess the right p-series benchmark before setting up the limit." },
    { tex: "$\\displaystyle\\lim_{n\\to\\infty}\\dfrac{(3n+1)/(n^3+5)}{1/n^2} = \\lim\\dfrac{n^2(3n+1)}{n^3+5} = \\lim\\dfrac{3n^3+n^2}{n^3+5} = 3$ (divide every term by $n^3$).", why: "" },
    { tex: "The limit is finite and positive, and $\\sum\\dfrac1{n^2}$ converges ($p=2>1$), so by the Limit Comparison Test the original series converges too.", why: "" },
  ]},
  { id: "fe9i", tex: "\\sum_{n=1}^{\\infty} (-1)^{n+1}\\frac{1}{2^{2\\ln n}}", answer: "\\text{Converges absolutely}", steps: [
    { tex: "Simplify the base first: $2^{2\\ln n} = \\left(2^{\\ln n}\\right)^2$, and $2^{\\ln n}=e^{\\ln n\\cdot\\ln2}=n^{\\ln2}$ (since $a^{\\ln n}=e^{\\ln n\\ln a}=n^{\\ln a}$).", why: "General rule: any expression with a constant raised to a power involving $\\ln n$ can be rewritten as $n$ raised to a constant power — this converts a disguised series into a recognizable p-series." },
    { tex: "So $2^{2\\ln n} = (n^{\\ln2})^2 = n^{2\\ln2}$, and the series of absolute values is $\\sum\\dfrac{1}{n^{2\\ln2}}$.", why: "" },
    { tex: "This is a p-series with $p=2\\ln2\\approx1.386$. Since $p>1$, $\\sum\\dfrac{1}{n^{2\\ln2}}$ converges.", why: "General rule: $2\\ln2\\approx1.386$ clears the $p>1$ threshold — recognizing the disguised p-series is the entire problem." },
    { tex: "The series of absolute values converges, so the original alternating series converges absolutely (no need for the Alternating Series Test separately, since absolute convergence is the stronger result).", why: "" },
  ]},
  { id: "fe9ii", tex: "\\sum_{n=1}^{\\infty} (-1)^n\\frac{\\ln(n+1)}{n}", answer: "\\text{Converges conditionally}", steps: [
    { tex: "Let $b_n=\\dfrac{\\ln(n+1)}{n}$. It $\\to0$ since $\\ln(n+1)$ grows slower than $n$, and it's eventually decreasing (the derivative of $\\ln(x+1)/x$ is negative for large $x$) — both Alternating Series Test conditions hold, so the series converges.", why: "General rule: 'eventually decreasing' is enough for the Alternating Series Test — it doesn't need to decrease starting from $n=1$." },
    { tex: "Check absolute convergence: $\\sum\\left|\\dfrac{(-1)^n\\ln(n+1)}{n}\\right| = \\sum\\dfrac{\\ln(n+1)}{n}$. Since $\\ln(n+1)\\geq1$ for $n\\geq2$, $\\dfrac{\\ln(n+1)}{n}\\geq\\dfrac1n$ there.", why: "General rule: whenever you suspect divergence in the absolute series, find a smaller divergent benchmark (usually the harmonic series) to compare against." },
    { tex: "$\\sum\\dfrac1n$ diverges (harmonic series), so by Direct Comparison $\\sum\\dfrac{\\ln(n+1)}{n}$ diverges too.", why: "" },
    { tex: "Converges by the Alternating Series Test, but diverges in absolute value — the series converges conditionally.", why: "" },
  ]},
];
const REFRESHER_QUIZ_5_4_5_5 = [
  { q: "Direct Comparison Test: to prove convergence, your series' terms should be:", options: ["Bigger than a known convergent series", "Smaller than a known convergent series", "Equal to a known series", "Negative"], answer: 1 },
  { q: "In the Limit Comparison Test, a finite POSITIVE limit means the two series:", options: ["Always converge", "Always diverge", "Behave the same way (both converge or both diverge)", "Are unrelated"], answer: 2 },
  { q: "The Alternating Series Test requires the terms b_n to be decreasing and:", options: ["Positive only", "Approaching 0", "Approaching infinity", "Integer-valued"], answer: 1 },
  { q: "The error in an alternating series approximation is bounded by:", options: ["The first term", "The sum of all remaining terms", "The size of the next unused term", "Twice the last used term"], answer: 2 },
];

// Session 6 practice = the final's Problem 10 (Ratio Test and Root Test,
// each explicitly named in the problem statement).
const HW_5_6 = [
  { id: "fe10i", tex: "\\text{Use the Ratio Test: } \\sum_{n=1}^{\\infty} \\frac{3^n}{n!}", answer: "\\text{Converges}", steps: [
    { tex: "$\\dfrac{a_{n+1}}{a_n} = \\dfrac{3^{n+1}/(n+1)!}{3^n/n!} = \\dfrac{3^{n+1}}{3^n}\\cdot\\dfrac{n!}{(n+1)!} = \\dfrac{3}{n+1}$.", why: "General rule: factorials in the term are the clearest signal to reach for the Ratio Test — $(n+1)!/n!=n+1$ collapses beautifully." },
    { tex: "$L=\\displaystyle\\lim_{n\\to\\infty}\\dfrac{3}{n+1} = 0$.", why: "" },
    { tex: "$L=0<1$, so by the Ratio Test the series converges (absolutely).", why: "" },
  ]},
  { id: "fe10ii", tex: "\\text{Use the Root Test: } \\sum_{n=1}^{\\infty} \\frac{n}{5^n}", answer: "\\text{Converges}", steps: [
    { tex: "$L=\\displaystyle\\lim_{n\\to\\infty}\\sqrt[n]{\\left|\\dfrac{n}{5^n}\\right|} = \\lim_{n\\to\\infty}\\dfrac{n^{1/n}}{5}$.", why: "General rule: reach for the Root Test whenever the whole term (not just part of it) is effectively raised to the nth power — here $5^n$ in the denominator is the signal." },
    { tex: "$n^{1/n}\\to1$ as $n\\to\\infty$ (a standard limit, provable by rewriting as $e^{(\\ln n)/n}$ and noting $(\\ln n)/n\\to0$).", why: "" },
    { tex: "So $L=\\dfrac15<1$, and by the Root Test the series converges.", why: "" },
  ]},
];
const REFRESHER_QUIZ_5_6 = [
  { q: "The Ratio Test is most useful when a series contains:", options: ["Square roots", "Factorials", "Logarithms", "Trig functions"], answer: 1 },
  { q: "The Root Test is most useful when:", options: ["The whole term is raised to the nth power", "There's a factorial", "The series is alternating", "p = 1"], answer: 0 },
  { q: "If the Ratio Test gives L = 1, you should conclude:", options: ["The series converges", "The series diverges", "Nothing — try a different test", "The series is geometric"], answer: 2 },
  { q: "Ratio Test verdict when L > 1:", options: ["Converges", "Diverges", "Inconclusive", "Converges conditionally"], answer: 1 },
];

// Session 7 practice = all three of the final's power series (Problem 11) —
// this is the single problem worth the most points on the whole exam (18),
// and it deliberately covers all three endpoint-behavior patterns:
// one-endpoint-converges, both-diverge, and (implicitly, from the roadmap's
// wider bank) both-converge.
const HW_6_1 = [
  { id: "fe11i", tex: "\\sum_{n=1}^{\\infty} \\frac{(x-2)^n}{n\\cdot4^n}", answer: "[-2,6)", steps: [
    { tex: "Ratio Test on the general term: $\\left|\\dfrac{(x-2)^{n+1}/[(n+1)4^{n+1}]}{(x-2)^n/(n\\cdot4^n)}\\right| = \\dfrac{|x-2|}{4}\\cdot\\dfrac{n}{n+1} \\to \\dfrac{|x-2|}{4}$.", why: "" },
    { tex: "Need $\\dfrac{|x-2|}{4}<1 \\Rightarrow |x-2|<4$ — radius $R=4$, center $2$, tentative interval $(-2,6)$.", why: "" },
    { tex: "Check $x=-2$: $(x-2)=-4$, term $= \\dfrac{(-4)^n}{n\\cdot4^n} = \\dfrac{(-1)^n}{n}$ — the alternating harmonic series, which converges (conditionally).", why: "" },
    { tex: "Check $x=6$: $(x-2)=4$, term $= \\dfrac{4^n}{n\\cdot4^n}=\\dfrac1n$ — the harmonic series, which diverges.", why: "" },
    { tex: "Interval of convergence: $[-2,6)$ — closed at the convergent endpoint, open at the divergent one.", why: "" },
  ]},
  { id: "fe11ii", tex: "\\sum_{n=0}^{\\infty} \\frac{(x+1)^n}{3^n}", answer: "(-4,2)", steps: [
    { tex: "Ratio Test: $\\left|\\dfrac{(x+1)^{n+1}/3^{n+1}}{(x+1)^n/3^n}\\right| = \\dfrac{|x+1|}{3}$. Need this $<1$, so $R=3$, center $-1$, tentative interval $(-4,2)$.", why: "" },
    { tex: "Check $x=-4$: $(x+1)=-3$, term $=\\dfrac{(-3)^n}{3^n}=(-1)^n$ — terms don't approach $0$, diverges by the Divergence Test.", why: "" },
    { tex: "Check $x=2$: $(x+1)=3$, term $=\\dfrac{3^n}{3^n}=1$ — terms don't approach $0$, diverges.", why: "" },
    { tex: "Both endpoints diverge, so the interval of convergence is the open interval $(-4,2)$.", why: "" },
  ]},
  { id: "fe11iii", tex: "\\sum_{n=1}^{\\infty} \\frac{(x-1)^n}{n}", answer: "[0,2)", steps: [
    { tex: "Ratio Test: $\\left|\\dfrac{(x-1)^{n+1}/(n+1)}{(x-1)^n/n}\\right| = |x-1|\\cdot\\dfrac{n}{n+1}\\to|x-1|$. Need $<1$, so $R=1$, center $1$, tentative interval $(0,2)$.", why: "" },
    { tex: "Check $x=0$: $(x-1)=-1$, term $=\\dfrac{(-1)^n}{n}$ — alternating harmonic series, converges (conditionally).", why: "" },
    { tex: "Check $x=2$: $(x-1)=1$, term $=\\dfrac1n$ — harmonic series, diverges.", why: "" },
    { tex: "Interval of convergence: $[0,2)$.", why: "" },
  ]},
];
const REFRESHER_QUIZ_6_1 = [
  { q: "To find the radius of convergence of a power series, you typically apply:", options: ["The Alternating Series Test", "The Ratio Test", "The Integral Test", "Direct Comparison"], answer: 1 },
  { q: "At the two endpoints x = c - R and x = c + R, the Ratio Test is always:", options: ["Convergent", "Divergent", "Inconclusive", "Undefined"], answer: 2 },
  { q: "A power series always converges at its center x = c:", options: ["True", "False"], answer: 0 },
  { q: "When checking an endpoint, you should plug it into:", options: ["The ratio-test inequality", "The original series", "The derivative of the series", "Nothing — endpoints never need checking"], answer: 1 },
];

// Session 8 practice = the final's Problem 12, both parts (differentiate
// the geometric series, then use that result for a second series). Part i
// reuses the id "s8-differentiate" since it's the exact same problem that
// was already here — keeps any prior grading on it intact.
const HW_6_2_6_3 = [
  { id: "s8-differentiate", tex: "\\text{Differentiate the geometric series } \\sum_{n=0}^{\\infty}x^n=\\dfrac{1}{1-x},\\ |x|<1 \\text{ term by term to find a power series for } \\dfrac{1}{(1-x)^2}. \\text{ State the interval of convergence.}", answer: "\\sum_{n=1}^{\\infty} n\\,x^{n-1},\\ (-1,1)", steps: [
    { tex: "Differentiate both sides of $\\sum_{n=0}^{\\infty}x^n=\\dfrac{1}{1-x}$ with respect to $x$. On the right: $\\dfrac{d}{dx}\\!\\left[\\dfrac{1}{1-x}\\right]=\\dfrac{1}{(1-x)^2}$.", why: "General rule: within its interval of convergence, a power series can be differentiated term by term and the result equals the derivative of the function it represents." },
    { tex: "On the left, differentiate term by term: $\\dfrac{d}{dx}\\sum_{n=0}^{\\infty}x^n = \\sum_{n=1}^{\\infty} n\\,x^{n-1}$ (the constant $n=0$ term differentiates to $0$ and drops out).", why: "" },
    { tex: "So $\\displaystyle\\sum_{n=1}^{\\infty} n\\,x^{n-1} = \\dfrac{1}{(1-x)^2}$.", why: "" },
    { tex: "Interval of convergence: differentiation never changes the radius of convergence, so it's still $R=1$. Checking the endpoints directly ($x=1$: terms are $n$, don't $\\to0$; $x=-1$: terms are $n(-1)^{n-1}$, don't $\\to0$) — both diverge, so the interval stays $(-1,1)$.", why: "General rule: differentiation and integration preserve the RADIUS of convergence but can change endpoint behavior — always re-check both endpoints rather than assuming they carry over unchanged." },
  ]},
  { id: "fe12ii", tex: "\\text{Use the previous result to find a power series representation for } \\dfrac{x}{(1-x)^2}. \\text{ State the interval of convergence.}", answer: "\\sum_{n=1}^{\\infty} n\\,x^n,\\ (-1,1)", steps: [
    { tex: "Multiply both sides of $\\sum_{n=1}^{\\infty}n\\,x^{n-1}=\\dfrac{1}{(1-x)^2}$ by $x$: $x\\displaystyle\\sum_{n=1}^{\\infty}n\\,x^{n-1} = \\dfrac{x}{(1-x)^2}$.", why: "General rule: multiplying a known series by a power of $x$ just shifts every exponent up by that power — no new differentiation needed." },
    { tex: "Distribute the $x$ inside the sum: $\\displaystyle\\sum_{n=1}^{\\infty} n\\,x^n = \\dfrac{x}{(1-x)^2}$.", why: "" },
    { tex: "Interval of convergence: multiplying by $x$ doesn't change the radius either, so it remains $(-1,1)$.", why: "" },
  ]},
];
const REFRESHER_QUIZ_6_2_6_3 = [
  { q: "Within its interval of convergence, a power series can be differentiated or integrated:", options: ["Never", "Only at the center", "Term by term", "Only if it's geometric"], answer: 2 },
  { q: "The nth Taylor coefficient c_n equals:", options: ["f(n)", "f'(a)/n", "f^(n)(a) / n!", "n! / f(a)"], answer: 2 },
  { q: "A Maclaurin series is a Taylor series centered at:", options: ["x = 1", "x = a", "x = 0", "x = infinity"], answer: 2 },
  { q: "Substituting into a known series is usually faster than computing derivatives directly:", options: ["True", "False"], answer: 0 },
];

// Session 9 practice = the final's Problem 13 in full: build the Maclaurin
// series for e^x sin(x) by multiplying two known series (the technique
// taught in Session 8's worked example), then use it to approximate a value.
const HW_6_4 = [
  { id: "fe13", tex: "\\text{Find the first four nonzero terms of the Maclaurin series for } e^x\\sin(x). \\text{ Then use your result to approximate } e^{0.1}\\sin(0.1), \\text{ rounded to four decimal places.}", answer: "x+x^2+\\dfrac{x^3}{3}-\\dfrac{x^5}{30}+\\cdots;\\ \\approx 0.1103", steps: [
    { tex: "Multiply the known series $e^x=\\sum\\dfrac{x^n}{n!}$ and $\\sin x=\\sum\\dfrac{(-1)^mx^{2m+1}}{(2m+1)!}$, collecting terms by total degree — the same technique as the $e^x\\cos x$ example from Session 8, just with sine instead of cosine.", why: "General rule: multiplying two known Maclaurin series and collecting by degree is faster and less error-prone than computing four or five derivatives of $e^x\\sin x$ directly." },
    { tex: "Degree 1: $x$. Degree 2: $x\\cdot x=x^2$ (only one product contributes, since $\\sin x$ has no constant term). Degree 3: $1\\cdot\\left(-\\dfrac{x^3}{6}\\right)+\\dfrac{x^2}{2}\\cdot x = -\\dfrac{x^3}{6}+\\dfrac{x^3}{2} = \\dfrac{x^3}{3}$.", why: "" },
    { tex: "Degree 4: every combination cancels to $0$ (e.g. $x\\cdot\\left(-\\dfrac{x^3}{6}\\right)+\\dfrac{x^3}{6}\\cdot x=0$) — so there is no $x^4$ term, meaning the series must be carried one more degree to find the fourth nonzero term.", why: "General rule: don't assume consecutive degrees always contribute — verify each one, since a cancellation (like this $x^4$ term) means going further to collect the requested number of nonzero terms." },
    { tex: "Degree 5: combining $1\\cdot\\dfrac{x^5}{120}+\\dfrac{x^2}{2}\\cdot\\left(-\\dfrac{x^3}{6}\\right)+\\dfrac{x^4}{24}\\cdot x = \\dfrac{x^5}{120}-\\dfrac{x^5}{12}+\\dfrac{x^5}{24}$, which combines (common denominator 120) to $-\\dfrac{x^5}{30}$.", why: "" },
    { tex: "First four nonzero terms: $e^x\\sin x = x+x^2+\\dfrac{x^3}{3}-\\dfrac{x^5}{30}+\\cdots$", why: "" },
    { tex: "Approximate at $x=0.1$: $x=0.1$, $x^2=0.01$, $x^3/3\\approx0.000333$, $x^5/30\\approx0.0000003$ (negligible). Sum: $0.1+0.01+0.000333-0.0000003 \\approx 0.1103$.", why: "General rule: once you have enough terms, plug in and add — later terms shrink fast for small $x$, so it's clear when it's safe to stop." },
  ]},
];
const REFRESHER_QUIZ_6_4 = [
  { q: "Term-by-term integration of a Taylor series can approximate a definite integral with no elementary antiderivative:", options: ["True", "False"], answer: 0 },
  { q: "The Lagrange error bound depends on the size of:", options: ["The function itself", "The (n+1)th derivative", "The center a", "The interval's midpoint only"], answer: 1 },
  { q: "Multiplying a known series by x shifts every exponent by:", options: ["0", "1", "x", "n"], answer: 1 },
  { q: "Taylor series let you evaluate some 0/0-type limits without repeated L'Hopital's Rule:", options: ["True", "False"], answer: 0 },
];

// Session 10 practice = the final's Problem 14 (parametric slope, second
// derivative, horizontal tangents) plus Problem 16's graphing/pole part
// (i-ii), which is squarely a 7.3 topic — the area part of 16 (iii) is kept
// in Session 11 alongside arc length, where the polar-area machinery lives.
const HW_7_1_7_3 = [
  { id: "fe14", tex: "\\text{For the parametric curve } x=t^2-4t,\\ y=t^3-6t\\text{: find } dy/dx,\\ d^2y/dx^2, \\text{ and all points where the tangent line is horizontal.}", answer: "dy/dx=\\dfrac{3(t^2-2)}{2(t-2)};\\ d^2y/dx^2=\\dfrac{3(t^2-4t+2)}{4(t-2)^3};\\ (2-4\\sqrt2,-4\\sqrt2)\\ \\text{and}\\ (2+4\\sqrt2,4\\sqrt2)", steps: [
    { tex: "$\\dfrac{dx}{dt}=2t-4$, $\\dfrac{dy}{dt}=3t^2-6$, so $\\dfrac{dy}{dx}=\\dfrac{3t^2-6}{2t-4} = \\dfrac{3(t^2-2)}{2(t-2)}$.", why: "" },
    { tex: "For $d^2y/dx^2$, differentiate $dy/dx$ with respect to $t$ using the quotient rule, then divide by $dx/dt$ again: $\\dfrac{d}{dt}\\!\\left[\\dfrac{3t^2-6}{2t-4}\\right] = \\dfrac{6t(2t-4)-(3t^2-6)(2)}{(2t-4)^2} = \\dfrac{6t^2-24t+12}{(2t-4)^2}$.", why: "General rule: $d^2y/dx^2$ is NOT the second derivative with respect to $t$ — it's $\\dfrac{d}{dt}\\!\\left(\\dfrac{dy}{dx}\\right)$ divided by $dx/dt$ again, a two-step process." },
    { tex: "Divide by $dx/dt=2t-4$: $d^2y/dx^2 = \\dfrac{6t^2-24t+12}{(2t-4)^3} = \\dfrac{6(t^2-4t+2)}{8(t-2)^3} = \\dfrac{3(t^2-4t+2)}{4(t-2)^3}$.", why: "" },
    { tex: "Horizontal tangents need $dy/dx=0$ with $dx/dt\\neq0$: set the numerator $3t^2-6=0 \\Rightarrow t=\\pm\\sqrt2$. Checking $dx/dt=2t-4$ at both $t$-values shows neither is $0$, so both are valid.", why: "General rule: a horizontal tangent needs the NUMERATOR of $dy/dx$ to be zero while the denominator stays nonzero — if both vanish together the point is a cusp, not a horizontal tangent." },
    { tex: "At $t=\\sqrt2$: $x=2-4\\sqrt2$, $y=\\sqrt2(2-6)=-4\\sqrt2$ — point $(2-4\\sqrt2,\\,-4\\sqrt2)$. At $t=-\\sqrt2$: $x=2+4\\sqrt2$, $y=-\\sqrt2(2-6)=4\\sqrt2$ — point $(2+4\\sqrt2,\\,4\\sqrt2)$.", why: "" },
  ]},
  { id: "fe16i", tex: "\\text{Consider the polar curve } r=1+\\cos\\theta. \\text{ Describe its shape and determine all values of } \\theta \\text{ for which the graph passes through the pole } (r=0).", answer: "\\text{A cardioid; passes through the pole at } \\theta=\\pi", steps: [
    { tex: "$r=1+\\cos\\theta$ is a cardioid — a heart-shaped curve with its outer point at $\\theta=0$ ($r=2$) and a cusp pointing back toward the origin at $\\theta=\\pi$.", why: "General rule: recognize $r=a\\pm a\\cos\\theta$ or $r=a\\pm a\\sin\\theta$ on sight as a cardioid — the cusp always occurs where the $\\pm\\cos$ or $\\pm\\sin$ term cancels the constant $a$." },
    { tex: "The curve passes through the pole exactly where $r=0$: $1+\\cos\\theta=0 \\Rightarrow \\cos\\theta=-1 \\Rightarrow \\theta=\\pi$ (within $[0,2\\pi)$).", why: "General rule: 'passes through the pole' always means solve $r(\\theta)=0$ for $\\theta$ — a one-line equation, not a graphing question." },
  ]},
];
const REFRESHER_QUIZ_7_1_7_3 = [
  { q: "Parametric slope dy/dx equals:", options: ["dx/dt divided by dy/dt", "dy/dt divided by dx/dt", "dy/dt times dx/dt", "The derivative of y alone"], answer: 1 },
  { q: "The parametric arc length integrand is the square root of:", options: ["(dx/dt) + (dy/dt)", "(dx/dt)^2 - (dy/dt)^2", "(dx/dt)^2 + (dy/dt)^2", "dx/dt times dy/dt"], answer: 2 },
  { q: "In polar-to-Cartesian conversion, x equals:", options: ["r + cos(theta)", "r cos(theta)", "r / cos(theta)", "cos(r theta)"], answer: 1 },
  { q: "r^2 always equals:", options: ["x + y", "x^2 - y^2", "x^2 + y^2", "2xy"], answer: 2 },
];

// Session 11 practice = the final's Problem 15 (parametric arc length) plus
// "s11-cardioid" below, which is kept UNCHANGED — it already asks for the
// area enclosed by r=1+cos(theta), which is exactly the final's Problem
// 16iii, so its existing id is preserved and any prior grading on it
// carries straight over with no changes needed.
const HW_7_4 = [
  { id: "fe15", tex: "\\text{Find the exact arc length of the parametric curve } x=t^2,\\ y=\\dfrac13t^3, \\ 0\\leq t\\leq2.", answer: "\\dfrac{16\\sqrt2-8}{3}", steps: [
    { tex: "$\\dfrac{dx}{dt}=2t$, $\\dfrac{dy}{dt}=t^2$. Arc length: $L=\\displaystyle\\int_0^2\\sqrt{(2t)^2+(t^2)^2}\\,dt = \\int_0^2\\sqrt{4t^2+t^4}\\,dt$.", why: "" },
    { tex: "Factor inside the root: $\\sqrt{t^2(4+t^2)} = t\\sqrt{4+t^2}$ ($t\\geq0$ on this interval, so no absolute value issue).", why: "General rule: always factor out the highest common power before attempting a substitution — it often turns an awkward root into a clean product." },
    { tex: "Let $u=4+t^2$, $du=2t\\,dt$, so $t\\,dt=\\dfrac{du}{2}$; bounds: $t=0\\Rightarrow u=4$, $t=2\\Rightarrow u=8$.", why: "" },
    { tex: "$L=\\displaystyle\\int_4^8 \\sqrt u\\cdot\\dfrac{du}{2} = \\dfrac13\\left[u^{3/2}\\right]_4^8 = \\dfrac13\\left(8^{3/2}-4^{3/2}\\right)$.", why: "" },
    { tex: "$8^{3/2}=8\\sqrt8=16\\sqrt2$ and $4^{3/2}=8$, so $L=\\dfrac{16\\sqrt2-8}{3}$.", why: "" },
  ]},
  { id: "s11-cardioid", tex: "\\text{Find the area enclosed by the cardioid } r=1+\\cos\\theta.", answer: "\\tfrac{3\\pi}{2}", steps: [
    { tex: "$A=\\dfrac12\\int_0^{2\\pi}(1+\\cos\\theta)^2\\,d\\theta = \\dfrac12\\int_0^{2\\pi}\\left(1+2\\cos\\theta+\\cos^2\\theta\\right)d\\theta$.", why: "General rule: expand $(1+\\cos\\theta)^2$ before integrating — trying to integrate it unexpanded doesn't work." },
    { tex: "$\\int_0^{2\\pi}1\\,d\\theta=2\\pi$, $\\int_0^{2\\pi}2\\cos\\theta\\,d\\theta=0$, $\\int_0^{2\\pi}\\cos^2\\theta\\,d\\theta=\\pi$ (power-reduction over a full period).", why: "General rule: memorize that $\\int_0^{2\\pi}\\cos^2\\theta\\,d\\theta=\\int_0^{2\\pi}\\sin^2\\theta\\,d\\theta=\\pi$ — it comes up constantly in polar area problems." },
    { tex: "Sum: $2\\pi+0+\\pi=3\\pi$, so $A=\\dfrac12(3\\pi)=\\dfrac{3\\pi}{2}$.", why: "" },
  ]},
];
const REFRESHER_QUIZ_7_4 = [
  { q: "The polar area formula integrates:", options: ["r d(theta)", "(1/2) r^2 d(theta)", "r^2 d(theta)", "2r d(theta)"], answer: 1 },
  { q: "The polar arc length integrand includes dr/d(theta) because:", options: ["r never changes", "The distance from the origin can change as theta sweeps, adding to the arc length", "It's a typo in the formula", "Only for circles"], answer: 1 },
  { q: "The area of a full circle r = a, computed via the polar formula, equals:", options: ["2*pi*a", "pi*a", "pi*a^2", "a^2"], answer: 2 },
  { q: "To find the area of one petal of a rose curve, you integrate over:", options: ["0 to 2*pi always", "The theta-interval where that one petal is traced", "A fixed interval of length pi", "The full domain of r"], answer: 1 },
];

const HW_FINAL_REVIEW = [
  { id: "s12-alt-callback", tex: "\\sum_{n=2}^{\\infty} \\frac{(-1)^n}{n\\ln n}", answer: "\\text{Converges conditionally}", steps: [
    { tex: "Alternating Series Test: $b_n=\\tfrac{1}{n\\ln n}$ is decreasing and $\\to0$ — converges.", why: "General rule: this is the same $b_n$ from the Session 4 Integral Test example — recognizing recurring building blocks across topics is exactly what final review is for." },
    { tex: "Absolute series $\\sum\\tfrac{1}{n\\ln n}$ diverges by the Integral Test (shown back in Session 4).", why: "Callback: $\\int_2^\\infty \\frac{dx}{x\\ln x} = \\lim[\\ln(\\ln x)] \\to \\infty$." },
    { tex: "Converges by AST but not absolutely — conditionally convergent.", why: "" },
  ]},
  { id: "s12-radius", tex: "\\text{Find the radius of convergence of } \\sum_{n=1}^{\\infty} \\frac{(x+1)^n}{n\\cdot2^n}.", answer: "R=2", steps: [
    { tex: "Ratio Test: $\\left|\\dfrac{(x+1)^{n+1}/[(n+1)2^{n+1}]}{(x+1)^n/(n\\cdot2^n)}\\right| \\to \\dfrac{|x+1|}{2}$ as $n\\to\\infty$.", why: "General rule: this is the same radius-of-convergence workflow from Session 7 — Ratio Test on the general term, solve the resulting inequality for $x$." },
    { tex: "Need $\\dfrac{|x+1|}{2}<1 \\Rightarrow |x+1|<2$, so $R=2$.", why: "" },
  ]},
  { id: "s12-polar-callback", tex: "\\text{Find the area enclosed by } r=2\\sin\\theta.", answer: "\\pi", steps: [
    { tex: "$A=\\dfrac12\\int_0^{\\pi}(2\\sin\\theta)^2\\,d\\theta = 2\\int_0^{\\pi}\\sin^2\\theta\\,d\\theta$.", why: "General rule: $r=2\\sin\\theta$ traces its full circle over $\\theta\\in[0,\\pi]$, not $[0,2\\pi]$ — using the wrong interval double-counts the area." },
    { tex: "$\\int_0^\\pi \\sin^2\\theta\\,d\\theta = \\dfrac{\\pi}{2}$ (power reduction), so $A=2\\cdot\\dfrac{\\pi}{2}=\\pi$.", why: "Matches a circle of radius 1 ($\\pi r^2=\\pi$) — same polar-area machinery as the final's cardioid problem from Session 11, just a plainer curve." },
  ]},
];
const REFRESHER_QUIZ_FINAL = [
  { q: "Which test is generally best for a series like n! / n^n?", options: ["Direct Comparison", "Ratio Test", "Alternating Series Test", "p-series Test"], answer: 1 },
  { q: "A power series' interval of convergence is always centered at:", options: ["x = 0 only", "x = 1", "Its center c", "Infinity"], answer: 2 },
  { q: "The polar area formula uses r raised to the power of:", options: ["1", "2", "1/2", "3"], answer: 1 },
  { q: "The Alternating Series Estimation Theorem bounds the error by:", options: ["The sum of all terms", "The first omitted (next) term", "Half the last used term", "The largest term in the series"], answer: 1 },
];

/* ============================================================
   WORKED EXAMPLES — one fully solved, read-through example per
   session, shown BEFORE the hands-on practice problems. This is
   the "watch me solve one first" step that was missing.
============================================================ */
const WORKED_EXAMPLES = {
  1: [
    { id: "we1", tex: "\\int_{2/\\sqrt{3}}^{2} \\frac{dx}{|x|\\sqrt{x^2-1}}", answer: "\\pi/6", steps: [
      { tex: "$x>0$ on this interval so $|x|=x$; recognize $x\\sqrt{x^2-a^2}$ in the denominator as the inverse-secant pattern, so the antiderivative is $\\sec^{-1}(x)+C$.", why: "" },
      { tex: "Evaluate at the bounds: $\\sec^{-1}(2)-\\sec^{-1}(2/\\sqrt3) = \\tfrac{\\pi}{3}-\\tfrac{\\pi}{6} = \\tfrac{\\pi}{6}$.", why: "" },
    ]},
    { id: "we1b", tex: "\\int \\frac{dx}{x^2\\sqrt{x^2+4}}", answer: "-\\dfrac{\\sqrt{x^2+4}}{4x}+C", steps: [
      { tex: "Let $x=2\\tan\\theta$, $dx=2\\sec^2\\theta\\,d\\theta$, $\\sqrt{x^2+4}=2\\sec\\theta$.", why: "General rule: $\\sqrt{x^2+a^2}$ always signals $x=a\\tan\\theta$ — the same substitution used across every trig-sub problem on the final." },
      { tex: "Substitute: $\\dfrac{2\\sec^2\\theta\\,d\\theta}{4\\tan^2\\theta\\cdot2\\sec\\theta} = \\dfrac14\\int\\dfrac{\\sec\\theta}{\\tan^2\\theta}\\,d\\theta = \\dfrac14\\int\\dfrac{\\cos\\theta}{\\sin^2\\theta}\\,d\\theta$.", why: "General rule: once secant and tangent are both present, it's often faster to rewrite everything in $\\sin\\theta,\\cos\\theta$ before continuing." },
      { tex: "Let $u=\\sin\\theta$, $du=\\cos\\theta\\,d\\theta$: $\\dfrac14\\int u^{-2}\\,du = -\\dfrac{1}{4u} = -\\dfrac{1}{4\\sin\\theta}+C$.", why: "" },
      { tex: "From the triangle (opposite $x$, adjacent $2$, hyp $\\sqrt{x^2+4}$): $\\sin\\theta=\\dfrac{x}{\\sqrt{x^2+4}}$, so the answer is $-\\dfrac{\\sqrt{x^2+4}}{4x}+C$.", why: "" },
    ]},
  ],
  2: [
    { id: "we2a", tex: "\\int_{-\\infty}^{\\infty} \\frac{dt}{1+t^2}", answer: "\\pi", steps: [
      { tex: "Rewrite as a limit of a symmetric proper integral: $I(A)=\\int_{-A}^{A}\\dfrac{dt}{1+t^2} = \\tan^{-1}(A)-\\tan^{-1}(-A) = 2\\tan^{-1}(A)$.", why: "" },
      { tex: "Take $A\\to\\infty$: $2\\tan^{-1}(A) \\to 2\\cdot\\dfrac{\\pi}{2} = \\pi$.", why: "" },
    ]},
    { id: "we2b", tex: "a_n = \\frac{3n-1}{2n+5}", answer: "\\tfrac32", steps: [
      { tex: "Divide numerator and denominator by the highest power of $n$ present, $n$: $\\dfrac{3-1/n}{2+5/n}$.", why: "" },
      { tex: "As $n\\to\\infty$, $1/n\\to0$ and $5/n\\to0$, leaving $\\dfrac32$.", why: "" },
    ]},
    { id: "we2c", tex: "\\text{Use Simpson's Rule with } n=4 \\text{ to approximate } \\int_0^1 x^2\\,dx, \\text{ and compare to the exact value.}", answer: "\\approx 0.333\\ (\\text{exact value } 1/3)", steps: [
      { tex: "$h=(1-0)/4=0.25$, nodes $0, 0.25, 0.5, 0.75, 1$. For $f(x)=x^2$: $f$-values are $0, 0.0625, 0.25, 0.5625, 1$.", why: "" },
      { tex: "Simpson's Rule: $\\dfrac{h}{3}[f_0+4f_1+2f_2+4f_3+f_4] = \\dfrac{0.25}{3}[0+0.25+0.5+2.25+1] = \\dfrac{0.25}{3}(4) = 0.\\overline{3}$.", why: "" },
      { tex: "This matches the exact value $\\int_0^1x^2dx=\\tfrac13$ almost perfectly — Simpson's Rule is exact for any polynomial up to degree 3, which is why a simple parabola like $x^2$ comes out essentially exact.", why: "General rule: sanity-check the Simpson's Rule formula on a function with a known exact answer (like a low-degree polynomial) before trusting it on a harder integral." },
    ]},
  ],
  3: [{ id: "we3", tex: "\\sum_{n=1}^{\\infty} \\left(\\frac{1}{n+2}-\\frac{1}{n+3}\\right)", answer: "\\tfrac13", steps: [
    { tex: "Write out the partial sum: $S_N = \\left(\\tfrac13-\\tfrac14\\right)+\\left(\\tfrac14-\\tfrac15\\right)+\\cdots+\\left(\\tfrac{1}{N+2}-\\tfrac{1}{N+3}\\right)$.", why: "" },
    { tex: "Every interior term cancels, leaving $S_N = \\tfrac13 - \\tfrac{1}{N+3}$.", why: "" },
    { tex: "$\\lim_{N\\to\\infty} S_N = \\tfrac13 - 0 = \\tfrac13$.", why: "" },
  ]}],
  4: [{ id: "we4", tex: "\\sum_{n=2}^{\\infty} \\frac{1}{n\\ln n}", answer: "\\text{Diverges}", steps: [
    { tex: "$f(x)=\\dfrac{1}{x\\ln x}$ is positive, continuous, and decreasing for $x\\geq2$ — Integral Test applies.", why: "" },
    { tex: "$\\int_2^{\\infty}\\dfrac{dx}{x\\ln x}$: let $u=\\ln x$, $du=dx/x$, giving $\\int\\dfrac{du}{u}=\\ln|u|=\\ln(\\ln x)$.", why: "" },
    { tex: "$\\lim_{b\\to\\infty}\\left[\\ln(\\ln b)-\\ln(\\ln 2)\\right] = \\infty$ — the integral diverges, so the series diverges too.", why: "" },
  ]}],
  5: [{ id: "we5", tex: "\\sum_{n=1}^{\\infty} \\frac{n+1}{n^3+2}", answer: "\\text{Converges}", steps: [
    { tex: "For large $n$, $\\dfrac{n+1}{n^3+2}$ behaves like $\\dfrac{n}{n^3}=\\dfrac{1}{n^2}$ — compare to $\\sum\\tfrac1{n^2}$ using the Limit Comparison Test.", why: "" },
    { tex: "$\\lim_{n\\to\\infty} \\dfrac{(n+1)/(n^3+2)}{1/n^2} = \\lim \\dfrac{n^2(n+1)}{n^3+2} = \\lim\\dfrac{n^3+n^2}{n^3+2} = 1$ (divide by $n^3$).", why: "" },
    { tex: "The limit is finite and positive, and $\\sum\\tfrac1{n^2}$ converges ($p=2>1$), so by Limit Comparison the original series converges too.", why: "" },
  ]}],
  6: [{ id: "we6", tex: "\\sum_{n=1}^{\\infty} \\frac{n^n}{n!}", answer: "\\text{Diverges}", steps: [
    { tex: "Ratio Test: $\\dfrac{a_{n+1}}{a_n} = \\dfrac{(n+1)^{n+1}}{(n+1)!}\\cdot\\dfrac{n!}{n^n} = \\dfrac{(n+1)^n}{n^n} = \\left(1+\\tfrac1n\\right)^n$.", why: "" },
    { tex: "As $n\\to\\infty$, $\\left(1+\\tfrac1n\\right)^n \\to e$.", why: "" },
    { tex: "$L=e\\approx2.718>1$, so by the Ratio Test the series diverges.", why: "" },
  ]}],
  7: [{ id: "we7", tex: "\\sum_{n=1}^{\\infty} \\frac{x^n}{n}", answer: "[-1,1)", steps: [
    { tex: "Ratio Test: $\\left|\\dfrac{x^{n+1}/(n+1)}{x^n/n}\\right| = |x|\\cdot\\dfrac{n}{n+1} \\to |x|$.", why: "" },
    { tex: "Need $|x|<1$ — radius $R=1$, tentative interval $(-1,1)$.", why: "" },
    { tex: "Check $x=1$: $\\sum\\tfrac1n$, harmonic series — diverges. Check $x=-1$: $\\sum\\tfrac{(-1)^n}{n}$, alternating harmonic — converges.", why: "" },
    { tex: "Interval of convergence: $[-1,1)$.", why: "" },
  ]}],
  8: [
    { id: "we8", tex: "\\text{Find the Maclaurin series for } \\cos(x) \\text{ from the derivative definition.}", answer: "\\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n}}{(2n)!}", steps: [
      { tex: "Compute derivatives at $0$: $f(0)=1$, $f'(0)=-\\sin0=0$, $f''(0)=-\\cos0=-1$, $f'''(0)=\\sin0=0$, $f''''(0)=\\cos0=1$ — the pattern repeats every 4 derivatives.", why: "" },
      { tex: "Coefficients $c_n=f^{(n)}(0)/n!$: $c_0=1,\\ c_1=0,\\ c_2=-\\tfrac1{2!},\\ c_3=0,\\ c_4=\\tfrac1{4!},\\ldots$", why: "" },
      { tex: "$\\cos x = \\sum_{n=0}^{\\infty}\\dfrac{(-1)^n x^{2n}}{(2n)!} = 1-\\dfrac{x^2}{2!}+\\dfrac{x^4}{4!}-\\cdots$", why: "" },
    ]},
    { id: "we8b", tex: "\\text{Find the first three nonzero terms of the Maclaurin series for } e^x\\cos(x) \\text{ by multiplying the known series for } e^x \\text{ and } \\cos(x).", answer: "1+x-\\dfrac{x^3}{3}+\\cdots", steps: [
      { tex: "Known series: $e^x=1+x+\\dfrac{x^2}{2}+\\dfrac{x^3}{6}+\\cdots$, $\\cos x = 1-\\dfrac{x^2}{2}+\\cdots$", why: "General rule: to multiply two series together, keep every product term whose total degree is within the range you need, then collect by degree — exactly like multiplying two polynomials." },
      { tex: "Degree 0: $1\\cdot1=1$. Degree 1: $1\\cdot0+x\\cdot1=x$ (cos has no $x$ term).", why: "" },
      { tex: "Degree 2: $1\\cdot\\left(-\\dfrac{x^2}{2}\\right)+x\\cdot0+\\dfrac{x^2}{2}\\cdot1 = -\\dfrac{x^2}{2}+\\dfrac{x^2}{2}=0$.", why: "General rule: don't assume every degree contributes a nonzero term — some coefficients genuinely cancel, as happens here." },
      { tex: "Degree 3: $1\\cdot0+x\\cdot\\left(-\\dfrac12\\right)+\\dfrac{x^2}{2}\\cdot0+\\dfrac{x^3}{6}\\cdot1 = -\\dfrac{x^3}{2}+\\dfrac{x^3}{6} = -\\dfrac{x^3}{3}$.", why: "" },
      { tex: "First three nonzero terms: $e^x\\cos x = 1+x-\\dfrac{x^3}{3}+\\cdots$ (the $x^2$ term vanished, so 'first three nonzero terms' skips straight to degree 3). This multiplication technique is exactly what the final's Maclaurin-series problem needs.", why: "" },
    ]},
  ],
  9: [{ id: "we9", tex: "\\int_0^1 \\frac{\\sin x}{x}\\,dx \\text{ (approximate using its Maclaurin series)}", answer: "\\approx 0.9461", steps: [
    { tex: "$\\dfrac{\\sin x}{x} = 1-\\dfrac{x^2}{3!}+\\dfrac{x^4}{5!}-\\cdots$ (divide the known $\\sin x$ series by $x$).", why: "" },
    { tex: "Integrate term by term: $\\int_0^1\\left(1-\\tfrac{x^2}{6}+\\tfrac{x^4}{120}-\\cdots\\right)dx = \\left[x-\\tfrac{x^3}{18}+\\tfrac{x^5}{600}-\\cdots\\right]_0^1$.", why: "" },
    { tex: "$= 1-\\dfrac1{18}+\\dfrac1{600}-\\cdots \\approx 0.9461$ — this integral has no elementary antiderivative, so the series is the only practical way to approximate it.", why: "" },
  ]}],
  10: [{ id: "we10", tex: "\\text{Find } dy/dx \\text{ for } x=3\\cos t,\\ y=3\\sin t \\text{ at } t=\\pi/4.", answer: "-1", steps: [
    { tex: "$\\dfrac{dx}{dt}=-3\\sin t$, $\\dfrac{dy}{dt}=3\\cos t$.", why: "" },
    { tex: "$\\dfrac{dy}{dx} = \\dfrac{3\\cos t}{-3\\sin t} = -\\cot t$.", why: "" },
    { tex: "At $t=\\pi/4$: $-\\cot(\\pi/4) = -1$.", why: "" },
  ]}],
  11: [{ id: "we11", tex: "\\text{Find the area of one petal of } r=\\cos(2\\theta), \\text{ traced for } \\theta\\in[-\\pi/4,\\pi/4].", answer: "\\pi/8", steps: [
    { tex: "$A=\\dfrac12\\int_{-\\pi/4}^{\\pi/4}\\cos^2(2\\theta)\\,d\\theta$.", why: "" },
    { tex: "Power-reduction: $\\cos^2(2\\theta) = \\dfrac{1+\\cos(4\\theta)}{2}$.", why: "" },
    { tex: "$A=\\dfrac14\\int_{-\\pi/4}^{\\pi/4}\\left(1+\\cos4\\theta\\right)d\\theta = \\dfrac14\\left[\\theta+\\dfrac{\\sin4\\theta}{4}\\right]_{-\\pi/4}^{\\pi/4} = \\dfrac14\\cdot\\dfrac{\\pi}{2} = \\dfrac{\\pi}{8}$.", why: "" },
  ]}],
  12: [{ id: "we12", tex: "\\text{Classify } \\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}n}{n^2+1} \\text{ (mixed review: which test applies?)}", answer: "\\text{Converges conditionally}", steps: [
    { tex: "Divergence Test first: $\\lim \\tfrac{n}{n^2+1}=0$ — inconclusive, but doesn't rule anything out.", why: "" },
    { tex: "Alternating Series Test: $b_n=\\tfrac{n}{n^2+1}$ is eventually decreasing and $\\to0$ — converges.", why: "" },
    { tex: "Absolute series $\\sum\\tfrac{n}{n^2+1}$ behaves like $\\sum\\tfrac1n$ (Limit Comparison, ratio $\\to1$) — diverges, since the harmonic series diverges.", why: "" },
    { tex: "Converges by AST, diverges in absolute value — conditionally convergent.", why: "This problem alone touches the Divergence Test, Alternating Series Test, and Limit Comparison — exactly the kind of multi-test recognition the final rewards." },
  ]}],
};

Object.assign(SESSION_PREVIEW_GOALS, {
  4: ["Apply the Divergence Test as a first-pass elimination check", "Confirm the three conditions needed for the Integral Test", "Use the Integral Test to determine convergence for series that match an integrable function"],
  5: ["Apply Direct and Limit Comparison Tests against a known benchmark series", "Apply the Alternating Series Test", "Bound the error of an alternating series approximation"],
  6: ["Apply the Ratio Test, especially to series with factorials", "Apply the Root Test, especially to series raised to the nth power", "Recognize when a test result of 1 means switching tools"],
  7: ["Find the radius of convergence of a power series using the Ratio Test", "Check both endpoints individually to determine the full interval of convergence"],
  8: ["Differentiate and integrate power series term by term", "Build a Taylor/Maclaurin series from the coefficient formula", "Use substitution into known series instead of computing derivatives from scratch"],
  9: ["Use Taylor series to evaluate indeterminate limits", "Use Taylor series to approximate integrals with no elementary antiderivative", "Bound approximation error using the Lagrange remainder"],
  10: ["Find the slope of a parametric curve", "Compute parametric arc length", "Convert between polar and Cartesian coordinates"],
  11: ["Compute the area enclosed by a polar curve", "Identify the correct theta-interval for a given region", "Compute arc length in polar coordinates"],
  12: ["Identify remaining weak spots using the Focus Session tool", "Practice recall under timed pressure using the Mock Exam", "Review the highest-priority topics: 5.3-5.6 convergence tests and 6.3 Taylor series"],
});
Object.assign(SESSION_RECAPS, {
  4: "Last time you covered infinite series and partial sums (5.2) - today's tests give you fast, systematic ways to determine convergence without computing partial sums by hand every time.",
  5: "Last time you covered the Divergence and Integral Tests (5.3) - today adds two more tools, including one built specifically for series that flip sign every term.",
  6: "Last time you covered comparison and alternating series tests (5.4-5.5) - today's two tests round out your convergence-testing toolkit, especially for factorials and nth-power terms.",
  7: "Last time you covered the Ratio and Root Tests (5.6) - today applies that same Ratio Test machinery to a new kind of series: one where the terms include a variable, not just n.",
  8: "Last time you covered power series and intervals of convergence (6.1) - today shows what makes power series so useful: you can build one for almost any function, and manipulate known ones into new ones.",
  9: "Last time you covered building Taylor and Maclaurin series (6.2-6.3) - today is about actually using them: approximating values, evaluating limits, and estimating integrals.",
  10: "Last time was Taylor series applications (6.4) - today shifts to a new topic entirely: describing curves with a parameter t, and with polar coordinates instead of (x,y).",
  11: "Last time covered parametric and polar calculus basics (7.1-7.3) - today finishes the topic with area and arc length in polar coordinates.",
  12: "You've now covered everything from 3.7 through 7.4. Today is entirely about consolidation before the final.",
});


// Session 1 practice = the final exam's own Problems 1-4 (trig substitution,
// trig integrals, integration by parts, partial fractions) — replacing the
// generic 1.7-only set, since the final leans hard on all four techniques
// right out of the gate, not just inverse trig.
const HW1_SECTION_1_7 = [
  { id: "fe1a", tex: "\\int \\frac{x^2}{\\sqrt{x^2+4}}\\,dx", answer: "\\dfrac{x\\sqrt{x^2+4}}{2}-2\\ln\\left(x+\\sqrt{x^2+4}\\right)+C", yt: "trigSub", steps: [
    { tex: "Let $x=2\\tan\\theta$, so $dx=2\\sec^2\\theta\\,d\\theta$ and $\\sqrt{x^2+4}=2\\sec\\theta$.", why: "General rule: $\\sqrt{x^2+a^2}$ always signals $x=a\\tan\\theta$, since $1+\\tan^2\\theta=\\sec^2\\theta$ clears the square root." },
    { tex: "Substitute: $\\int \\dfrac{4\\tan^2\\theta}{2\\sec\\theta}\\cdot2\\sec^2\\theta\\,d\\theta = 4\\int\\tan^2\\theta\\sec\\theta\\,d\\theta$.", why: "" },
    { tex: "Rewrite $\\tan^2\\theta=\\sec^2\\theta-1$: $4\\int\\sec^3\\theta\\,d\\theta - 4\\int\\sec\\theta\\,d\\theta$.", why: "General rule: whenever $\\tan^2$ sits next to a power of sec, convert it to $\\sec^2-1$ so everything is in terms of sec alone." },
    { tex: "Using the memorized results $\\int\\sec^3\\theta\\,d\\theta=\\tfrac12(\\sec\\theta\\tan\\theta+\\ln|\\sec\\theta+\\tan\\theta|)$ and $\\int\\sec\\theta\\,d\\theta=\\ln|\\sec\\theta+\\tan\\theta|$: the whole thing becomes $2\\sec\\theta\\tan\\theta-2\\ln|\\sec\\theta+\\tan\\theta|$.", why: "General rule: memorize both the sec integral and the sec$^3$ reduction outright — too slow to re-derive under exam pressure." },
    { tex: "Build the triangle from $x=2\\tan\\theta$ (opposite $x$, adjacent $2$, hypotenuse $\\sqrt{x^2+4}$): $\\tan\\theta=x/2$, $\\sec\\theta=\\sqrt{x^2+4}/2$.", why: "" },
    { tex: "Back-substitute: $2\\sec\\theta\\tan\\theta=\\dfrac{x\\sqrt{x^2+4}}{2}$, and $\\sec\\theta+\\tan\\theta=\\dfrac{\\sqrt{x^2+4}+x}{2}$, giving $\\dfrac{x\\sqrt{x^2+4}}{2}-2\\ln\\left(x+\\sqrt{x^2+4}\\right)+C$ (a constant $-2\\ln2$ is absorbed into $C$).", why: "" },
  ]},
  { id: "fe1b", tex: "\\int \\frac{\\sqrt{x^2-9}}{x}\\,dx", answer: "\\sqrt{x^2-9}-3\\sec^{-1}\\!\\left(\\dfrac{x}{3}\\right)+C", yt: "trigSub", steps: [
    { tex: "Let $x=3\\sec\\theta$, $dx=3\\sec\\theta\\tan\\theta\\,d\\theta$, and $\\sqrt{x^2-9}=3\\tan\\theta$.", why: "General rule: $\\sqrt{x^2-a^2}$ signals $x=a\\sec\\theta$, since $\\sec^2\\theta-1=\\tan^2\\theta$ clears the root." },
    { tex: "Substitute: $\\int\\dfrac{3\\tan\\theta}{3\\sec\\theta}\\cdot3\\sec\\theta\\tan\\theta\\,d\\theta = 3\\int\\tan^2\\theta\\,d\\theta$.", why: "" },
    { tex: "Rewrite $\\tan^2\\theta=\\sec^2\\theta-1$: $3\\int(\\sec^2\\theta-1)\\,d\\theta = 3\\tan\\theta-3\\theta+C$.", why: "" },
    { tex: "From the substitution, $\\sec\\theta=x/3$ so $\\theta=\\sec^{-1}(x/3)$, and the triangle (adjacent 3, opposite $\\sqrt{x^2-9}$, hyp $x$) gives $\\tan\\theta=\\sqrt{x^2-9}/3$.", why: "" },
    { tex: "So $3\\tan\\theta=\\sqrt{x^2-9}$, giving the final answer $\\sqrt{x^2-9}-3\\sec^{-1}\\!\\left(\\dfrac{x}{3}\\right)+C$.", why: "" },
  ]},
  { id: "fe1c", tex: "\\int \\frac{x^3}{(x^2+1)^2}\\,dx", answer: "\\dfrac12\\ln(x^2+1)+\\dfrac{1}{2(x^2+1)}+C", yt: "trigSub", steps: [
    { tex: "Let $u=x^2+1$, so $du=2x\\,dx$ and $x^2=u-1$.", why: "General rule: an odd power of $x$ next to $(x^2+1)^{\\text{power}}$ simplifies with $u=x^2+1$, saving one factor of $x$ for $du$." },
    { tex: "Rewrite $x^3\\,dx = x^2\\cdot x\\,dx = (u-1)\\cdot\\dfrac{du}{2}$.", why: "" },
    { tex: "$\\displaystyle\\int\\dfrac{u-1}{u^2}\\cdot\\dfrac{du}{2} = \\dfrac12\\int\\left(\\dfrac1u-\\dfrac1{u^2}\\right)du = \\dfrac12\\left[\\ln|u|+\\dfrac1u\\right]+C$", why: "" },
    { tex: "Back-substitute: $\\dfrac12\\ln(x^2+1)+\\dfrac{1}{2(x^2+1)}+C$", why: "" },
  ]},
  { id: "fe2a", tex: "\\int \\sin^4(x)\\cos^3(x)\\,dx", answer: "\\dfrac{\\sin^5x}{5}-\\dfrac{\\sin^7x}{7}+C", yt: "trigSub", steps: [
    { tex: "Cosine's power (3) is odd, so peel off one cosine and convert the rest with $\\cos^2x=1-\\sin^2x$: $\\sin^4x\\cos^2x\\cdot\\cos x = \\sin^4x(1-\\sin^2x)\\cos x$.", why: "General rule for $\\int\\sin^mx\\cos^nx\\,dx$: whichever power is ODD gets one factor peeled off for $du$; if both are even, use half-angle identities instead." },
    { tex: "Let $u=\\sin x$, $du=\\cos x\\,dx$: $\\int u^4(1-u^2)\\,du = \\int(u^4-u^6)\\,du$.", why: "" },
    { tex: "$=\\dfrac{u^5}{5}-\\dfrac{u^7}{7}+C = \\dfrac{\\sin^5x}{5}-\\dfrac{\\sin^7x}{7}+C$", why: "" },
  ]},
  { id: "fe2b", tex: "\\int \\tan^4(x)\\sec^3(x)\\,dx", answer: "\\dfrac{\\sec^5x\\tan x}{6}-\\dfrac{7\\sec^3x\\tan x}{24}+\\dfrac{\\sec x\\tan x}{16}+\\dfrac{1}{16}\\ln|\\sec x+\\tan x|+C", yt: "trigSub", steps: [
    { tex: "Tangent's power (4) is even and secant's power (3) is odd, so there's no direct substitution — convert everything to secant using $\\tan^2x=\\sec^2x-1$: $\\tan^4x\\sec^3x = (\\sec^2x-1)^2\\sec^3x = \\sec^7x-2\\sec^5x+\\sec^3x$.", why: "General rule: when tangent's power is even and secant's power is odd, expand fully into pure secant powers and use the sec reduction formula." },
    { tex: "Reduction formula: $\\int\\sec^nx\\,dx = \\dfrac{\\sec^{n-2}x\\tan x}{n-1}+\\dfrac{n-2}{n-1}\\int\\sec^{n-2}x\\,dx$, built on the base case $\\int\\sec^3x\\,dx=\\tfrac12(\\sec x\\tan x+\\ln|\\sec x+\\tan x|)$.", why: "General rule: memorize $\\int\\sec x\\,dx$ and $\\int\\sec^3x\\,dx$ outright — every higher odd power of secant reduces down to these two." },
    { tex: "Apply it twice: $\\int\\sec^5x\\,dx=\\dfrac{\\sec^3x\\tan x}{4}+\\dfrac34\\int\\sec^3x\\,dx$, then $\\int\\sec^7x\\,dx=\\dfrac{\\sec^5x\\tan x}{6}+\\dfrac56\\int\\sec^5x\\,dx$.", why: "" },
    { tex: "Combine $\\int\\sec^7x\\,dx-2\\int\\sec^5x\\,dx+\\int\\sec^3x\\,dx$ and collect like terms — the $\\sec^3x\\tan x$ coefficients combine to $-\\tfrac{7}{24}$ and the leftover $\\int\\sec^3x\\,dx$ coefficient combines to $\\tfrac18$.", why: "This is the most algebra-heavy step on the exam — write out each reduction fully rather than combining them mentally." },
    { tex: "Substituting the base case for the remaining $\\tfrac18\\int\\sec^3x\\,dx = \\tfrac1{16}\\sec x\\tan x+\\tfrac1{16}\\ln|\\sec x+\\tan x|$ gives the final answer: $\\dfrac{\\sec^5x\\tan x}{6}-\\dfrac{7\\sec^3x\\tan x}{24}+\\dfrac{\\sec x\\tan x}{16}+\\dfrac1{16}\\ln|\\sec x+\\tan x|+C$.", why: "" },
  ]},
  { id: "fe2c", tex: "\\int \\frac{\\cos(3x)}{\\sin(x)}\\,dx", answer: "\\ln|\\sin x|+\\cos(2x)+C", yt: "trigSub", steps: [
    { tex: "Use the triple-angle identity: $\\cos(3x)=4\\cos^3x-3\\cos x = \\cos x(4\\cos^2x-3)$.", why: "General rule: any integrand with $\\sin(3x)$, $\\cos(3x)$, or $\\cos(2x)$ alongside plain-angle trig functions should be rewritten with a multiple-angle identity first — always on the formula sheet." },
    { tex: "Use $\\cos^2x=1-\\sin^2x$: $4\\cos^2x-3 = 4(1-\\sin^2x)-3 = 1-4\\sin^2x$.", why: "" },
    { tex: "So $\\dfrac{\\cos(3x)}{\\sin x} = \\dfrac{\\cos x(1-4\\sin^2x)}{\\sin x} = \\cot x - 4\\sin x\\cos x = \\cot x-2\\sin(2x)$.", why: "General rule: once everything is in terms of $\\sin x$ and $\\cos x$, split the fraction into simpler pieces rather than integrating the combined expression directly." },
    { tex: "$\\int\\cot x\\,dx=\\ln|\\sin x|$, and $\\int2\\sin(2x)\\,dx=-\\cos(2x)$.", why: "" },
    { tex: "Answer: $\\ln|\\sin x|+\\cos(2x)+C$", why: "" },
  ]},
  { id: "fe3a", tex: "\\int x^2\\ln(x)\\,dx", answer: "\\dfrac{x^3}{3}\\ln x-\\dfrac{x^3}{9}+C", yt: "ibp", steps: [
    { tex: "IBP with $u=\\ln x$, $dv=x^2dx$ (log wins priority under LIPET): $du=\\dfrac{dx}{x}$, $v=\\dfrac{x^3}{3}$.", why: "" },
    { tex: "$\\dfrac{x^3}{3}\\ln x - \\displaystyle\\int\\dfrac{x^3}{3}\\cdot\\dfrac1x\\,dx = \\dfrac{x^3}{3}\\ln x-\\dfrac13\\int x^2\\,dx$", why: "" },
    { tex: "$=\\dfrac{x^3}{3}\\ln x-\\dfrac{x^3}{9}+C$", why: "" },
  ]},
  { id: "fe3b", tex: "\\int e^x\\cos(x)\\,dx", answer: "\\dfrac{e^x(\\cos x+\\sin x)}{2}+C", yt: "ibp", steps: [
    { tex: "Let $I=\\int e^x\\cos x\\,dx$. IBP with $u=\\cos x$, $dv=e^xdx$: $I=e^x\\cos x+\\int e^x\\sin x\\,dx$.", why: "General rule: $e^x$ times sin/cos is 'cyclic' under IBP — the same integral reappears after two rounds, so solve for it algebraically instead of integrating forever." },
    { tex: "IBP again on $\\int e^x\\sin x\\,dx$ with $u=\\sin x$, $dv=e^xdx$: $=e^x\\sin x-\\int e^x\\cos x\\,dx = e^x\\sin x-I$.", why: "" },
    { tex: "Substitute back: $I = e^x\\cos x+e^x\\sin x-I$, so $2I=e^x(\\cos x+\\sin x)$.", why: "General rule: once the original integral reappears on the right, treat the equation as ordinary algebra and solve for $I$." },
    { tex: "$I=\\dfrac{e^x(\\cos x+\\sin x)}{2}+C$", why: "" },
  ]},
  { id: "fe4a", tex: "\\int \\frac{3x+5}{x^2-4x-5}\\,dx", answer: "\\dfrac{10}{3}\\ln|x-5|-\\dfrac13\\ln|x+1|+C", yt: "partialFractions", steps: [
    { tex: "Factor the denominator: $x^2-4x-5=(x-5)(x+1)$.", why: "" },
    { tex: "Set up $\\dfrac{3x+5}{(x-5)(x+1)}=\\dfrac{A}{x-5}+\\dfrac{B}{x+1}$, so $3x+5=A(x+1)+B(x-5)$.", why: "" },
    { tex: "Plug $x=5$: $20=6A \\Rightarrow A=\\dfrac{10}{3}$. Plug $x=-1$: $2=-6B \\Rightarrow B=-\\dfrac13$.", why: "General rule: the cover-up method (plugging in each factor's root) is faster than expanding and matching coefficients for distinct linear factors." },
    { tex: "Integrate: $\\dfrac{10}{3}\\ln|x-5|-\\dfrac13\\ln|x+1|+C$", why: "" },
  ]},
  { id: "fe4b", tex: "\\int \\frac{x^2+2x+3}{(x-1)^2(x^2+4)}\\,dx", answer: "\\dfrac{8}{25}\\ln|x-1|-\\dfrac{6}{5(x-1)}-\\dfrac{4}{25}\\ln(x^2+4)-\\dfrac{13}{50}\\tan^{-1}\\!\\left(\\dfrac{x}{2}\\right)+C", yt: "partialFractions", steps: [
    { tex: "Set up the decomposition matching each factor: $\\dfrac{x^2+2x+3}{(x-1)^2(x^2+4)} = \\dfrac{A}{x-1}+\\dfrac{B}{(x-1)^2}+\\dfrac{Cx+D}{x^2+4}$.", why: "General rule: a repeated linear factor $(x-1)^2$ needs BOTH $\\tfrac{A}{x-1}$ and $\\tfrac{B}{(x-1)^2}$; an irreducible quadratic needs a linear numerator $Cx+D$, never just a constant." },
    { tex: "Plug $x=1$ into $x^2+2x+3=A(x-1)(x^2+4)+B(x^2+4)+(Cx+D)(x-1)^2$ to isolate $B$ instantly: $6=5B$, so $B=\\dfrac65$.", why: "General rule: plugging in the repeated root immediately isolates its numerator coefficient — always do this before expanding anything." },
    { tex: "Expand the rest and match coefficients of $x^3,x^2,x^1,x^0$ to build a system in $A,C,D$ (with $B$ already known); solving it gives $A=\\dfrac{8}{25}$, $C=-\\dfrac{8}{25}$, $D=-\\dfrac{13}{25}$.", why: "General rule: with more than 2 unknowns left, full expansion and coefficient-matching is the reliable fallback once cover-up runs out of easy substitutions." },
    { tex: "Integrate term by term: $A\\ln|x-1| - \\dfrac{B}{x-1} + \\dfrac{C}{2}\\ln(x^2+4) + \\dfrac{D}{2}\\tan^{-1}\\!\\left(\\dfrac{x}{2}\\right)$.", why: "General rule: split $\\tfrac{Cx+D}{x^2+4}$ into $\\tfrac{Cx}{x^2+4}$ (a u-sub giving a log) plus $\\tfrac{D}{x^2+4}$ (a direct arctangent)." },
    { tex: "Final answer: $\\dfrac{8}{25}\\ln|x-1| - \\dfrac{6}{5(x-1)} - \\dfrac{4}{25}\\ln(x^2+4) - \\dfrac{13}{50}\\tan^{-1}\\!\\left(\\dfrac{x}{2}\\right)+C$ — the hardest partial-fractions type on the final: a repeated linear factor combined with an irreducible quadratic.", why: "" },
  ]},
];

const HW2_TRIG_PARTIAL_FRACTIONS = [
  { id: "hw2-1", tex: "\\int \\sin^3(x)\\cos^2(x)\\,dx", answer: "\\tfrac{\\cos^5x}{5}-\\tfrac{\\cos^3x}{3}+C", yt: "trigSub", steps: [
    { tex: "Odd power of sine - peel off one $\\sin x$ to pair with $dx$: $\\sin^2x\\cos^2x\\cdot\\sin x\\,dx$.",
      why: "General rule for $\\int \\sin^m x\\cos^n x\\,dx$: if the power on sine is odd, save one sine factor for $du$ and convert the rest to cosines. If cosine's power is odd instead, mirror the move. If BOTH are even, use half-angle identities." },
    { tex: "Use $\\sin^2x=1-\\cos^2x$: integral becomes $\\int(1-\\cos^2x)\\cos^2x\\sin x\\,dx$.",
      why: "General rule: this Pythagorean identity converts the leftover even power of sine into cosines, since we're about to substitute $u=\\cos x$." },
    { tex: "Let $u=\\cos x$, $du=-\\sin x\\,dx$: $-\\int(1-u^2)u^2\\,du = -\\int(u^2-u^4)du$.",
      why: "General rule: once everything is in terms of $\\cos x$ and a lone $\\sin x\\,dx$, that piece is exactly $-du$ - why we saved it in step 1." },
    { tex: "$= -\\tfrac{u^3}{3}+\\tfrac{u^5}{5}+C = \\tfrac{\\cos^5x}{5}-\\tfrac{\\cos^3x}{3}+C$", why: "" },
  ]},
  { id: "hw2-2", tex: "\\int \\tan^4(x)\\,dx", answer: "\\tfrac{\\tan^3x}{3}-\\tan x+x+C", yt: "trigSub", steps: [
    { tex: "Split off $\\tan^2x$: $\\int \\tan^2x\\cdot\\tan^2x\\,dx = \\int\\tan^2x(\\sec^2x-1)dx$.",
      why: "General rule for pure powers of tangent: rewrite $\\tan^2x=\\sec^2x-1$ to isolate a $\\sec^2x$ factor, since $\\sec^2x\\,dx$ is a direct substitution ($d(\\tan x)$)." },
    { tex: "Distribute: $\\int\\tan^2x\\sec^2x\\,dx - \\int\\tan^2x\\,dx$.",
      why: "General rule: split into two integrals once one piece is directly substitutable and the other still needs the identity applied again." },
    { tex: "First piece: $u=\\tan x, du=\\sec^2x\\,dx \\Rightarrow \\int u^2du=\\tfrac{u^3}{3}=\\tfrac{\\tan^3x}{3}$. Second: $\\int(\\sec^2x-1)dx = \\tan x - x$.",
      why: "General rule: keep applying $\\tan^2x=\\sec^2x-1$ every time you're stuck with a bare power of tangent - it always reduces the power by 2." },
    { tex: "Combine: $\\tfrac{\\tan^3x}{3} - (\\tan x - x) + C = \\tfrac{\\tan^3x}{3}-\\tan x+x+C$", why: "" },
  ]},
  { id: "hw2-3", tex: "\\int \\frac{3x+5}{x^2-x-2}\\,dx", answer: "\\tfrac{11}{3}\\ln|x-2|-\\tfrac23\\ln|x+1|+C", yt: "partialFractions", steps: [
    { tex: "Factor the denominator: $x^2-x-2=(x-2)(x+1)$.",
      why: "General rule: partial fractions always starts with fully factoring the denominator - the factorization dictates the decomposition's form." },
    { tex: "Set up: $\\dfrac{3x+5}{(x-2)(x+1)} = \\dfrac{A}{x-2}+\\dfrac{B}{x+1}$.",
      why: "General rule: for each distinct LINEAR factor, one constant-numerator term. Multiply both sides by the denominator to clear fractions before solving." },
    { tex: "$3x+5=A(x+1)+B(x-2)$. At $x=2$: $11=3A\\Rightarrow A=\\tfrac{11}{3}$. At $x=-1$: $2=-3B\\Rightarrow B=-\\tfrac23$.",
      why: "General rule ('cover-up'/Heaviside trick): plug in the value of $x$ that zeroes out each factor one at a time - instantly isolates each unknown." },
    { tex: "Integrate: $\\tfrac{11}{3}\\ln|x-2| - \\tfrac23\\ln|x+1|+C$", why: "Double-check note: recompute cover-up values carefully - a sign slip here is the most common error in partial fractions." },
  ]},
];

const HW3_IMPROPER_SEQUENCES_SERIES = [
  { id: "hw3-364", tex: "\\int_1^{\\infty} \\frac{1}{x^2}\\,dx", answer: "1", yt: "improper", steps: [
    { tex: "Rewrite as a limit: $\\lim_{b\\to\\infty}\\int_1^b x^{-2}dx$.",
      why: "General rule: ANY integral with an infinite bound must be rewritten as a limit before you touch it." },
    { tex: "Antiderivative: $-x^{-1}$, so $\\lim_{b\\to\\infty}\\left[-\\tfrac1b+1\\right]$.",
      why: "General rule: as $b\\to\\infty$, any $\\tfrac{1}{b^p}$ with $p>0$ goes to $0$ - key fact behind most convergent improper integrals of this type." },
    { tex: "$= 0+1 = 1$ - converges to 1.", why: "This is the textbook example motivating the p-integral test: $\\int_1^\\infty x^{-p}dx$ converges exactly when $p>1$." },
  ]},
  { id: "hw3-403", tex: "\\int_0^1 \\frac{dx}{\\sqrt{x}}", answer: "2", yt: "improper", steps: [
    { tex: "The integrand blows up at $x=0$ (lower bound), not at infinity - still improper.",
      why: "General rule: improper integrals aren't only about infinite bounds - a bound where the function is undefined/unbounded also counts. Always check the integrand, not just the limits." },
    { tex: "Rewrite: $\\lim_{t\\to0^+}\\int_t^1 x^{-1/2}dx = \\lim_{t\\to0^+}\\left[2x^{1/2}\\right]_t^1$.",
      why: "General rule: for a singularity at the LOWER bound, replace it with a variable $t$ approaching from the correct side." },
    { tex: "$=\\lim_{t\\to0^+}\\left[2-2\\sqrt t\\right] = 2-0=2$", why: "Converges - even though the function shoots to infinity at $x=0$, the area is still finite, the classic surprising result motivating this topic." },
  ]},
  { id: "hw3-seq1", tex: "a_n = \\frac{\\ln n}{n}", answer: "0", yt: "sequences", steps: [
    { tex: "Direct substitution gives $\\infty/\\infty$ - indeterminate.",
      why: "General rule: always check the form BEFORE reaching for L'Hopital's Rule. Only $0/0$ or $\\infty/\\infty$ qualify." },
    { tex: "Treat $n$ as a continuous variable $x$ and apply L'Hopital: $\\lim \\dfrac{\\ln x}{x} = \\lim\\dfrac{1/x}{1} = \\lim\\dfrac1x$.",
      why: "General rule: L'Hopital's Rule only applies to functions of a continuous variable - rewrite $n$ as $x$ first, then the sequence limit equals the function limit." },
    { tex: "$=0$ - the sequence converges to $0$.", why: "General pattern: $\\ln n$ grows slower than ANY positive power of $n$, so $\\ln n/n^p \\to 0$ for any $p>0$." },
  ]},
  { id: "hw3-ser1", tex: "\\sum_{n=1}^{\\infty} \\left(\\frac{2}{3}\\right)^n", answer: "2", yt: "sequences", steps: [
    { tex: "Identify as geometric with first term $a=\\tfrac23$ (at $n=1$) and ratio $r=\\tfrac23$.",
      why: "General rule: any series of the form $\\sum ar^{n}$ or $\\sum ar^{n-1}$ is geometric - always identify $a$ (the actual first term at whatever index it starts) and $r$ first." },
    { tex: "Since $|r|=\\tfrac23<1$, it converges to $\\dfrac{a}{1-r}$.",
      why: "General rule: a geometric series converges iff $|r|<1$ - the fastest series classification you'll do all semester." },
    { tex: "$= \\dfrac{2/3}{1-2/3} = \\dfrac{2/3}{1/3} = 2$", why: "" },
  ]},
];

const HW4_SERIES_TESTS = [
  { id: "hw4-comp1", tex: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2+3}", answer: "\\text{Converges}", yt: "integralTest", steps: [
    { tex: "Compare to $\\sum \\tfrac{1}{n^2}$: since $n^2+3 > n^2$, we have $\\tfrac{1}{n^2+3} < \\tfrac{1}{n^2}$ for all $n\\geq1$.",
      why: "General rule for Direct Comparison: find a simpler series that's always bigger (to prove convergence) or always smaller (to prove divergence) - usually by dropping/adding a lower-order term." },
    { tex: "$\\sum \\tfrac1{n^2}$ is a p-series with $p=2>1$, so it converges.",
      why: "General rule: memorize the p-series test cold - $\\sum 1/n^p$ converges iff $p>1$. The most common comparison benchmark this unit." },
    { tex: "Since the given series is term-by-term smaller than a convergent series, it converges too (Direct Comparison Test).",
      why: "General rule: smaller-than-convergent converges, bigger-than-divergent diverges. Wrong-direction comparisons prove nothing - always check the inequality direction." },
  ]},
  { id: "hw4-alt1", tex: "\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n^2}", answer: "\\text{Converges (absolutely)}", yt: "alternating", steps: [
    { tex: "Check the Alternating Series Test: $b_n=\\tfrac{1}{n^2}$ is decreasing and $\\lim b_n=0$ - both conditions hold, so it converges.",
      why: "General rule: the Alternating Series Test needs BOTH conditions - decreasing terms AND limit zero. Missing either means the test doesn't apply." },
    { tex: "Check absolute convergence: $\\sum\\left|\\tfrac{(-1)^{n+1}}{n^2}\\right| = \\sum\\tfrac1{n^2}$, a p-series with $p=2>1$ - converges.",
      why: "General rule: after an alternating series converges, always also check absolute convergence (drop the sign, test again) - this distinction gets tested directly." },
    { tex: "Since the series of absolute values converges, the original series converges absolutely (the stronger classification).",
      why: "General rule: absolute convergence always implies regular convergence, but not the reverse - so it's the 'best' classification when it holds." },
  ]},
  { id: "hw4-ratio1", tex: "\\sum_{n=1}^{\\infty} \\frac{n!}{n^n}", answer: "\\text{Converges (Ratio Test)}", yt: "ratioRoot", steps: [
    { tex: "Set up $L=\\lim_{n\\to\\infty}\\left|\\dfrac{a_{n+1}}{a_n}\\right| = \\lim \\dfrac{(n+1)!}{(n+1)^{n+1}}\\cdot\\dfrac{n^n}{n!}$.",
      why: "General rule: reach for the Ratio Test whenever you see factorials - $(n+1)!/n! = n+1$ collapses cleanly, which factorials rarely do any other way." },
    { tex: "Simplify: $\\dfrac{(n+1)!}{n!}=n+1$, so $L=\\lim \\dfrac{(n+1)\\cdot n^n}{(n+1)^{n+1}} = \\lim \\left(\\dfrac{n}{n+1}\\right)^n$.",
      why: "General rule: after the factorial cancels, you're often left with a limit of the form $(1-\\tfrac1{n+1})^n$-ish - a definition-of-$e$ pattern in disguise." },
    { tex: "$\\left(\\dfrac{n}{n+1}\\right)^n = \\left(1-\\dfrac{1}{n+1}\\right)^n \\to e^{-1} = \\dfrac1e$.",
      why: "General rule to memorize: $\\left(1+\\tfrac{c}{n}\\right)^n \\to e^{c}$ as $n\\to\\infty$ - recognizing this instantly resolves a whole family of ratio-test limits." },
    { tex: "$L=\\tfrac1e < 1$, so by the Ratio Test the series converges.", why: "General rule: Ratio Test verdict - $L<1$ converges, $L>1$ diverges, $L=1$ inconclusive (try a different test)." },
  ]},
];

const PRACTICE_SETS = [
  { id: "hw1-17", label: "HW1 - Section 1.7", minutes: 25, topics: "Inverse Trig Integrals", solved: true, problems: HW1_SECTION_1_7 },
  { id: "hw2-36", label: "HW2 - Trig Integrals & Partial Fractions (representative)", minutes: 30, topics: "Sections 3.1-3.6 - representative problems, not yet matched to your exact answer key numbers", solved: "partial", problems: HW2_TRIG_PARTIAL_FRACTIONS },
  { id: "hw3-3-7", label: "HW3 - Section 3.7", minutes: 20, topics: "Improper Integrals - problems 364, 372, 373, 403", solved: true, problems: HW_3_7 },
  { id: "hw3-5-1", label: "HW3 - Section 5.1", minutes: 25, topics: "Sequences - problems 8, 10, 18, 26, 29, 30, 34, 38, 41, 42", solved: true, problems: HW_5_1 },
  { id: "hw3-5-2", label: "HW3 - Section 5.2", minutes: 25, topics: "Infinite Series - problems 68, 70, 71, 76, 78, 81, 82, 86, 90, 91", solved: true, problems: HW_5_2 },
  { id: "hw4-140", label: "HW4 - Series Convergence Tests (representative)", minutes: 30, topics: "5.2-5.5 - Comparison, Alternating, and Ratio Tests, representative problems", solved: "partial", problems: HW4_SERIES_TESTS },
  { id: "quiz1", label: "Quiz 1", minutes: 30, topics: "Inverse Trig Integrals & IBP", solved: true, problems: [
    { id: "q1-1", tex: "\\int \\frac{\\sin^{-1}(t)}{\\sqrt{1-t^2}}\\,dt", answer: "\\tfrac{(\\sin^{-1}t)^2}{2}+C", yt: "invTrig", steps: [
      { tex: "Let $u=\\sin^{-1}(t)$, $du=\\frac{dt}{\\sqrt{1-t^2}}$ - exactly the rest of the integrand.",
        why: "General rule: an inverse trig function multiplied by exactly its own derivative is always a $u$-substitution - set $u$ equal to the inverse trig piece." },
      { tex: "$\\int u\\,du = \\tfrac{u^2}{2}+C$", why: "General rule: after a good substitution you should be left with a simple power-rule integral - if it's still messy, the substitution was probably wrong." },
      { tex: "Back-substitute: $\\dfrac{(\\sin^{-1}t)^2}{2}+C$", why: "" },
    ]},
    { id: "q1-2", tex: "\\int \\frac{dt}{t\\sqrt{1-(\\ln t)^2}}", answer: "\\sin^{-1}(\\ln t)+C", yt: "invTrig", steps: [
      { tex: "Let $u=\\ln(t)$, $du=\\frac{dt}{t}$.", why: "Same pattern as HW1 #425 - a lone $\\frac1t$ next to a buried $\\ln t$ is always a substitution cue." },
      { tex: "$\\int \\frac{du}{\\sqrt{1-u^2}} = \\sin^{-1}(u)+C$", why: "" },
      { tex: "Back-substitute: $\\sin^{-1}(\\ln t)+C$", why: "" },
    ]},
    { id: "q1-3", tex: "\\int_0^{1/2} \\frac{\\sin(\\tan^{-1}t)}{1+t^2}\\,dt", answer: "1-\\tfrac{2}{\\sqrt5}", yt: "invTrigIntegrals", steps: [
      { tex: "Let $u=\\tan^{-1}(t)$, $du=\\frac{dt}{1+t^2}$.", why: "Identical setup to HW1 #431 - same type, different numbers." },
      { tex: "$\\int\\sin(u)\\,du = -\\cos(u)+C$, evaluated $t=0\\to\\tfrac12$.", why: "" },
      { tex: "$\\tan^{-1}(1/2)$: opposite 1, adjacent 2, hyp $\\sqrt5$ so $\\cos=\\tfrac{2}{\\sqrt5}$; at $t=0$, $\\cos(0)=1$.", why: "Right-triangle trick again - build the habit for any 'trig of inverse-trig' expression." },
      { tex: "Result: $1-\\dfrac{2}{\\sqrt5}$", why: "" },
    ]},
    { id: "q1-4", tex: "\\int x^2 e^x\\,dx", answer: "e^x(x^2-2x+2)+C", yt: "ibp", steps: [
      { tex: "$u=x^2, dv=e^xdx \\Rightarrow du=2x\\,dx, v=e^x$. First pass: $x^2e^x-\\int 2xe^x dx$.",
        why: "General rule (LIPET): when choosing $u$ for IBP, prefer Logs, Inverse trig, Polynomials, Exponentials, Trig - earlier in that order wins." },
      { tex: "IBP again on $\\int 2xe^xdx$: $u=2x,dv=e^xdx \\Rightarrow 2xe^x-\\int 2e^xdx = 2xe^x-2e^x$.",
        why: "General rule: when IBP leaves another 'polynomial times exponential' with a LOWER power, repeat IBP - the power drops by one each pass." },
      { tex: "Combine: $x^2e^x-2xe^x+2e^x+C = e^x(x^2-2x+2)+C$", why: "" },
    ]},
    { id: "q1-5", tex: "\\int \\tan^{-1}(x)\\,dx", answer: "x\\tan^{-1}(x)-\\tfrac12\\ln(1+x^2)+C", yt: "ibp", steps: [
      { tex: "$u=\\tan^{-1}x, dv=dx \\Rightarrow du=\\frac{dx}{1+x^2}, v=x$.",
        why: "General rule: integrating a single inverse trig or log function with nothing multiplied in - treat it as $u\\cdot1$, let $dv=dx$ so $v=x$." },
      { tex: "IBP: $x\\tan^{-1}x - \\int \\frac{x}{1+x^2}dx$.", why: "" },
      { tex: "Remaining is $u$-sub ($u=1+x^2$): $\\tfrac12\\ln(1+x^2)$.", why: "General rule: check for a simple substitution after IBP before reaching for a second IBP." },
      { tex: "Final: $x\\tan^{-1}(x)-\\tfrac12\\ln(1+x^2)+C$", why: "" },
    ]},
  ]},
  { id: "quiz2", label: "Quiz 2", minutes: 30, topics: "Improper Integrals & Sequences/Series", solved: true, problems: [
    { id: "q2-1", tex: "\\int_0^2 \\frac{dx}{(2-x)^{2/3}}", answer: "3\\sqrt[3]{2}", yt: "improper", steps: [
      { tex: "Singularity at $x=2$ - improper. Sub $u=2-x$: $-\\int u^{-2/3}du=-3u^{1/3}+C$.",
        why: "General rule: scan BOTH bounds and the interior for values that make the integrand undefined before evaluating." },
      { tex: "As a limit: $\\lim_{t\\to2^-}\\left[-3(2-t)^{1/3}+3\\cdot2^{1/3}\\right]$.", why: "Approaching from the left since the domain only exists for $x<2$ here." },
      { tex: "$(2-t)^{1/3}\\to0$, leaving $3\\cdot2^{1/3}=3\\sqrt[3]2$.", why: "" },
    ]},
    { id: "q2-2", tex: "\\int_0^{\\infty} e^{-3x}\\,dx", answer: "1/3", yt: "improper", steps: [
      { tex: "$\\lim_{b\\to\\infty}\\int_0^b e^{-3x}dx$, antiderivative $-\\tfrac{e^{-3x}}{3}$.", why: "" },
      { tex: "$\\lim_{b\\to\\infty}\\left[-\\tfrac{e^{-3b}}{3}+\\tfrac13\\right] = 0+\\tfrac13$",
        why: "General rule to memorize: $e^{-kx}\\to0$ as $x\\to\\infty$ for any $k>0$." },
    ]},
    { id: "q2-3", tex: "a_n=\\frac{n}{\\sqrt{n^2+5}}", answer: "1", yt: "sequences", steps: [
      { tex: "Divide by $n$: $\\dfrac{1}{\\sqrt{1+5/n^2}}$.",
        why: "General rule: divide numerator and denominator by the HIGHEST power of $n$ present - here $n$, since $\\sqrt{n^2}$ behaves like $n$." },
      { tex: "As $n\\to\\infty$, $5/n^2\\to0$, so the limit is $1$.", why: "" },
    ]},
    { id: "q2-4", tex: "b_n=\\left(1+\\frac1n\\right)^n", answer: "e", yt: "sequences", steps: [
      { tex: "Classic definition-of-$e$ limit form.", why: "General rule: memorize $\\left(1+\\tfrac1n\\right)^n\\to e$ by sight - it shows up constantly, disguised." },
      { tex: "$\\lim_{n\\to\\infty}(1+1/n)^n = e \\approx 2.71828$", why: "" },
    ]},
  ]},
  { id: "quiz3", label: "Quiz 3", minutes: 30, topics: "Integral, Comparison & Alternating Series Tests", solved: false, problems: [] },
  { id: "quiz4", label: "Quiz 4", minutes: 30, topics: "Power Series, Taylor Series & Estimation", solved: false, problems: [] },
  { id: "exam1", label: "Exam 1", minutes: 60, topics: "Inverse Trig, Trig Integrals, IBP, Partial Fractions", solved: "partial", problems: [
    { id: "e1-2c", tex: "\\int \\frac{\\sin(3x)}{1+\\cos^2(x)}\\,dx", answer: "-4\\cos x+5\\tan^{-1}(\\cos x)+C", yt: "trigSub", steps: [
      { tex: "Rewrite $\\sin(3x)=3\\sin x-4\\sin^3x=\\sin x(4\\cos^2x-1)$.",
        why: "General rule: multiple angles like $\\sin(3x)$/$\\cos(2x)$ with everything else in plain $x$ get converted with the multiple-angle identity FIRST." },
      { tex: "Sub $u=\\cos x$, $du=-\\sin x\\,dx$: $-\\int\\frac{4u^2-1}{1+u^2}du$.", why: "General rule: same move as HW2's odd-power problems - everything in $\\cos x$ plus a lone $\\sin x\\,dx$ means substitute $u=\\cos x$." },
      { tex: "Polynomial-divide: $\\frac{4u^2-1}{1+u^2}=4-\\frac{5}{1+u^2}$.",
        why: "General rule: when numerator degree is greater than or equal to denominator degree in a rational integrand, do polynomial long division FIRST." },
      { tex: "Integrate: $-4u+5\\tan^{-1}(u)+C = -4\\cos x+5\\tan^{-1}(\\cos x)+C$", why: "" },
    ]},
    { id: "e1-3c", tex: "\\int xe^x\\cos(x)\\,dx", answer: "\\tfrac{e^x}{2}[x\\cos x+(x-1)\\sin x]+C", yt: "ibp", steps: [
      { tex: "Known cyclic results: $\\int e^x\\cos x\\,dx=\\tfrac{e^x}2(\\cos x+\\sin x)$, $\\int e^x\\sin x\\,dx=\\tfrac{e^x}2(\\sin x-\\cos x)$.",
        why: "General rule: $\\int e^{ax}\\cos(bx)dx$/$\\sin(bx)dx$ are 'cyclic' - two IBP rounds return the original integral, solve algebraically. Worth memorizing outright." },
      { tex: "IBP with $u=x, dv=e^x\\cos x\\,dx$: $\\tfrac{xe^x}2(\\cos x+\\sin x) - \\int\\tfrac{e^x}2(\\cos x+\\sin x)dx$.",
        why: "General rule: when a polynomial multiplies a cyclic e-trig product, treat the cyclic result as your 'v' and do ONE more IBP with $u=$ the polynomial." },
      { tex: "The remaining integral simplifies to $\\tfrac{e^x}2\\sin x$ using the known results.", why: "" },
      { tex: "Final: $\\tfrac{e^x}{2}[x\\cos x+(x-1)\\sin x]+C$", why: "" },
    ]},
  ]},
  { id: "exam2", label: "Exam 2 (reference)", minutes: 60, topics: "Sequences, Series, Convergence Tests, Power Series - practice bank, not an exam Noah has taken", solved: false, problems: [] },
];

const ALL_PROBLEMS = [
  ...HW_3_7.map((p) => ({ id: p.id, kind: "practice", label: `HW3 §3.7 #${p.id}`, ref: p })),
  ...HW_5_1.map((p) => ({ id: p.id, kind: "practice", label: `HW3 §5.1 #${p.id}`, ref: p })),
  ...HW_5_3.map((p) => ({ id: p.id, kind: "practice", label: "Session 4 - §5.3", ref: p })),
  ...HW_5_4_5_5.map((p) => ({ id: p.id, kind: "practice", label: "Session 5 - §5.4-5.5", ref: p })),
  ...HW_5_6.map((p) => ({ id: p.id, kind: "practice", label: "Session 6 - §5.6", ref: p })),
  ...HW_6_1.map((p) => ({ id: p.id, kind: "practice", label: "Session 7 - §6.1", ref: p })),
  ...HW_6_2_6_3.map((p) => ({ id: p.id, kind: "practice", label: "Session 8 - §6.2-6.3", ref: p })),
  ...HW_6_4.map((p) => ({ id: p.id, kind: "practice", label: "Session 9 - §6.4", ref: p })),
  ...HW_7_1_7_3.map((p) => ({ id: p.id, kind: "practice", label: "Session 10 - §7.1-7.3", ref: p })),
  ...HW_7_4.map((p) => ({ id: p.id, kind: "practice", label: "Session 11 - §7.4", ref: p })),
  ...HW_FINAL_REVIEW.map((p) => ({ id: p.id, kind: "practice", label: "Session 12 - Comprehensive Review", ref: p })),
  ...PRACTICE_SETS.flatMap((set) =>
    set.problems.map((p) => ({ id: p.id, kind: "practice", label: set.label, setId: set.id, ref: p }))
  ),
];

const YT = {
  invTrig: { id: "ST3ORfqVYQw", title: "Calculus of Inverse Trigonometric Functions - Professor Leonard" },
  invTrigIntegrals: { id: "SYYbQODGTUw", title: "Integration Involving Inverse Trig Functions - Part 3" },
  ibp: { id: "EOwjiFpDY_s", title: "Integration By Parts - Professor Leonard" },
  partialFractions: { id: "KJGp0pyPoVo", title: "Integration By Partial Fractions - Professor Leonard" },
  improper: { id: "g-M8FHslgdk", title: "Improper Integrals - Professor Leonard" },
  trigSub: { id: "q6JwTGpG8b4", title: "Integrals By Trigonometric Substitution - Professor Leonard" },
  sequences: { id: "FoNLQvf4NUs", title: "Convergence and Divergence of Sequences - Professor Leonard" },
  integralTest: { id: "8jPpNK4GIVs", title: "Integral Test for Convergence/Divergence, P-Series - Professor Leonard" },
  alternating: { id: "BhYPrQHDrjk", title: "Alternating Series Test, Error of Sums - Professor Leonard" },
  ratioRoot: { id: "g4iZJOwMkjU", title: "Absolute Convergence, Ratio Test and Root Test - Professor Leonard" },
  powerSeries: { id: "TGD-TP1c7i4", title: "Power Series, Ratio Test for Interval of Convergence - Professor Leonard" },
  polarArea: { id: "Kh265EC11OI", title: "Calculus of Polar Equations - Area - Professor Leonard" },
  polarCoords: { id: "sWUyFQQ5QeI", title: "Using Polar Coordinates and Polar Equations - Professor Leonard" },
};

function ClarifyModal({ open, onClose, video, searchQuery }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const copyPrompt = () => {
    navigator.clipboard?.writeText(searchQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-[fadein_.2s_ease]" style={{ background: "rgba(8,20,15,0.75)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-xl overflow-hidden animate-[popin_.28s_cubic-bezier(.2,.9,.25,1.15)]" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.55)" }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${T.chalkFaint}` }}>
          <div className="flex items-center gap-2" style={{ color: T.chalk }}>
            <Lightbulb size={16} style={{ color: T.amber }} />
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 16 }}>Need more clarification?</span>
          </div>
          <button onClick={onClose} style={{ color: T.chalkDim }}><X size={18} /></button>
        </div>
        {video ? (
          <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${video.id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-sm" style={{ color: T.chalkDim }}>
            No pinned video for this one yet - search below and Noah can pick the explanation that clicks best.
          </div>
        )}
        <div className="p-4">
          {video && <div style={{ color: T.chalk, fontSize: 13, marginBottom: 12 }}>{video.title}</div>}
          <div className="flex gap-2 flex-wrap">
            <ChalkButton variant="primary" icon={copied ? CheckCircle2 : Copy} onClick={copyPrompt}>
              {copied ? "Copied!" : "Copy YouTube search"}
            </ChalkButton>
            <ChalkButton
              variant="ghost"
              icon={ArrowRight}
              onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, "_blank")}
            >
              Search on YouTube himself
            </ChalkButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClarifyButton({ video, searchQuery, label = "Need more clarification?" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChalkButton variant="blue" icon={Lightbulb} onClick={() => setOpen(true)}>{label}</ChalkButton>
      <ClarifyModal open={open} onClose={() => setOpen(false)} video={video} searchQuery={searchQuery} />
    </>
  );
}

function ChalkButton({ children, onClick, variant = "primary", icon: Icon, className = "", ...rest }) {
  const styles = {
    primary: { background: T.amber, color: "var(--on-primary)" },
    ghost: { background: "transparent", color: T.chalkDim, border: `1px solid ${T.chalkFaint}` },
    blue: { background: T.blueDim, color: T.blue, border: `1px solid rgba(134,185,196,0.5)` },
    coral: { background: T.coralDim, color: T.coral, border: `1px solid rgba(221,120,98,0.5)` },
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:translate-y-0 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{ ...styles[variant], ["--tw-ring-color"]: T.amber }}
      {...rest}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Chip({ children, tone = "default" }) {
  const tones = {
    default: { color: T.chalkDim, border: T.chalkFaint },
    amber: { color: T.amber, border: "rgba(232,196,104,0.4)" },
    blue: { color: T.blue, border: "rgba(134,185,196,0.4)" },
    coral: { color: T.coral, border: "rgba(221,120,98,0.4)" },
  };
  const s = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono"
      style={{ color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, ...style }}
    >
      {children}
    </div>
  );
}

const pendingWrites = new Map();
let syncListeners = [];
function notifySync(status) {
  syncListeners.forEach((fn) => fn(status));
}
function subscribeSync(fn) {
  syncListeners.push(fn);
  return () => { syncListeners = syncListeners.filter((f) => f !== fn); };
}

async function loadState(key, fallback) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tutor_state?id=eq.${encodeURIComponent(`${STUDENT}:${key}`)}&select=payload`,
      { headers: SB_HEADERS }
    );
    if (!res.ok) return fallback;
    const rows = await res.json();
    if (rows && rows[0] && rows[0].payload !== undefined) return rows[0].payload;
  } catch (e) {}
  return fallback;
}

async function attemptSave(key, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tutor_state`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ id: `${STUDENT}:${key}`, payload: value, updated_at: new Date().toISOString() }]),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
}

let retryTimer = null;
function scheduleRetry(delay = 4000) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(flushPendingWrites, delay);
}
async function flushPendingWrites() {
  if (pendingWrites.size === 0) return;
  notifySync("syncing");
  const entries = Array.from(pendingWrites.entries());
  let anyFailed = false;
  for (const [key, value] of entries) {
    try {
      await attemptSave(key, value);
      if (pendingWrites.get(key) === value) pendingWrites.delete(key);
    } catch {
      anyFailed = true;
    }
  }
  if (anyFailed) {
    notifySync("offline");
    scheduleRetry(8000);
  } else {
    notifySync("saved");
  }
}
async function saveState(key, value) {
  pendingWrites.set(key, value);
  notifySync("syncing");
  try {
    await attemptSave(key, value);
    if (pendingWrites.get(key) === value) pendingWrites.delete(key);
    notifySync(pendingWrites.size === 0 ? "saved" : "syncing");
  } catch {
    notifySync("offline");
    scheduleRetry(4000);
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => flushPendingWrites());
}

/* ============================================================
   BACKUPS — nothing here should ever be the only copy of
   Noah's progress. Three layers:
   1. Every save already goes to Supabase (tutor_state table).
   2. Once per calendar day, the app snapshots the FULL current
      state into a separate dated row (id: "Noah:backup:YYYY-MM-DD"),
      so even a bad overwrite on the "live" keys is recoverable.
   3. A manual "Download backup now" button in Settings exports
      everything as a real JSON file to the user's own machine,
      and "Restore from backup file" reads one back in.
============================================================ */
const BACKUP_KEYS = [
  "current-session-id", "mastery", "session-log", "hw-state", "theme",
  "font-size", "font-family", "explored-sessions", "check-ins",
  "tutor-note", "student-note", "flash-boxes",
];

async function fetchAllStudentRows() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tutor_state?id=like.${encodeURIComponent(`${STUDENT}:*`)}&select=id,payload,updated_at`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

async function runDailySnapshotIfNeeded() {
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastBackupDate = await loadState("last-backup-date", null);
  if (lastBackupDate === todayKey) return; // already backed up today
  try {
    const rows = await fetchAllStudentRows();
    const snapshot = {};
    rows.forEach((r) => {
      const shortKey = r.id.replace(`${STUDENT}:`, "");
      if (!shortKey.startsWith("backup:")) snapshot[shortKey] = r.payload;
    });
    await attemptSave(`backup:${todayKey}`, snapshot);
    await attemptSave("last-backup-date", todayKey);
  } catch (e) {
    // Non-fatal — the retry queue on regular saves is the real safety net;
    // this daily snapshot is a bonus layer, so fail quietly and try again
    // next time the app loads.
  }
}

async function downloadBackupNow() {
  const rows = await fetchAllStudentRows();
  const [msgRes, subRes] = await Promise.all([
    supabase.from("tutor_messages").select("*").order("created_at", { ascending: true }),
    fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=role,updated_at`, { headers: SB_HEADERS }).then((r) => (r.ok ? r.json() : [])),
  ]);
  const snapshot = { exportedAt: new Date().toISOString(), student: STUDENT, data: {}, messages: msgRes.data || [], pushSubscriptionRoles: (subRes || []).map((s) => s.role) };
  rows.forEach((r) => {
    snapshot.data[r.id.replace(`${STUDENT}:`, "")] = r.payload;
  });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-tutor-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function restoreFromBackupFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed; // tolerate a raw {key:value} export too
  const entries = Object.entries(data).filter(([k]) => !k.startsWith("backup:") && k !== "last-backup-date");
  for (const [key, value] of entries) {
    await saveState(key, value);
  }
  return entries.length;
}

function BackupSection() {
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const doDownload = async () => {
    setStatus("working");
    setMessage("");
    try {
      await downloadBackupNow();
      setStatus("done");
      setMessage("Backup file downloaded.");
    } catch (e) {
      setStatus("error");
      setMessage("Couldn't reach the database — check your connection and try again.");
    }
  };

  const doRestore = async (file) => {
    if (!file) return;
    setStatus("working");
    setMessage("");
    try {
      const count = await restoreFromBackupFile(file);
      setStatus("done");
      setMessage(`Restored ${count} item${count === 1 ? "" : "s"} — refresh the page to see them.`);
    } catch (e) {
      setStatus("error");
      setMessage("That file didn't look like a valid backup — nothing was changed.");
    }
  };

  return (
    <div className="mb-6">
      <div className="text-sm font-semibold mb-2" style={{ color: T.chalk }}>Backups</div>
      <p style={{ color: T.chalkDim, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
        The app automatically snapshots everything once a day in the database. You can also pull a copy down to your own computer any time, or restore from one.
      </p>
      <div className="flex gap-2 flex-wrap">
        <ChalkButton variant="primary" icon={Download} onClick={doDownload} disabled={status === "working"}>
          {status === "working" ? "Working..." : "Download backup now"}
        </ChalkButton>
        <ChalkButton variant="ghost" icon={FileText} onClick={() => fileRef.current?.click()} disabled={status === "working"}>
          Restore from backup file
        </ChalkButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => doRestore(e.target.files?.[0])}
        />
      </div>
      {message && (
        <p className="mt-2 text-xs" style={{ color: status === "error" ? T.coral : T.blue }}>{message}</p>
      )}
    </div>
  );
}

function SyncIndicator() {
  const [status, setStatus] = useState("saved");
  useEffect(() => subscribeSync(setStatus), []);
  const map = {
    saved: { label: "Synced", color: T.chalkDim, dot: T.amber },
    syncing: { label: "Saving...", color: T.chalkDim, dot: T.blue },
    offline: { label: "Offline - will retry", color: T.coral, dot: T.coral },
  };
  const m = map[status];
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2" style={{ color: m.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot, animation: status === "syncing" ? "pulseDot 1s ease-in-out infinite" : "none" }} />
      {m.label}
    </div>
  );
}

function buildAIPrompt(problem) {
  return `I'm working through Calc 2 (Sequences, section 5.1) and I'm stuck on this problem:\n\n"${problem.prompt}"\n\nHere's the step-by-step approach I've been given so far:\n${problem.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}\n\nCan you walk me through this in more detail, and check my understanding as I work through it?`;
}

function AskAIButton({ problem }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    const text = buildAIPrompt(problem);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      });
    }
  };
  return (
    <ChalkButton variant="blue" icon={copied ? CheckCircle2 : MessageCircleQuestion} onClick={handleClick}>
      {copied ? "Prompt copied - paste into Claude" : "Ask AI for more detail"}
    </ChalkButton>
  );
}

function FormulaChip({ id, onOpen }) {
  const f = FORMULAS.find((x) => x.id === id);
  if (!f) return null;
  return (
    <button
      onClick={() => onOpen(f)}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition-colors"
      style={{ background: T.blueDim, color: T.blue, border: "1px solid rgba(134,185,196,0.35)" }}
    >
      <BookMarked size={12} /> {f.name}
    </button>
  );
}

function FormulaModal({ formula, onClose }) {
  if (!formula) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(8,20,15,0.7)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl p-6"
        style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-start justify-between mb-3">
          <Chip tone="blue">{CATEGORIES[formula.cat]}</Chip>
          <button onClick={onClose} style={{ color: T.chalkDim }}><X size={18} /></button>
        </div>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, marginBottom: 12, color: T.chalk }}>{formula.name}</h3>
        <div
          className="rounded-lg px-4 py-3 mb-4"
          style={{ background: T.bgDeep, color: T.amber, border: `1px solid ${T.chalkFaint}` }}
        >
          <Math_ tex={formula.formula} block style={{ margin: 0, color: T.amber }} />
        </div>
        <div className="space-y-3 text-sm" style={{ color: T.chalkDim }}>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: T.blue }}>Why this formula</div>
            <Math_ tex={formula.why} block style={{ margin: 0, color: T.chalk, fontSize: 14 }} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: T.blue }}>When to reach for it</div>
            <Math_ tex={formula.when} block style={{ margin: 0, color: T.chalk, fontSize: 14 }} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: T.blue }}>Example</div>
            <Math_ tex={formula.example} block style={{ margin: 0, color: T.chalk, fontSize: 14 }} />
          </div>
        </div>
        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.chalkFaint}` }}>
          <ClarifyButton
            video={formula.yt ? YT[formula.yt] : null}
            searchQuery={`${formula.name} explained example calculus`}
          />
        </div>
      </div>
    </div>
  );
}

function FormulaSheetView({ onOpenFormula }) {
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...Object.keys(CATEGORIES)];
  const list = filter === "All" ? FORMULAS : FORMULAS.filter((f) => f.cat === filter);

  return (
    <div className="animate-[fadein_.3s_ease]">
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, marginBottom: 6, color: T.chalk }}>Formula Reference</h2>
      <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 20 }}>
        Every formula the course uses - what it's for, when to reach for it, and a worked example. Click any card for the full breakdown.
      </p>
      <div className="flex gap-2 flex-wrap mb-6">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={
              filter === c
                ? { background: T.amber, color: "var(--on-primary)" }
                : { background: "transparent", color: T.chalkDim, border: `1px solid ${T.chalkFaint}` }
            }
          >
            {c === "All" ? "All" : CATEGORIES[c]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((f) => (
          <button
            key={f.id}
            onClick={() => onOpenFormula(f)}
            className="text-left rounded-xl p-4 transition-transform hover:-translate-y-0.5"
            style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <Chip tone="blue">{CATEGORIES[f.cat]}</Chip>
              <ChevronRight size={14} style={{ color: T.chalkDim }} />
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: T.chalk, marginBottom: 4 }}>{f.name}</div>
            <Math_ tex={f.formula} block style={{ margin: 0, color: T.amber, fontSize: 14 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeworkProblem({ problem, onOpenFormula, onGrade, graded }) {
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [expandedExplain, setExpandedExplain] = useState({});

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <Chip tone="amber">Problem {problem.number}</Chip>
        {graded && (
          <Chip tone={graded === "got" ? "blue" : "coral"}>
            {graded === "got" ? "Marked understood" : "Flagged for review"}
          </Chip>
        )}
      </div>
      <p style={{ color: T.chalk, fontSize: 15, marginBottom: 12, lineHeight: 1.5 }}>{problem.prompt}</p>

      {problem.formulaIds && problem.formulaIds.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {problem.formulaIds.map((fid) => (
            <FormulaChip key={fid} id={fid} onOpen={onOpenFormula} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {problem.steps.slice(0, revealedSteps).map((step, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}` }}>
            <div className="flex items-start gap-2">
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-[11px] font-bold"
                style={{ width: 20, height: 20, background: T.amberDim, color: T.amber }}
              >
                {i + 1}
              </span>
              <p style={{ color: T.chalk, fontSize: 14, lineHeight: 1.5 }}>{step.text}</p>
            </div>
            <button
              onClick={() => setExpandedExplain((p) => ({ ...p, [i]: !p[i] }))}
              className="mt-2 ml-7 flex items-center gap-1 text-xs font-medium"
              style={{ color: T.blue }}
            >
              <Lightbulb size={12} />
              {expandedExplain[i] ? "Hide explanation" : "Explain more - why & when to use this move"}
              <ChevronDown size={12} style={{ transform: expandedExplain[i] ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {expandedExplain[i] && (
              <p className="mt-2 ml-7 text-[13px]" style={{ color: T.chalkDim, lineHeight: 1.5 }}>{step.explain}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {revealedSteps < problem.steps.length ? (
          <ChalkButton variant="primary" icon={ChevronRight} onClick={() => setRevealedSteps((n) => n + 1)}>
            {revealedSteps === 0 ? "Show step 1" : "Show next step"}
          </ChalkButton>
        ) : (
          <>
            <ChalkButton variant="coral" icon={X} onClick={() => onGrade(problem.id, "miss")}>Still shaky</ChalkButton>
            <ChalkButton variant="blue" icon={Check} onClick={() => onGrade(problem.id, "got")}>Got it</ChalkButton>
          </>
        )}
        <AskAIButton problem={problem} />
        <ClarifyButton video={YT.sequences} searchQuery={`${problem.prompt} calculus sequences example`} label="Watch a video on this" />
        {revealedSteps > 0 && (
          <button
            onClick={() => setRevealedSteps(0)}
            className="text-xs ml-auto flex items-center gap-1"
            style={{ color: T.chalkDim }}
          >
            <RotateCcw size={12} /> Restart steps
          </button>
        )}
      </div>
    </Card>
  );
}

function RefresherQuiz({ questions, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  const submit = () => {
    if (selected === null) return;
    const correct = selected === q.answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (idx + 1 < questions.length) {
        setIdx((i) => i + 1);
        setSelected(null);
      } else {
        setDone(true);
      }
    }, 550);
  };

  useEffect(() => {
    if (done) onComplete(score, questions.length);
    // eslint-disable-next-line
  }, [done]);

  if (done) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 size={32} style={{ color: T.amber, margin: "0 auto 10px" }} />
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: T.chalk }}>
          {score} / {questions.length} correct
        </h3>
        <p style={{ color: T.chalkDim, fontSize: 13, marginTop: 6 }}>
          {score === questions.length ? "Clean sweep - this topic is solid." : "Worth a quick revisit before Quiz 2."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-3">
        <Chip tone="amber">Refresher {idx + 1} / {questions.length}</Chip>
      </div>
      <p style={{ color: T.chalk, fontSize: 15, marginBottom: 14 }}>{q.q}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const showResult = selected !== null;
          let style = { border: `1px solid ${T.chalkFaint}`, color: T.chalkDim };
          if (showResult && i === q.answer) style = { border: `1px solid rgba(134,185,196,0.6)`, color: T.blue, background: T.blueDim };
          else if (showResult && isSelected) style = { border: `1px solid rgba(221,120,98,0.6)`, color: T.coral, background: T.coralDim };
          return (
            <button
              key={i}
              disabled={selected !== null}
              onClick={() => setSelected(i)}
              className="w-full text-left rounded-lg px-4 py-2.5 text-sm transition-colors"
              style={style}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <ChalkButton variant="primary" className="mt-4" onClick={submit} disabled={selected === null}>
        {idx + 1 === questions.length ? "Finish" : "Next"}
      </ChalkButton>
    </Card>
  );
}

const FEELING_OPTIONS = [
  { id: "confident", label: "Confident", tone: "blue" },
  { id: "okay", label: "Okay, some gaps", tone: "amber" },
  { id: "shaky", label: "Still shaky", tone: "coral" },
];

function CheckInCard({ title, subtitle, prompt, feeling, onFeeling, note, onNote, icon: Icon }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1" style={{ color: T.amber }}>
        <Icon size={16} /> <span className="font-mono text-xs uppercase tracking-wide">{title}</span>
      </div>
      {subtitle && <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 14 }}>{subtitle}</p>}
      <p style={{ color: T.chalk, fontSize: 14, marginBottom: 10, fontWeight: 600 }}>{prompt}</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {FEELING_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFeeling(f.id)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={
              feeling === f.id
                ? { background: f.tone === "blue" ? T.blue : f.tone === "amber" ? T.amber : T.coral, color: "var(--on-primary)" }
                : { border: `1px solid ${T.chalkFaint}`, color: T.chalkDim }
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Anything specific still unclear? (optional, but this is what your tutor sees)"
        rows={3}
        className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
        style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}
      />
    </Card>
  );
}

const STEP_LABELS = ["Check-in", "Preview", "Concept", "Example", "Practice", "Refresher", "Complete"];

function WorkedExample({ example }) {
  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-2" style={{ color: T.blue }}>
        <BookOpen size={14} /> <span className="text-[11px] font-mono uppercase tracking-wide">Worked example — watch this one first</span>
      </div>
      <Math_ tex={example.tex} block style={{ color: T.chalk }} />
      {example.steps.map((s, i) => (
        <div key={i} className="rounded-lg p-3 mt-2" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}` }}>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-[11px] font-bold" style={{ width: 20, height: 20, background: T.blueDim, color: T.blue }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <Math_ tex={s.tex} block style={{ margin: 0, color: T.chalk, fontSize: 14 }} />
              {s.why && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px]" style={{ color: T.chalkDim, lineHeight: 1.5 }}>
                  <Lightbulb size={12} style={{ color: T.amber, marginTop: 2, flexShrink: 0 }} />
                  <Math_ tex={s.why} style={{ color: T.chalkDim, fontSize: 12.5 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="mt-3 inline-block rounded-lg px-4 py-2 font-mono text-sm" style={{ background: T.blueDim, color: T.blue }}>
        <Math_ tex={`\\text{Answer: } ${example.answer}`} />
      </div>
    </Card>
  );
}

const SESSION_HW_MAP = {
  1: { type: "practice", data: HW1_SECTION_1_7, label: "HW1 - Section 1.7. Work through each step, then grade yourself honestly." },
  2: { type: "practice", data: [...HW_3_7, ...HW_5_1], label: "HW3 — 3.7: problems 364, 372, 373, 403. 5.1: problems 8, 10, 18, 26, 29, 30, 34, 38, 41, 42. Work through each step, then grade yourself honestly." },
  3: { type: "practice", data: HW_5_2, label: "HW3 — Section 5.2, problems 68, 70, 71, 76, 78, 81, 82, 86, 90, 91." },
};
const SESSION_QUIZ_MAP = {
  2: REFRESHER_QUIZ_5_1,
  3: REFRESHER_QUIZ_5_2,
};

Object.assign(SESSION_HW_MAP, {
  4: { type: "practice", data: HW_5_3, label: "Section 5.3 - Divergence Test and Integral Test." },
  5: { type: "practice", data: HW_5_4_5_5, label: "Sections 5.4-5.5 - Comparison Tests and Alternating Series." },
  6: { type: "practice", data: HW_5_6, label: "Section 5.6 - Ratio and Root Tests." },
  7: { type: "practice", data: HW_6_1, label: "Section 6.1 - Power Series: finding radius and interval of convergence." },
  8: { type: "practice", data: HW_6_2_6_3, label: "Sections 6.2-6.3 - Power series properties and Taylor/Maclaurin series." },
  9: { type: "practice", data: HW_6_4, label: "Section 6.4 - Using Taylor series for approximation and limits." },
  10: { type: "practice", data: HW_7_1_7_3, label: "Sections 7.1-7.3 - Parametric and polar calculus." },
  11: { type: "practice", data: HW_7_4, label: "Section 7.4 - Polar area and arc length." },
  12: { type: "practice", data: HW_FINAL_REVIEW, label: "Mixed comprehensive review, pulling from earlier sessions." },
});

Object.assign(SESSION_QUIZ_MAP, {
  4: REFRESHER_QUIZ_5_3,
  5: REFRESHER_QUIZ_5_4_5_5,
  6: REFRESHER_QUIZ_5_6,
  7: REFRESHER_QUIZ_6_1,
  8: REFRESHER_QUIZ_6_2_6_3,
  9: REFRESHER_QUIZ_6_4,
  10: REFRESHER_QUIZ_7_1_7_3,
  11: REFRESHER_QUIZ_7_4,
  12: REFRESHER_QUIZ_FINAL,
});


function SessionFlow({ session, isOfficial, onExit, onComplete, onOpenFormula, hwState, onGradeProblem, checkIns, onSaveCheckIn }) {
  const [step, setStep] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [stepDirection, setStepDirection] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const prevCheckIn = checkIns[`pre-${session.id}`] || { feeling: null, note: "" };
  const postCheckIn = checkIns[`post-${session.id}`] || { feeling: null, note: "" };

  const grade = (id, val) => onGradeProblem(id, val);
  const concepts = SESSION_CONCEPTS[session.id];
  const hasContent = !!concepts;
  const hw = SESSION_HW_MAP[session.id];
  const quiz = SESSION_QUIZ_MAP[session.id];
  const examples = WORKED_EXAMPLES[session.id] || [];

  const next = () => { setStepDirection(1); setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1)); };
  const back = () => { setStepDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

  return (
    <div className="animate-[fadein_.3s_ease]">
      {!isOfficial && step < 6 && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4 text-xs" style={{ background: T.blueDim, color: T.blue, border: "1px solid rgba(134,185,196,0.35)" }}>
          <Route size={13} /> Free practice - this won't change your official current session.
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                style={
                  i === step
                    ? { background: T.amber, color: "var(--on-primary)" }
                    : i < step
                    ? { background: T.blueDim, color: T.blue }
                    : { color: T.chalkDim, border: `1px solid ${T.chalkFaint}` }
                }
              >
                {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && <div style={{ width: 16, height: 1, background: T.chalkFaint }} />}
            </React.Fragment>
          ))}
        </div>
        {step < 6 && (
          <button onClick={onExit} className="text-xs whitespace-nowrap flex-shrink-0" style={{ color: T.chalkDim }}>
            Exit anytime
          </button>
        )}
      </div>

      <div key={step} style={{ animation: `${stepDirection >= 0 ? "slideInRight" : "slideInLeft"} .3s cubic-bezier(.2,.85,.3,1)` }}>
      {step === 0 && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3" style={{ color: T.amber }}>
              <Sparkles size={16} /> <span className="font-mono text-xs uppercase tracking-wide">Previously on My Tutor</span>
            </div>
            <p style={{ color: T.chalk, fontSize: 16, lineHeight: 1.6 }}>
              {SESSION_RECAPS[session.id] || "Here's a quick recap of what led into today's session."}
            </p>
          </Card>
          <CheckInCard
            title="Quick check-in before we start"
            prompt="How did last session actually feel?"
            icon={MessageCircleQuestion}
            feeling={prevCheckIn.feeling}
            onFeeling={(f) => onSaveCheckIn(`pre-${session.id}`, { ...prevCheckIn, feeling: f })}
            note={prevCheckIn.note}
            onNote={(n) => onSaveCheckIn(`pre-${session.id}`, { ...prevCheckIn, note: n })}
          />
        </div>
      )}

      {step === 1 && (
        <Card className="p-6">
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: T.chalk, marginBottom: 4 }}>
            Today: {session.title}
          </h3>
          <div className="flex gap-2 mb-4">
            {session.topics.map((t) => <Chip key={t} tone="blue">{t}</Chip>)}
          </div>
          <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 12 }}>By the end of this session, you'll be able to:</p>
          <ul className="space-y-2">
            {(SESSION_PREVIEW_GOALS[session.id] || ["Cover the assigned reading", "Work through the homework set", "Take the refresher quiz"]).map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: T.chalk }}>
                <Target size={14} style={{ color: T.amber, marginTop: 3, flexShrink: 0 }} /> {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {hasContent ? (
            concepts.map((c, i) => (
              <Card className="p-6" key={i}>
                <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: T.chalk, marginBottom: 12 }}>{c.title}</h3>
                <p style={{ color: T.chalk, fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{c.body}</p>
                {c.formulaIds.length > 0 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {c.formulaIds.map((fid) => <FormulaChip key={fid} id={fid} onOpen={onOpenFormula} />)}
                  </div>
                )}
                <div className="rounded-lg p-4" style={{ background: T.amberDim, border: "1px solid rgba(232,196,104,0.35)" }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: T.amber }}>
                    <Info size={14} /> <span className="text-xs font-mono uppercase">Key idea</span>
                  </div>
                  <p style={{ color: T.chalk, fontSize: 14 }}>{c.keyIdea}</p>
                </div>
                <div className="mt-4">
                  <ClarifyButton video={c.yt ? YT[c.yt] : null} searchQuery={`${c.title} calculus explained`} label="Watch the lecture on this" />
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6">
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: T.chalk, marginBottom: 12 }}>{session.title}</h3>
              <p style={{ color: T.chalkDim, fontSize: 14 }}>
                Concept content for this session isn't built yet — it's queued up next, sourced from the actual textbook the same verified way as the sessions before it, not placeholder text.
              </p>
            </Card>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          {examples.length > 0 ? (
            examples.map((ex) => <WorkedExample key={ex.id} example={ex} />)
          ) : (
            <Card className="p-6 text-center" style={{ color: T.chalkDim }}>
              A worked example for this session isn't built yet — it's queued up next, sourced from the textbook or the answer keys, worked and verified the same way as the sessions before it.
            </Card>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          {hw && <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 14 }}>{hw.label}</p>}
          {hw ? (
            hw.type === "practice"
              ? hw.data.map((p) => <PracticeProblem key={p.id} problem={p} hwState={hwState} onGradeProblem={onGradeProblem} />)
              : hw.data.map((p) => (
                  <HomeworkProblem key={p.id} problem={p} onOpenFormula={onOpenFormula} onGrade={grade} graded={hwState[p.id]} />
                ))
          ) : (
            <Card className="p-6 text-center" style={{ color: T.chalkDim }}>
              Homework content for this session populates here once it's been built from the textbook and verified.
            </Card>
          )}
        </div>
      )}

      {step === 5 && (
        quiz
          ? <RefresherQuiz questions={quiz} onComplete={(score, total) => setQuizResult({ score, total })} />
          : <Card className="p-6 text-center" style={{ color: T.chalkDim }}>Refresher quiz for this session coming soon.</Card>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <CheckInCard
            title="Quick check-in before you go"
            prompt="How did today actually go?"
            icon={MessageCircleQuestion}
            feeling={postCheckIn.feeling}
            onFeeling={(f) => onSaveCheckIn(`post-${session.id}`, { ...postCheckIn, feeling: f })}
            note={postCheckIn.note}
            onNote={(n) => onSaveCheckIn(`post-${session.id}`, { ...postCheckIn, note: n })}
          />
          <SessionSummary
            session={session}
            isOfficial={isOfficial}
            hwState={hwState}
            quizResult={quizResult}
            postCheckIn={postCheckIn}
            onComplete={onComplete}
          />
        </div>
      )}
      </div>


      {step < 6 && (
        <div className="flex justify-between mt-6">
          {step === 0 ? (
            <ChalkButton variant="ghost" icon={ChevronLeft} onClick={onExit}>Exit session</ChalkButton>
          ) : (
            <ChalkButton variant="ghost" icon={ChevronLeft} onClick={back}>Back</ChalkButton>
          )}
          <ChalkButton variant="primary" icon={ArrowRight} onClick={next}>
            Continue
          </ChalkButton>
        </div>
      )}
    </div>
  );
}

const SESSION_TAKEAWAYS = {
  1: [
    "Refreshed inverse trig integral setups (arcsin / arcsec forms) from 1.7",
    "Refreshed basic trig integrals from 3.1",
    "Refreshed integration by parts (IBP) from 3.2, including the LIPET priority order",
  ],
  2: [
    "Learned how to identify an improper integral (infinite bound, or a discontinuity on the interval) and rewrite it as a limit before evaluating (3.7)",
    "Learned what it means for a sequence to converge vs. diverge",
    "Practiced evaluating sequence limits algebraically, with L'Hopital's Rule, and with the Squeeze Theorem",
    "Learned to classify sequences as bounded, monotone, or neither",
  ],
  3: [
    "Learned that a series converges exactly when its sequence of partial sums converges to a finite number",
    "Evaluated geometric series and nailed down the |r| < 1 convergence condition",
    "Evaluated telescoping series by tracking which terms survive after cancellation",
    "Saw the classic proof that the harmonic series diverges even though its terms shrink to zero",
  ],
};

Object.assign(SESSION_TAKEAWAYS, {
  4: [
    "Learned to apply the Divergence Test as a fast first-pass check",
    "Learned the three conditions required for the Integral Test",
    "Used the Integral Test to determine convergence, including for a series with no simple comparison benchmark",
  ],
  5: [
    "Applied Direct Comparison and Limit Comparison Tests against p-series benchmarks",
    "Applied the Alternating Series Test",
    "Bounded the error of an alternating series approximation using the remainder theorem",
  ],
  6: [
    "Applied the Ratio Test to series involving factorials",
    "Applied the Root Test to series raised to the nth power",
    "Saw a case where the Ratio Test is inconclusive (L=1) and had to switch tools",
  ],
  7: [
    "Found the radius of convergence of a power series using the Ratio Test",
    "Checked both endpoints individually and found intervals that were open, half-open, and closed depending on the series",
  ],
  8: [
    "Differentiated and integrated a power series term by term to build new series from known ones",
    "Built the Maclaurin series for cos(x) directly from the derivative definition",
    "Used substitution into known series (e^x, geometric) instead of computing derivatives from scratch",
  ],
  9: [
    "Used a Maclaurin series to evaluate a 0/0 limit without L'Hopital's Rule",
    "Approximated e using a Taylor polynomial and bounded the error with the Lagrange remainder",
    "Approximated a definite integral with no elementary antiderivative by integrating a series term by term",
  ],
  10: [
    "Found the slope of a parametric curve using dy/dx = (dy/dt)/(dx/dt)",
    "Computed parametric arc length",
    "Converted between polar and Cartesian coordinates",
  ],
  11: [
    "Computed the area enclosed by polar curves, including a rose petal and a cardioid",
    "Identified the correct theta-interval for tracing a specific region",
    "Computed arc length in polar coordinates",
  ],
  12: [
    "Reviewed convergence tests, power series, Taylor series, and parametric/polar calculus in one consolidated pass",
    "Used the Focus Session tool to target remaining weak spots directly",
  ],
});


function takeawaysForSession(session) {
  if (SESSION_TAKEAWAYS[session.id]) return SESSION_TAKEAWAYS[session.id];
  return session.topics.map((t) => `Covered core ideas from section ${t}`);
}

function SessionSummary({ session, isOfficial, hwState, quizResult, postCheckIn, onComplete }) {
  const hw = SESSION_HW_MAP[session.id];
  const sessionProblemIds = hw ? hw.data.map((p) => p.id) : [];
  const got = sessionProblemIds.filter((id) => hwState[id] === "got").length;
  const shaky = sessionProblemIds.filter((id) => hwState[id] === "miss").length;
  const untouched = sessionProblemIds.length - got - shaky;
  const nextSession = SESSIONS.find((s) => s.id === session.id + 1);

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.amberDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", animation: "pulseGlow 1.8s ease-in-out infinite" }}>
          <CheckCircle2 size={32} style={{ color: T.amber }} />
        </div>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk, marginBottom: 4 }}>
          {isOfficial ? "Session complete" : "Nice work - practice round done"}
        </h3>
        <p style={{ color: T.chalkDim, fontSize: 13 }}>
          Session {session.id} - {session.title} - Week {session.week}
        </p>
      </div>

      <div className="rounded-lg p-4 mb-4" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}` }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: T.amber }}>
          <GraduationCap size={15} /> <span className="text-xs font-mono uppercase tracking-wide">What you covered today</span>
        </div>
        <ul className="space-y-1.5">
          {takeawaysForSession(session).map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: T.chalk }}>
              <Check size={13} style={{ color: T.amber, marginTop: 3, flexShrink: 0 }} /> {t}
            </li>
          ))}
        </ul>
      </div>

      {sessionProblemIds.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg p-3 text-center" style={{ background: T.blueDim }}>
            <div className="font-mono text-lg font-bold" style={{ color: T.blue }}>{got}</div>
            <div className="text-[11px]" style={{ color: T.chalkDim }}>problems got it</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: T.coralDim }}>
            <div className="font-mono text-lg font-bold" style={{ color: T.coral }}>{shaky}</div>
            <div className="text-[11px]" style={{ color: T.chalkDim }}>flagged shaky</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: T.surface2 }}>
            <div className="font-mono text-lg font-bold" style={{ color: T.chalkDim }}>{untouched}</div>
            <div className="text-[11px]" style={{ color: T.chalkDim }}>not attempted</div>
          </div>
        </div>
      )}

      {quizResult && (
        <div className="flex items-center gap-2 rounded-lg p-3 mb-4" style={{ background: T.amberDim, border: "1px solid rgba(232,196,104,0.35)" }}>
          <ListChecks size={15} style={{ color: T.amber }} />
          <span style={{ color: T.chalk, fontSize: 13 }}>
            Refresher quiz: <b>{quizResult.score} / {quizResult.total}</b> correct
          </span>
        </div>
      )}

      {postCheckIn && postCheckIn.note && (
        <div className="rounded-lg p-3 mb-4" style={{ background: T.blueDim, border: "1px solid rgba(134,185,196,0.3)" }}>
          <div className="text-xs font-mono uppercase mb-1" style={{ color: T.blue }}>Noah's note to himself (and his tutor)</div>
          <p style={{ color: T.chalk, fontSize: 13 }}>{postCheckIn.note}</p>
        </div>
      )}

      <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 20 }}>
        {isOfficial
          ? `Next up: ${nextSession ? `Session ${nextSession.id} - ${nextSession.title}` : "the final review"}.`
          : "This was free practice - it won't change what's queued up for your next tutoring session."}
      </p>

      <ChalkButton variant="primary" icon={Home} onClick={() => onComplete(session.id, isOfficial)} className="w-full justify-center">
        Back to dashboard
      </ChalkButton>
    </Card>
  );
}

function shuffledSample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function MockExamView({ hwState, onGradeProblem }) {
  const [phase, setPhase] = useState("setup");
  const [duration, setDuration] = useState(60);
  const [count, setCount] = useState(10);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [examProblems, setExamProblems] = useState([]);
  const [idx, setIdx] = useState(0);

  const start = () => {
    const pool = ALL_PROBLEMS.map((p) => p.ref);
    setExamProblems(shuffledSample(pool, Math.min(count, pool.length)));
    setIdx(0);
    setRemaining(duration * 60);
    setPhase("running");
  };

  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current);
          setPhase("done");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (phase === "setup") {
    return (
      <Card className="p-8 max-w-md mx-auto text-center">
        <Timer size={32} style={{ color: T.amber, margin: "0 auto 12px" }} />
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk, marginBottom: 6 }}>Mock Exam</h2>
        <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 20 }}>
          Timed and fullscreen, pulling at random from the actual final exam's own questions across every session, plus your two hardest Exam 1 problems. Grade yourself honestly at the end of each problem, same as everywhere else in the app.
        </p>
        <div style={{ marginBottom: 16 }}>
          <div className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: T.chalkDim }}>Time limit</div>
          <div className="flex justify-center gap-2">
            {[30, 45, 60].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="rounded-lg px-4 py-2 text-sm font-mono"
                style={duration === d ? { background: T.amber, color: "var(--on-primary)" } : { border: `1px solid ${T.chalkFaint}`, color: T.chalkDim }}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: T.chalkDim }}>Number of problems</div>
          <div className="flex justify-center gap-2">
            {[5, 10, 15].map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className="rounded-lg px-4 py-2 text-sm font-mono"
                style={count === c ? { background: T.amber, color: "var(--on-primary)" } : { border: `1px solid ${T.chalkFaint}`, color: T.chalkDim }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <ChalkButton variant="primary" icon={PlayCircle} onClick={start} className="w-full justify-center">
          Start mock exam
        </ChalkButton>
      </Card>
    );
  }

  if (phase === "running") {
    const problem = examProblems[idx];
    const graded = hwState[problem.id];
    const isLast = idx === examProblems.length - 1;
    return (
      <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col p-8 overflow-y-auto" : ""} style={fullscreen ? { background: T.bg } : {}}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-mono text-2xl" style={{ color: remaining < 300 ? T.coral : T.chalk }}>
            <Clock size={22} /> {mm}:{ss}
          </div>
          <Chip tone="amber">Problem {idx + 1} of {examProblems.length}</Chip>
          <div className="flex gap-2">
            <ChalkButton variant="ghost" icon={fullscreen ? Minimize2 : Maximize2} onClick={() => setFullscreen((f) => !f)}>
              {fullscreen ? "Exit focus" : "Focus mode"}
            </ChalkButton>
            <ChalkButton variant="coral" onClick={() => { clearInterval(timerRef.current); setPhase("done"); }}>
              End exam
            </ChalkButton>
          </div>
        </div>
        <div className="flex-1">
          <PracticeProblem problem={problem} hwState={hwState} onGradeProblem={onGradeProblem} />
        </div>
        {graded && (
          <ChalkButton
            variant="primary"
            icon={isLast ? CheckCircle2 : ArrowRight}
            onClick={() => (isLast ? setPhase("done") : setIdx((i) => i + 1))}
            className="w-full justify-center mt-2"
          >
            {isLast ? "Finish exam" : "Next problem"}
          </ChalkButton>
        )}
      </div>
    );
  }

  const attempted = examProblems.filter((p) => hwState[p.id]).length;
  const gotIt = examProblems.filter((p) => hwState[p.id] === "got").length;
  const shaky = examProblems.filter((p) => hwState[p.id] === "miss").length;

  return (
    <Card className="p-8 max-w-md mx-auto text-center">
      <CheckCircle2 size={32} style={{ color: T.amber, margin: "0 auto 12px" }} />
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk, marginBottom: 6 }}>Exam session ended</h2>
      <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 16 }}>
        {attempted} of {examProblems.length} problems graded — {gotIt} solid, {shaky} flagged. Anything flagged shows up in Focus Session automatically.
      </p>
      <ChalkButton variant="primary" onClick={() => setPhase("setup")}>Run another</ChalkButton>
    </Card>
  );
}

function PracticeProblem({ problem, hwState, onGradeProblem }) {
  const [revealed, setRevealed] = useState(0);
  const graded = hwState[problem.id];
  return (
    <Card className="p-5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span />
        {graded && (
          <Chip tone={graded === "got" ? "blue" : "coral"}>
            {graded === "got" ? "Marked understood" : "Flagged for review"}
          </Chip>
        )}
      </div>
      <Math_ tex={problem.tex} block style={{ color: T.chalk }} />
      {problem.steps.slice(0, revealed).map((s, i) => (
        <div key={i} className="rounded-lg p-3 mt-2" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}` }}>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-[11px] font-bold" style={{ width: 20, height: 20, background: T.amberDim, color: T.amber }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <Math_ tex={s.tex} block style={{ margin: 0, color: T.chalk, fontSize: 14 }} />
              {s.why && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px]" style={{ color: T.chalkDim, lineHeight: 1.5 }}>
                  <Lightbulb size={12} style={{ color: T.blue, marginTop: 2, flexShrink: 0 }} />
                  <Math_ tex={s.why} style={{ color: T.chalkDim, fontSize: 12.5 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {revealed < problem.steps.length ? (
          <ChalkButton variant="primary" icon={ChevronRight} onClick={() => setRevealed((n) => n + 1)}>
            {revealed === 0 ? "Show step 1" : "Show next step"}
          </ChalkButton>
        ) : (
          <>
            <div className="rounded-lg px-4 py-2 font-mono text-sm" style={{ background: T.amberDim, color: T.amber }}>
              <Math_ tex={`\\text{Answer: } ${problem.answer}`} />
            </div>
            {onGradeProblem && (
              <>
                <ChalkButton variant="coral" icon={X} onClick={() => onGradeProblem(problem.id, "miss")}>Still shaky</ChalkButton>
                <ChalkButton variant="blue" icon={Check} onClick={() => onGradeProblem(problem.id, "got")}>Got it</ChalkButton>
              </>
            )}
          </>
        )}
        {revealed > 0 && (
          <button onClick={() => setRevealed(0)} className="text-xs flex items-center gap-1" style={{ color: T.chalkDim }}>
            <RotateCcw size={12} /> Restart
          </button>
        )}
        <div className="w-full" />
        <ClarifyButton video={problem.yt ? YT[problem.yt] : null} searchQuery={`how to solve ${problem.tex.replace(/\\\\/g, "").slice(0, 60)} calculus`} />
      </div>
    </Card>
  );
}

function PracticeBankView({ hwState, onGradeProblem, initialSetId, onConsumeInitial }) {
  const [active, setActive] = useState(initialSetId || null);

  useEffect(() => {
    if (initialSetId) {
      setActive(initialSetId);
      onConsumeInitial && onConsumeInitial();
    }
    // eslint-disable-next-line
  }, [initialSetId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  const set = PRACTICE_SETS.find((s) => s.id === active);

  if (set) {
    return (
      <div className="animate-[fadein_.3s_ease]">
        <button onClick={() => setActive(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: T.amber }}>
          <ChevronLeft size={14} /> Back to Practice Bank
        </button>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk, marginBottom: 4 }}>{set.label}</h2>
        <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 16 }}>{set.topics}</p>
        {set.problems.length === 0 ? (
          <Card className="p-6 text-center" style={{ color: T.chalkDim }}>
            Solutions for this set are being verified against the answer key - coming soon, not guessed at.
          </Card>
        ) : (
          set.problems.map((p) => <PracticeProblem key={p.id} problem={p} hwState={hwState} onGradeProblem={onGradeProblem} />)
        )}
      </div>
    );
  }

  return (
    <div className="animate-[fadein_.3s_ease]">
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, marginBottom: 6, color: T.chalk }}>Practice Bank</h2>
      <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 20 }}>
        Real questions from Noah's homework, quizzes, and exams - worked step by step, verified independently before going in here.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PRACTICE_SETS.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} className="text-left rounded-xl p-4 transition-transform hover:-translate-y-0.5" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}>
            <div className="flex items-center justify-between mb-2">
              <Chip tone={s.solved === true ? "blue" : s.solved === "partial" ? "amber" : "default"}>
                {s.solved === true ? "Verified" : s.solved === "partial" ? "Partially verified" : "In progress"}
              </Chip>
              <span className="text-[11px] font-mono" style={{ color: T.chalkDim }}>{s.minutes} min</span>
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: T.chalk, marginBottom: 4 }}>{s.label}</div>
            <div className="text-[13px]" style={{ color: T.chalkDim }}>{s.topics}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusSessionView({ hwState, onGradeProblem, onOpenFormula }) {
  const weakIds = Object.entries(hwState).filter(([, v]) => v === "miss").map(([id]) => id);
  const weakProblems = ALL_PROBLEMS.filter((p) => weakIds.includes(p.id));

  if (weakProblems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 size={32} style={{ color: T.amber, margin: "0 auto 12px" }} />
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: T.chalk, marginBottom: 6 }}>Nothing flagged right now</h3>
        <p style={{ color: T.chalkDim, fontSize: 14 }}>
          Whenever you mark a problem "Still shaky" in a session or the Practice Bank, it lands here automatically - this becomes your reading list before the final.
        </p>
      </Card>
    );
  }

  return (
    <div className="animate-[fadein_.3s_ease]">
      <div className="flex items-center gap-2 mb-1" style={{ color: T.coral }}>
        <Flame size={16} /> <span className="font-mono text-xs uppercase tracking-wide">Weak-spot focus session</span>
      </div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk, marginBottom: 4 }}>
        {weakProblems.length} problem{weakProblems.length === 1 ? "" : "s"} flagged across everything you've done
      </h2>
      <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 18 }}>
        Pulled from every session and every Practice Bank set - work through these, and re-grade "Got it" once it clicks to clear them off this list.
      </p>
      {weakProblems.map(({ id, kind, label, ref }) =>
        kind === "session" ? (
          <div key={id}>
            <Chip tone="coral">{label}</Chip>
            <div className="mt-2 mb-1">
              <HomeworkProblem problem={ref} onOpenFormula={onOpenFormula} onGrade={onGradeProblem} graded={hwState[id]} />
            </div>
          </div>
        ) : (
          <div key={id}>
            <Chip tone="coral">{label}</Chip>
            <div className="mt-2">
              <PracticeProblem problem={ref} hwState={hwState} onGradeProblem={onGradeProblem} />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function buildDueQueue(boxes) {
  const withBox = FLASHCARDS_BASE.map((c) => ({ ...c, box: boxes[c.id] ?? 1 }));
  return withBox
    .map((c) => ({ c, r: Math.random() }))
    .sort((a, b) => a.c.box - b.c.box || a.r - b.r)
    .map((x) => x.c);
}

function FlashcardsView({ flashBoxes, onSaveBoxes }) {
  const [queue, setQueue] = useState(() => buildDueQueue(flashBoxes));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const grade = (cardId, gotIt) => {
    const current = flashBoxes[cardId] ?? 1;
    const nextBox = gotIt ? Math.min(4, current + 1) : 1;
    onSaveBoxes({ ...flashBoxes, [cardId]: nextBox });
    setPos((p) => p + 1);
    setFlipped(false);
  };

  if (pos >= queue.length) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 size={28} style={{ color: T.amber, margin: "0 auto 10px" }} />
        <p style={{ color: T.chalk }}>Deck cleared - cards you missed will come back around soonest next round.</p>
        <ChalkButton className="mt-4" variant="primary" onClick={() => { setQueue(buildDueQueue(flashBoxes)); setPos(0); }}>
          Run again
        </ChalkButton>
      </Card>
    );
  }

  const card = queue[pos];
  const box = flashBoxes[card.id] ?? 1;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        <p style={{ color: T.chalkDim, fontSize: 12 }}>Card {pos + 1} of {queue.length}</p>
        <Chip tone={box >= 3 ? "blue" : box === 1 ? "coral" : "amber"}>Box {box} of 4</Chip>
      </div>
      <div
        onClick={() => setFlipped((f) => !f)}
        className="cursor-pointer rounded-xl p-8 text-center min-h-[200px] flex items-center justify-center transition-all"
        style={{
          background: flipped ? T.surface2 : T.surface,
          border: flipped ? "1px solid rgba(134,185,196,0.4)" : `2px dashed ${T.chalkFaint}`,
        }}
      >
        <Math_
          tex={flipped ? card.back : card.front}
          block
          style={{ fontFamily: "Fraunces, serif", fontSize: 18, color: T.chalk, lineHeight: 1.6, textAlign: "center" }}
        />
      </div>
      <div className="flex gap-2 justify-center mt-4">
        {!flipped ? (
          <ChalkButton variant="primary" onClick={() => setFlipped(true)}>Flip</ChalkButton>
        ) : (
          <>
            <ChalkButton variant="coral" onClick={() => grade(card.id, false)}>Missed it</ChalkButton>
            <ChalkButton variant="blue" onClick={() => grade(card.id, true)}>Got it</ChalkButton>
          </>
        )}
      </div>
    </div>
  );
}

function FlowStep({ num, icon: Icon, title, desc, tone = "amber" }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-xs font-bold"
        style={{ width: 30, height: 30, background: tone === "amber" ? T.amberDim : T.blueDim, color: tone === "amber" ? T.amber : T.blue }}
      >
        {num}
      </div>
      <div className="pt-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon size={14} style={{ color: T.chalk }} />
          <span style={{ color: T.chalk, fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>
        <p style={{ color: T.chalkDim, fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-start pl-[14px] my-1">
      <div style={{ width: 1, height: 16, borderLeft: `2px dashed ${T.chalkFaint}` }} />
    </div>
  );
}

function AppFlowView() {
  return (
    <div className="animate-[fadein_.3s_ease] max-w-2xl">
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, marginBottom: 6, color: T.chalk }}>How This App Works</h2>
      <p style={{ color: T.chalkDim, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        A map of the whole experience - what happens each time you show up, what a session walks you through, and what's available whenever you need it. Come back here any time you feel lost.
      </p>

      <Card className="p-6 mb-5">
        <div className="flex items-center gap-2 mb-4" style={{ color: T.amber }}>
          <Route size={15} /> <span className="font-mono text-xs uppercase tracking-wide">The main loop</span>
        </div>
        <FlowStep num={1} icon={Home} title="Dashboard" desc="You land here first. It shows today's session, a note from your tutor if there is one, your predicted exam readiness, the full 12-session roadmap, and a mastery map." />
        <FlowArrow />
        <FlowStep num={2} icon={PlayCircle} title="Start today's session" desc="One click starts the current session, which walks you through six steps in order." />
        <FlowArrow />
        <FlowStep num={3} icon={GraduationCap} title="Complete then Summary" desc="At the end, you get a plain recap of exactly what you covered, how the homework went, and your refresher quiz score - then it's back to the dashboard with the roadmap updated." />
      </Card>

      <Card className="p-6 mb-5">
        <div className="flex items-center gap-2 mb-4" style={{ color: T.blue }}>
          <ListChecks size={15} /> <span className="font-mono text-xs uppercase tracking-wide">Inside a session - seven steps, always in this order</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FlowStep num="A" icon={Sparkles} title="Check-in" desc="A recap of what led into today, plus a 30-second honest check-in on how last time actually felt." tone="blue" />
          <FlowStep num="B" icon={Target} title="Preview" desc="The specific things you'll be able to do by the end." tone="blue" />
          <FlowStep num="C" icon={Lightbulb} title="Concept" desc="The idea itself, explained plainly, with formulas and a video if you want one." tone="blue" />
          <FlowStep num="D" icon={BookOpen} title="Example" desc="A fully worked problem, solved step by step in front of you — watch this before trying any yourself." tone="blue" />
          <FlowStep num="E" icon={ClipboardList} title="Practice" desc="Real homework problems, revealed one step at a time, each with the why and when explained - grade yourself 'got it' or 'still shaky' as you go." tone="blue" />
          <FlowStep num="F" icon={ListChecks} title="Refresher" desc="A short quiz to check the concept actually stuck." tone="blue" />
          <FlowStep num="G" icon={CheckCircle2} title="Complete" desc="A quick check-in on how today felt, then a full summary of what you covered." tone="blue" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4" style={{ color: T.amber }}>
          <Library size={15} /> <span className="font-mono text-xs uppercase tracking-wide">Available anytime, outside of sessions</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FlowStep num={<ClipboardList size={13} />} icon={ClipboardList} title="Practice Bank" desc="Real problems from past homework, quizzes, and exams, worked step by step." />
          <FlowStep num={<Flame size={13} />} icon={Flame} title="Focus Session" desc="One click pulls together everything you've flagged 'still shaky,' across every session and set." />
          <FlowStep num={<BookOpen size={13} />} icon={BookOpen} title="Formula Sheet" desc="Every formula the course uses, with why it applies and when to reach for it." />
          <FlowStep num={<Timer size={13} />} icon={Timer} title="Mock Exam" desc="A timed, distraction-free practice exam." />
          <FlowStep num={<Layers size={13} />} icon={Layers} title="Flashcards" desc="Spaced-repetition review - cards you miss come back sooner, cards you know come back less often." />
          <FlowStep num={<FileText size={13} />} icon={FileText} title="Handoff notes" desc="One click bundles your progress into a printable summary to bring to your tutor." />
          <FlowStep num={<Settings size={13} />} icon={Settings} title="Settings" desc="Theme, font size, and font family - synced across your devices." />
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TASKS / AGENDA — a preset daily plan from today through the
   final exam, so Noah always has something checkable to do, and
   the dashboard can tell him what today's task is without
   anyone needing to type it in by hand every morning.
============================================================ */
const REVIEW_TASK_ROTATION = [
  "Review 10 flashcards (spaced repetition — cards you're shaky on come back sooner)",
  "Work through 3 problems in Focus Session",
  "Revisit one flagged 'still shaky' problem in the Practice Bank until it clicks",
  "Skim the Formula Sheet for this week's topics — say each 'why' and 'when' out loud",
  "Light day — 15 minutes, your choice: flashcards, Focus Session, or re-read one Concept step",
];

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function buildTaskPlan(currentSessionId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const final = new Date(FINAL_DATE);
  const totalDays = Math.max(1, Math.round((final - today) / 86400000));
  const remainingSessions = SESSIONS.filter((s) => s.id >= currentSessionId);
  const tasks = [];

  if (remainingSessions.length === 0) {
    // Past the last session — every remaining day is exam-prep review.
    for (let d = 0; d <= totalDays; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      tasks.push({
        id: `t-${dateStr(date)}`,
        date: dateStr(date),
        text: d === totalDays ? "Final exam — you've got this." : REVIEW_TASK_ROTATION[d % REVIEW_TASK_ROTATION.length],
        done: false,
        kind: d === totalDays ? "exam" : "review",
      });
    }
    return tasks;
  }

  const spacing = Math.max(1, Math.floor(totalDays / remainingSessions.length));
  let sessionPtr = 0;
  let reviewPtr = 0;

  for (let d = 0; d <= totalDays; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const isSessionDay = sessionPtr < remainingSessions.length && d === sessionPtr * spacing;

    if (isSessionDay) {
      const s = remainingSessions[sessionPtr];
      tasks.push({
        id: `t-${dateStr(date)}`,
        date: dateStr(date),
        text: `Session ${s.id}: ${s.title}${s.quiz ? ` (${s.quiz} today)` : ""}`,
        done: false,
        kind: "session",
        sessionId: s.id,
      });
      sessionPtr++;
    } else if (d === totalDays) {
      tasks.push({ id: `t-${dateStr(date)}`, date: dateStr(date), text: "Final exam — you've got this.", done: false, kind: "exam" });
    } else {
      tasks.push({
        id: `t-${dateStr(date)}`,
        date: dateStr(date),
        text: REVIEW_TASK_ROTATION[reviewPtr % REVIEW_TASK_ROTATION.length],
        done: false,
        kind: "review",
      });
      reviewPtr++;
    }
  }
  return tasks;
}

function TaskRow({ task, onToggle, onDelete }) {
  const kindIcon = task.kind === "session" ? GraduationCap : task.kind === "exam" ? Flame : task.kind === "custom" ? MessageCircleQuestion : ListChecks;
  const kindColor = task.kind === "session" ? T.amber : task.kind === "exam" ? T.coral : task.kind === "custom" ? T.blue : T.blue;
  return (
    <div
      className="w-full flex items-center gap-3 rounded-lg p-3 transition-colors"
      style={{ background: task.done ? T.surface2 : T.surface, border: `1px solid ${T.chalkFaint}`, opacity: task.done ? 0.6 : 1 }}
    >
      <button onClick={() => onToggle(task.id, !task.done)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all duration-200"
          style={{ border: `2px solid ${task.done ? T.blue : T.chalkFaint}`, background: task.done ? T.blue : "transparent" }}
        >
          {task.done && <Check size={13} style={{ color: "#fff", animation: "checkPop .25s cubic-bezier(.3,1.5,.5,1)" }} />}
        </div>
        {React.createElement(kindIcon, { size: 14, style: { color: kindColor, flexShrink: 0 } })}
        <span style={{ color: T.chalk, fontSize: 13.5, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
        {task.kind === "custom" && <Chip tone="blue">From your tutor</Chip>}
      </button>
      {task.kind === "custom" && onDelete && (
        <button onClick={() => onDelete(task.id)} style={{ color: T.chalkDim, flexShrink: 0 }} title="Remove"><X size={14} /></button>
      )}
    </div>
  );
}

function AddTaskForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dateStr(new Date()));
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onAdd(date, text.trim());
    setText("");
    setOpen(false);
  };

  if (!open) {
    return (
      <ChalkButton variant="blue" icon={MessageCircleQuestion} onClick={() => setOpen(true)} className="mb-5">
        Leave him a task
      </ChalkButton>
    );
  }

  return (
    <Card className="p-4 mb-5">
      <div className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: T.blue }}>Leave a task for a specific day</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder='E.g. "Redo the ratio test problems before tomorrow"'
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <ChalkButton variant="primary" icon={Check} onClick={submit}>Add task</ChalkButton>
        <ChalkButton variant="ghost" onClick={() => setOpen(false)}>Cancel</ChalkButton>
      </div>
    </Card>
  );
}

function TasksView({ tasks, onToggle, onAdd, onDelete }) {
  const todayStr = dateStr(new Date());
  const grouped = {};
  tasks.forEach((t) => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });
  const dates = Object.keys(grouped).sort();
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="animate-[fadein_.3s_ease]">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: T.chalk }}>Daily Tasks</h2>
        <Chip tone="blue">{doneCount}/{tasks.length} done</Chip>
      </div>
      <p style={{ color: T.chalkDim, fontSize: 13.5, marginBottom: 16 }}>
        Preset from today through the final — one task a day, check it off as you go. Your tutor can also drop in extra tasks any time.
      </p>
      <AddTaskForm onAdd={onAdd} />
      <div className="space-y-5">
        {dates.map((d) => {
          const isToday = d === todayStr;
          const isPast = d < todayStr;
          return (
            <div key={d} style={isPast ? { opacity: 0.5 } : {}}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono uppercase tracking-wide" style={{ color: isToday ? T.amber : T.chalkDim }}>
                  {new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                {isToday && <Chip tone="amber">Today</Chip>}
              </div>
              <div className="space-y-1.5">
                {grouped[d].map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyPlanModal({ open, onClose, todayTask, weakCount, pendingAssignments }) {
  if (!open || !todayTask) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-[fadein_.2s_ease]" style={{ background: "rgba(8,20,15,0.75)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl p-6 animate-[popin_.28s_cubic-bezier(.2,.9,.25,1.15)]" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}>
        <div className="flex items-center gap-2 mb-1" style={{ color: T.amber }}>
          <Sparkles size={16} /> <span className="text-[11px] font-mono uppercase tracking-wide">Today's plan</span>
        </div>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: T.chalk, marginBottom: 14 }}>{todayTask.text}</h3>
        {(weakCount > 0 || pendingAssignments > 0) && (
          <div className="rounded-lg p-3 mb-4" style={{ background: T.coralDim }}>
            {weakCount > 0 && <p style={{ color: T.chalk, fontSize: 13 }}>{weakCount} problem{weakCount === 1 ? "" : "s"} still flagged shaky</p>}
            {pendingAssignments > 0 && <p style={{ color: T.chalk, fontSize: 13 }}>{pendingAssignments} assignment{pendingAssignments === 1 ? "" : "s"} pending</p>}
          </div>
        )}
        <ChalkButton variant="primary" icon={Check} onClick={onClose} className="w-full justify-center">Got it</ChalkButton>
      </div>
    </div>
  );
}

function computeReadiness(mastery, daysLeft) {
  const vals = Object.values(mastery);
  const avgMastery = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const timeFactor = daysLeft === null ? 1 : Math.max(0.55, Math.min(1, daysLeft / 21));
  const score = Math.round(avgMastery * timeFactor);
  let verdict = "Early days";
  if (score >= 80) verdict = "On track";
  else if (score >= 60) verdict = "Building steadily";
  else if (score >= 35) verdict = "Needs focused time";
  else verdict = "Early days";
  return { score: Math.max(0, Math.min(100, score)), verdict };
}

function ReadinessGauge({ mastery, daysLeft }) {
  const { score, verdict } = computeReadiness(mastery, daysLeft);
  const color = score >= 80 ? T.blue : score >= 50 ? T.amber : T.coral;
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - score / 100);
  return (
    <Card className="p-5 flex items-center gap-4">
      <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke={T.chalkFaint} strokeWidth="7" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset .6s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color }}>
          {score}%
        </div>
      </div>
      <div>
        <div className="text-xs font-mono uppercase tracking-wide mb-1" style={{ color: T.chalkDim }}>Predicted exam readiness</div>
        <div style={{ color: T.chalk, fontSize: 15, fontWeight: 600 }}>{verdict}</div>
        <div style={{ color: T.chalkDim, fontSize: 12, marginTop: 2 }}>Blend of self-graded mastery + days remaining - a compass, not a guarantee.</div>
      </div>
    </Card>
  );
}

/* ============================================================
   CHAT — real-time messaging between tutor and Noah, backed by
   Supabase Realtime (actual websockets via postgres_changes),
   with assignment-type messages for "assign a problem" / progress
   tracking, dismissible in-app toasts, and browser + push
   notifications.
============================================================ */
function useChat(role) {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null); // dismissible "new message" banner

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("tutor_messages").select("*").order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages(data || []);
        setLoaded(true);
      }
    })();

    const channel = supabase
      .channel("tutor_messages_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tutor_messages" }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        if (role && payload.new.sender !== role) {
          setToast(payload.new);
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification(payload.new.sender === "tutor" ? "Your tutor" : STUDENT, {
              body: payload.new.kind === "assignment" ? `New assignment: ${payload.new.body}` : payload.new.body,
            });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tutor_messages" }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [role]);

  const send = useCallback(
    async (body, kind = "text", assignmentRef = null) => {
      if (!role || !body.trim()) return;
      const { data } = await supabase
        .from("tutor_messages")
        .insert({ sender: role, kind, body: body.trim(), assignment_ref: assignmentRef })
        .select()
        .single();
      const other = role === "tutor" ? "student" : "tutor";
      sendPushToOther(other, role === "tutor" ? "Your tutor" : STUDENT, kind === "assignment" ? `New assignment: ${body}` : body);
      return data;
    },
    [role]
  );

  const markAssignmentDone = useCallback(async (id, done) => {
    await supabase.from("tutor_messages").update({ assignment_done: done }).eq("id", id);
  }, []);

  const markAllRead = useCallback(
    async (currentRole) => {
      if (!currentRole) return;
      const readField = currentRole === "tutor" ? "read_by_tutor" : "read_by_student";
      const unread = messages.filter((m) => m.sender !== currentRole && !m[readField]);
      if (unread.length === 0) return;
      await supabase.from("tutor_messages").update({ [readField]: true }).in("id", unread.map((m) => m.id));
      setMessages((prev) => prev.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, [readField]: true } : m)));
    },
    [messages]
  );

  return { messages, loaded, toast, setToast, send, markAssignmentDone, markAllRead };
}

function unreadCountFor(messages, role) {
  if (!role) return 0;
  const readField = role === "tutor" ? "read_by_tutor" : "read_by_student";
  return messages.filter((m) => m.sender !== role && !m[readField]).length;
}

function RoleModal({ open, onPick }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(8,20,15,0.75)" }}>
      <div className="w-full max-w-sm rounded-xl p-6 animate-[popin_.25s_cubic-bezier(.2,.9,.3,1.2)]" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: T.chalk }}>
          <UserCircle2 size={20} />
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18 }}>Who's using this device?</h3>
        </div>
        <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 16 }}>
          This sets up messaging and progress tracking correctly. You can change it later in Settings.
        </p>
        <div className="flex flex-col gap-2">
          <ChalkButton variant="primary" onClick={() => onPick("student")}>I'm {STUDENT}</ChalkButton>
          <ChalkButton variant="blue" onClick={() => onPick("tutor")}>I'm the tutor</ChalkButton>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, role, onMarkDone }) {
  const mine = msg.sender === role;
  const time = new Date(msg.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (msg.kind === "assignment") {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-3`}>
        <div className="max-w-[85%] rounded-xl p-4" style={{ background: T.amberDim, border: "1px solid rgba(232,196,104,0.4)" }}>
          <div className="flex items-center gap-2 mb-1.5" style={{ color: T.amber }}>
            <ClipboardCheck size={14} />
            <span className="text-[11px] font-mono uppercase tracking-wide">Assignment from {msg.sender === "tutor" ? "your tutor" : STUDENT}</span>
          </div>
          <p style={{ color: T.chalk, fontSize: 14, marginBottom: 10 }}>{msg.body}</p>
          <div className="flex items-center gap-2">
            {msg.assignment_done ? (
              <Chip tone="blue"><Check size={11} /> Done</Chip>
            ) : (
              <Chip tone="coral">Pending</Chip>
            )}
            {role === "student" && (
              <button
                onClick={() => onMarkDone(msg.id, !msg.assignment_done)}
                className="text-xs font-semibold"
                style={{ color: T.blue }}
              >
                {msg.assignment_done ? "Mark not done" : "Mark complete"}
              </button>
            )}
          </div>
          <div className="text-[10.5px] mt-2" style={{ color: T.chalkDim }}>{time}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-2.5`}>
      <div
        className="max-w-[80%] rounded-xl px-4 py-2.5"
        style={mine ? { background: T.amber, color: "var(--on-primary)" } : { background: T.surface2, color: T.chalk, border: `1px solid ${T.chalkFaint}` }}
      >
        <p style={{ fontSize: 14.5, lineHeight: 1.45 }}>{msg.body}</p>
        <div className="text-[10.5px] mt-1" style={{ color: mine ? "rgba(255,255,255,0.7)" : T.chalkDim }}>{time}</div>
      </div>
    </div>
  );
}

function AssignProblemModal({ open, onClose, onAssign }) {
  const [mode, setMode] = useState("custom"); // custom | bank
  const [custom, setCustom] = useState("");
  const [setId, setSetId] = useState(PRACTICE_SETS[0]?.id);
  const [problemId, setProblemId] = useState(PRACTICE_SETS[0]?.problems[0]?.id || "");
  if (!open) return null;

  const chosenSet = PRACTICE_SETS.find((s) => s.id === setId);

  const assign = () => {
    if (mode === "custom") {
      if (!custom.trim()) return;
      onAssign(custom.trim(), null);
    } else {
      const p = chosenSet?.problems.find((p) => p.id === problemId);
      if (!p) return;
      onAssign(`${chosenSet.label} — problem ${p.id}`, p.id);
    }
    setCustom("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-[fadein_.2s_ease]" style={{ background: "rgba(8,20,15,0.7)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl p-6 animate-[popin_.25s_cubic-bezier(.2,.9,.3,1.2)]" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18, color: T.chalk }}>Assign something to {STUDENT}</h3>
          <button onClick={onClose} style={{ color: T.chalkDim }}><X size={18} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <ChalkButton variant={mode === "custom" ? "primary" : "ghost"} onClick={() => setMode("custom")}>Write my own</ChalkButton>
          <ChalkButton variant={mode === "bank" ? "primary" : "ghost"} onClick={() => setMode("bank")}>From Practice Bank</ChalkButton>
        </div>
        {mode === "custom" ? (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            placeholder='E.g. "Redo HW4 problems 1-3 before next session"'
            className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
            style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}
          />
        ) : (
          <div className="space-y-2">
            <select value={setId} onChange={(e) => { setSetId(e.target.value); setProblemId(PRACTICE_SETS.find((s) => s.id === e.target.value)?.problems[0]?.id || ""); }}
              className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}>
              {PRACTICE_SETS.filter((s) => s.problems.length > 0).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={problemId} onChange={(e) => setProblemId(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}>
              {chosenSet?.problems.map((p) => <option key={p.id} value={p.id}>#{p.id}</option>)}
            </select>
          </div>
        )}
        <ChalkButton variant="primary" icon={Send} onClick={assign} className="w-full justify-center mt-4">Send assignment</ChalkButton>
      </div>
    </div>
  );
}

function ChatToast({ toast, onOpen, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 left-1/2 z-50 animate-[toastIn_.25s_ease]" style={{ transform: "translateX(-50%)" }}>
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.4)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: T.amberDim, color: T.amber }}>
          <MessageSquare size={15} />
        </div>
        <button onClick={onOpen} className="text-left">
          <div style={{ color: T.chalk, fontSize: 12.5, fontWeight: 700 }}>
            {toast.sender === "tutor" ? "Your tutor" : STUDENT} {toast.kind === "assignment" ? "assigned something" : "sent a message"}
          </div>
          <div style={{ color: T.chalkDim, fontSize: 12.5, maxWidth: 260 }} className="truncate">{toast.body}</div>
        </button>
        <button onClick={onDismiss} style={{ color: T.chalkDim }} title="Dismiss"><X size={15} /></button>
      </div>
    </div>
  );
}

function ChatView({ role, chat, onOpenAssign }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    chat.markAllRead(role);
    // eslint-disable-next-line
  }, [chat.messages.length, role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length]);

  const [draft, setDraft] = useState("");
  const submit = () => {
    if (!draft.trim()) return;
    chat.send(draft);
    setDraft("");
  };

  const assignments = chat.messages.filter((m) => m.kind === "assignment");
  const doneCount = assignments.filter((a) => a.assignment_done).length;

  return (
    <div className="animate-[fadein_.3s_ease] flex flex-col" style={{ height: "70vh" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: T.chalk }}>Messages</h2>
          <p style={{ color: T.chalkDim, fontSize: 12.5 }}>
            You're chatting as <b style={{ color: T.chalk }}>{role === "tutor" ? "the tutor" : STUDENT}</b>.
          </p>
        </div>
        {assignments.length > 0 && (
          <Chip tone={doneCount === assignments.length ? "blue" : "amber"}>
            <ClipboardCheck size={11} /> {doneCount}/{assignments.length} assignments done
          </Chip>
        )}
        {role === "tutor" && (
          <ChalkButton variant="primary" icon={ClipboardCheck} onClick={onOpenAssign}>Assign something</ChalkButton>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl p-4 mb-3" style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}` }}>
        {!chat.loaded ? (
          <div style={{ color: T.chalkDim, textAlign: "center", padding: 30 }}>Loading messages...</div>
        ) : chat.messages.length === 0 ? (
          <div style={{ color: T.chalkDim, textAlign: "center", padding: 30, fontSize: 13.5 }}>
            No messages yet — say hi, or {role === "tutor" ? "assign something" : "ask a question about a problem"}.
          </div>
        ) : (
          chat.messages.map((m) => <MessageBubble key={m.id} msg={m} role={role} onMarkDone={chat.markAssignmentDone} />)
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={role === "student" ? "Ask a question about a problem..." : "Type a message..."}
          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm"
          style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, color: T.chalk }}
        />
        <ChalkButton variant="primary" icon={Send} onClick={submit}>Send</ChalkButton>
      </div>
    </div>
  );
}

function NotificationToggle({ role }) {
  const [status, setStatus] = useState("idle"); // idle | working | on | error
  const [msg, setMsg] = useState("");
  const enable = async () => {
    setStatus("working");
    try {
      await enablePushNotifications(role);
      setStatus("on");
      setMsg("Push notifications enabled on this device.");
    } catch (e) {
      setStatus("error");
      setMsg(e.message || "Couldn't enable notifications.");
    }
  };
  return (
    <div className="mb-6">
      <div className="text-sm font-semibold mb-2" style={{ color: T.chalk }}>Notifications</div>
      <p style={{ color: T.chalkDim, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
        Get notified when {role === "tutor" ? STUDENT : "your tutor"} sends a message or assignment — even if this tab isn't open.
      </p>
      <ChalkButton variant={status === "on" ? "blue" : "primary"} icon={status === "on" ? BellRing : Bell} onClick={enable} disabled={status === "working"}>
        {status === "on" ? "Notifications on" : status === "working" ? "Enabling..." : "Enable notifications"}
      </ChalkButton>
      {msg && <p className="mt-2 text-xs" style={{ color: status === "error" ? T.coral : T.blue }}>{msg}</p>}
    </div>
  );
}

function generateHandoffText({ currentSessionId, sessionLog, mastery, hwState, exploredSessionIds = [], checkIns = {}, readiness }) {
  const cur = SESSIONS.find((s) => s.id === currentSessionId) || SESSIONS[0];
  const daysLeft = Math.max(0, Math.ceil((new Date(FINAL_DATE) - new Date()) / 86400000));
  const lines = [];
  lines.push(`CALC 2 TUTORING - SESSION HANDOFF NOTES`);
  lines.push(`Student: ${STUDENT} | Final exam: Aug 18, 2026 (${daysLeft} days away)`);
  lines.push(`Predicted readiness: ${readiness.score}% - ${readiness.verdict}`);
  lines.push(``);
  lines.push(`CURRENT POSITION: Session ${cur.id} - ${cur.title} (${cur.topics.join(", ")})`);
  lines.push(``);
  lines.push(`SESSIONS COMPLETED (${sessionLog.length}):`);
  if (sessionLog.length === 0) lines.push(`  None logged yet.`);
  sessionLog.forEach((s) => {
    lines.push(`  - Session ${s.id}: ${s.title} (${s.topics.join(", ")})`);
    takeawaysForSession(s).forEach((t) => lines.push(`      - ${t}`));
    const pre = checkIns[`pre-${s.id}`];
    const post = checkIns[`post-${s.id}`];
    if (pre?.feeling) lines.push(`      Check-in before: ${pre.feeling}${pre.note ? ` - "${pre.note}"` : ""}`);
    if (post?.feeling) lines.push(`      Check-in after: ${post.feeling}${post.note ? ` - "${post.note}"` : ""}`);
  });
  lines.push(``);
  const exploredSessions = exploredSessionIds.map((id) => SESSIONS.find((s) => s.id === id)).filter(Boolean);
  lines.push(`SESSIONS ${STUDENT.toUpperCase()} EXPLORED ON HIS OWN, OUTSIDE THE OFFICIAL SEQUENCE (${exploredSessions.length}):`);
  if (exploredSessions.length === 0) lines.push(`  None - he's stuck to the official sequence so far.`);
  exploredSessions.forEach((s) => lines.push(`  - Session ${s.id}: ${s.title} (${s.topics.join(", ")})`));
  lines.push(``);
  lines.push(`MASTERY SELF-RATING:`);
  Object.keys(CATEGORIES).forEach((k) => lines.push(`  - ${CATEGORIES[k]}: ${mastery[k] ?? 0}%`));
  lines.push(``);
  const gotIt = Object.entries(hwState).filter(([, v]) => v === "got").map(([k]) => k);
  const flagged = Object.entries(hwState).filter(([, v]) => v === "miss").map(([k]) => k);
  lines.push(`PROBLEMS MARKED "GOT IT" (${gotIt.length}): ${gotIt.length ? gotIt.join(", ") : "none yet"}`);
  lines.push(`PROBLEMS FLAGGED "STILL SHAKY" (${flagged.length}): ${flagged.length ? flagged.join(", ") : "none flagged"}`);
  lines.push(``);
  lines.push(`Please use this to help plan the next tutoring session - prioritize the flagged problems and whatever's next on the roadmap.`);
  return lines.join("\n");
}

function HandoffModal({ open, onClose, appState }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const text = generateHandoffText(appState);
  const daysLeft = Math.max(0, Math.ceil((new Date(FINAL_DATE) - new Date()) / 86400000));
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const printPdf = () => {
    const w = window.open("", "_blank");
    const escaped = text
      .split("\n")
      .map((line) => {
        const isHeader = line === line.toUpperCase() && line.trim().length > 3 && !line.startsWith(" ");
        const safe = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return isHeader ? `<h3>${safe}</h3>` : `<p>${safe || "&nbsp;"}</p>`;
      })
      .join("\n");
    w.document.write(`
      <html>
        <head>
          <title>${STUDENT} - Session Handoff - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 640px; margin: 40px auto; color: #1c2a22; line-height: 1.5; }
            h1 { font-size: 20px; border-bottom: 2px solid #2f6b4f; padding-bottom: 8px; }
            h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #2f6b4f; margin-top: 18px; margin-bottom: 4px; }
            p { font-size: 13px; margin: 2px 0; white-space: pre-wrap; }
            .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Calc 2 Tutoring - Session Handoff</h1>
          <div class="meta">Generated ${new Date().toLocaleString()} - ${daysLeft} days to final exam</div>
          ${escaped}
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-[fadein_.2s_ease]" style={{ background: "rgba(8,20,15,0.7)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl p-6" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6)" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2" style={{ color: T.chalk }}>
            <FileText size={18} />
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18 }}>Session handoff notes</h3>
          </div>
          <button onClick={onClose} style={{ color: T.chalkDim }}><X size={18} /></button>
        </div>
        <p style={{ color: T.chalkDim, fontSize: 13, marginBottom: 12 }}>
          Scans everything logged so far, including check-in feelings and notes. Copy it, or generate a clean printable page you can save as a PDF.
        </p>
        <pre style={{ background: T.bgDeep, border: `1px solid ${T.chalkFaint}`, borderRadius: 8, padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 320, overflowY: "auto", color: T.chalk }}>
          {text}
        </pre>
        <div className="flex gap-2 mt-4 flex-wrap">
          <ChalkButton variant="primary" icon={copied ? CheckCircle2 : Copy} onClick={copy}>{copied ? "Copied!" : "Copy notes"}</ChalkButton>
          <ChalkButton variant="ghost" icon={Download} onClick={printPdf}>Printable PDF</ChalkButton>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily, role, onChangeRole }) {
  const Row = ({ label, children }) => (
    <div className="mb-6">
      <div className="text-sm font-semibold mb-2" style={{ color: T.chalk }}>{label}</div>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
  const Choice = ({ active, onClick, children }) => (
    <button onClick={onClick} className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors" style={active ? { background: T.amber, color: "var(--on-primary)" } : { border: `1px solid ${T.chalkFaint}`, color: T.chalkDim }}>
      {children}
    </button>
  );
  return (
    <div className="animate-[fadein_.3s_ease] max-w-md">
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, marginBottom: 18, color: T.chalk }}>Settings</h2>
      <Row label="Who's using this device">
        <Choice active={role === "student"} onClick={() => onChangeRole("student")}>I'm {STUDENT}</Choice>
        <Choice active={role === "tutor"} onClick={() => onChangeRole("tutor")}>I'm the tutor</Choice>
      </Row>
      <Row label="Theme">
        <Choice active={theme === "auto"} onClick={() => setTheme("auto")}>Auto (by time of day)</Choice>
        <Choice active={theme === "light"} onClick={() => setTheme("light")}>Light</Choice>
        <Choice active={theme === "dark"} onClick={() => setTheme("dark")}>Dark</Choice>
      </Row>
      <Row label="Font size">
        {[0, 1, 2, 3].map((s) => (
          <Choice key={s} active={fontSize === s} onClick={() => setFontSize(s)}>{["S", "M", "L", "XL"][s]}</Choice>
        ))}
      </Row>
      <Row label="Font family">
        <Choice active={fontFamily === "sora"} onClick={() => setFontFamily("sora")}>Sora</Choice>
        <Choice active={fontFamily === "fraunces"} onClick={() => setFontFamily("fraunces")}>Fraunces</Choice>
        <Choice active={fontFamily === "mono"} onClick={() => setFontFamily("mono")}>Mono</Choice>
      </Row>
      <p style={{ color: T.chalkDim, fontSize: 12.5, marginBottom: 20 }}>Settings and progress sync automatically - pick up on laptop or iPad.</p>
      <NotificationToggle role={role} />
      <BackupSection />
    </div>
  );
}

function RoadmapStrip({ sessions, currentId, exploredIds = [], onSelect }) {
  return (
    <div className="relative pl-2">
      <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ borderLeft: `2px dashed ${T.chalkFaint}` }} />
      <div className="space-y-1">
        {sessions.map((s) => {
          const isCurrent = s.id === currentId;
          const isPast = s.id < currentId;
          const isExplored = !isPast && !isCurrent && exploredIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div
                className="relative z-10 flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 22, height: 22,
                  background: isCurrent ? T.amber : isPast ? T.blueDim : T.bgDeep,
                  border: isCurrent ? "none" : `1px solid ${T.chalkFaint}`,
                }}
              >
                {isPast ? <Check size={12} style={{ color: T.blue }} /> : isCurrent ? <span className="w-2 h-2 rounded-full" style={{ background: "var(--on-primary)" }} /> : <Circle size={8} style={{ color: T.chalkDim }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ color: isCurrent ? T.chalk : T.chalkDim, fontSize: 13, fontWeight: isCurrent ? 600 : 400 }}>
                    S{s.id} - {s.title}
                  </span>
                  {s.quiz && <Chip tone="coral">{s.quiz}</Chip>}
                  {isExplored && <Chip tone="blue">Practiced</Chip>}
                </div>
              </div>
              <span className="text-[11px] font-mono" style={{ color: T.chalkDim }}>Wk{s.week}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MasteryRadar({ mastery }) {
  const data = Object.keys(CATEGORIES).map((k) => ({
    subject: CATEGORIES[k].split(" ")[0],
    value: mastery[k] ?? 20,
    fullMark: 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={T.chalkFaint} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: T.chalkDim, fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={T.amber} fill={T.amber} fillOpacity={0.28} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function Dashboard({ role, currentSessionId, examDate, mastery, finalCoverage, sessionLog, exploredSessionIds, hwState, messages, unreadCount, tasks, onOpenChat, onSelectSession, onStartSession, onOpenFlow, onOpenFocus, onOpenTasks }) {
  const currentSession = SESSIONS.find((s) => s.id === currentSessionId) || SESSIONS[0];
  const prevSession = SESSIONS.find((s) => s.id === currentSessionId - 1);
  const prevSessionTakeaways = prevSession && sessionLog.some((s) => s.id === prevSession.id) ? takeawaysForSession(prevSession) : null;

  const daysLeft = examDate ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000)) : null;
  const weakCount = Object.values(hwState).filter((v) => v === "miss").length;
  const lastMessage = messages[messages.length - 1];
  const assignments = messages.filter((m) => m.kind === "assignment");
  const pendingAssignments = assignments.filter((a) => !a.assignment_done).length;
  const todayStr = dateStr(new Date());
  const todayTask = tasks.find((t) => t.date === todayStr);
  const nextSessionTask = tasks.find((t) => t.kind === "session" && !t.done && t.date >= todayStr);
  const exam2Set = PRACTICE_SETS.find((s) => s.id === "exam2");

  return (
    <div className="animate-[fadein_.3s_ease] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: T.amberDim, color: T.amber }}>
            <Flame size={20} />
          </div>
          <div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: T.chalk }}>
              {role === "tutor" ? `${STUDENT}'s dashboard` : `Welcome back, ${STUDENT}.`}
            </h1>
            <p style={{ color: T.chalkDim, fontSize: 14 }}>
              {role === "tutor" ? "Here's where things stand." : "Let's pick up where you left off."}
            </p>
          </div>
        </div>
        <Card className="px-4 py-3 flex items-center gap-3">
          <Calendar size={18} style={{ color: T.amber }} />
          <div>
            <div className="font-mono text-lg font-bold" style={{ color: T.amber }}>{daysLeft} days</div>
            <div className="text-[11px]" style={{ color: T.chalkDim }}>to the final</div>
          </div>
        </Card>
      </div>

      {todayTask && (
        <button
          onClick={onOpenTasks}
          className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5"
          style={{ background: T.amberDim, border: "1px solid rgba(232,196,104,0.4)" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(232,196,104,0.25)", color: T.amber }}>
            <ClipboardCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ color: T.amber, fontSize: 11, fontWeight: 700 }} className="font-mono uppercase tracking-wide">Today's plan</div>
            <div style={{ color: T.chalk, fontSize: 14.5, fontWeight: 600 }}>{todayTask.text}</div>
            {!todayTask.done && nextSessionTask && nextSessionTask.id !== todayTask.id && (
              <div style={{ color: T.chalkDim, fontSize: 12 }}>
                Next session ({nextSessionTask.text}) is coming up — {weakCount > 0 ? `clear those ${weakCount} flagged problems before then.` : "you're clear on flagged problems, nice."}
              </div>
            )}
          </div>
          <ChevronRight size={16} style={{ color: T.amber }} />
        </button>
      )}

      <button
        onClick={onOpenChat}
        className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5"
        style={{ background: unreadCount > 0 ? T.amberDim : T.surface, border: `1px solid ${unreadCount > 0 ? "rgba(232,196,104,0.4)" : T.chalkFaint}` }}
      >
        <div className="relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: unreadCount > 0 ? "rgba(232,196,104,0.25)" : T.surface2, color: unreadCount > 0 ? T.amber : T.chalkDim }}>
          <MessageSquare size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ width: 16, height: 16, background: T.coral, color: "#fff" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ color: T.chalk, fontSize: 15, fontWeight: 600 }}>
            {lastMessage ? (lastMessage.kind === "assignment" ? "Latest: an assignment" : "Latest message") : "No messages yet"}
          </div>
          <div style={{ color: T.chalkDim, fontSize: 12.5 }} className="truncate">
            {lastMessage ? lastMessage.body : "Start a conversation with your " + (role === "tutor" ? "student" : "tutor")}
            {pendingAssignments > 0 ? ` — ${pendingAssignments} assignment${pendingAssignments === 1 ? "" : "s"} pending` : ""}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: T.chalkDim }} />
      </button>

      <div className="grid md:grid-cols-2 gap-4">
        <ReadinessGauge mastery={mastery} daysLeft={daysLeft} />
        <button
          onClick={onOpenFocus}
          className="text-left rounded-xl p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
          style={{ background: weakCount > 0 ? T.coralDim : T.surface, border: `1px solid ${weakCount > 0 ? "rgba(221,120,98,0.4)" : T.chalkFaint}` }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: weakCount > 0 ? "rgba(221,120,98,0.2)" : T.surface2, color: weakCount > 0 ? T.coral : T.chalkDim }}>
            <Flame size={20} />
          </div>
          <div className="flex-1">
            <div style={{ color: T.chalk, fontSize: 15, fontWeight: 600 }}>
              {weakCount > 0 ? `${weakCount} problem${weakCount === 1 ? "" : "s"} flagged shaky` : "No weak spots flagged"}
            </div>
            <div style={{ color: T.chalkDim, fontSize: 12.5 }}>
              {weakCount > 0 ? "One click to review everything you're unsure about" : "Nice - flag anything you're unsure about and it'll show up here"}
            </div>
          </div>
          <ChevronRight size={16} style={{ color: T.chalkDim }} />
        </button>
      </div>

      <button
        onClick={onOpenFlow}
        className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5"
        style={{ background: T.blueDim, border: "1px solid rgba(134,185,196,0.35)" }}
      >
        <Route size={18} style={{ color: T.blue, flexShrink: 0 }} />
        <div className="flex-1">
          <div style={{ color: T.chalk, fontSize: 13, fontWeight: 600 }}>New here? See how this app works</div>
          <div style={{ color: T.chalkDim, fontSize: 12 }}>A quick guide to the dashboard, sessions, and always-available tools.</div>
        </div>
        <ChevronRight size={16} style={{ color: T.blue }} />
      </button>

      {prevSession && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2" style={{ color: T.blue }}>
            <Sparkles size={14} /> <span className="font-mono text-xs uppercase tracking-wide">Previously on My Tutor</span>
          </div>
          <p style={{ color: T.chalk, fontSize: 14, marginBottom: prevSessionTakeaways ? 10 : 0 }}>
            You covered <b>{prevSession.title}</b> ({prevSession.topics.join(", ")}). Today builds directly on that.
          </p>
          {prevSessionTakeaways && (
            <ul className="space-y-1 mt-2">
              {prevSessionTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: T.chalkDim }}>
                  <Check size={12} style={{ color: T.blue, marginTop: 3, flexShrink: 0 }} /> {t}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-6" style={{ background: `linear-gradient(135deg, ${T.surface}, ${T.surface2})`, borderColor: "rgba(232,196,104,0.3)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Chip tone="amber">Session {currentSession.id} - Week {currentSession.week}</Chip>
          {currentSession.quiz && <Chip tone="coral">{currentSession.quiz} today</Chip>}
        </div>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: T.chalk, marginBottom: 6 }}>{currentSession.title}</h2>
        <div className="flex gap-2 mb-4">
          {currentSession.topics.map((t) => <Chip key={t}>{t}</Chip>)}
        </div>
        <ChalkButton variant="primary" icon={PlayCircle} onClick={() => onStartSession(currentSession)}>
          Start today's session
        </ChalkButton>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: T.chalk, marginBottom: 12 }}>Course roadmap</h3>
          <RoadmapStrip sessions={SESSIONS} currentId={currentSessionId} exploredIds={exploredSessionIds} onSelect={onSelectSession} />
        </Card>
        <Card className="p-5">
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: T.chalk, marginBottom: 4 }}>Mastery map</h3>
          <p style={{ color: T.chalkDim, fontSize: 12, marginBottom: 6 }}>% of the final exam's own questions graded "got it," by area</p>
          <MasteryRadar mastery={mastery} />
          <div className="flex items-center justify-center gap-4 mt-2 font-mono text-xs" style={{ color: T.chalkDim }}>
            <span style={{ color: T.amber }}>{finalCoverage.solid} solid</span>
            <span style={{ color: T.coral }}>{finalCoverage.shaky} shaky</span>
            <span>{finalCoverage.untouched} untouched</span>
            <span>· {finalCoverage.total} final exam questions total</span>
          </div>
        </Card>
      </div>

      {exam2Set && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2" style={{ color: T.blue }}>
            <BookMarked size={15} /> <span className="font-mono text-xs uppercase tracking-wide">Practice Bank extras</span>
          </div>
          <p style={{ color: T.chalkDim, fontSize: 12.5, marginBottom: 8 }}>
            Every session's Practice step is now built directly from the actual final exam's questions. This reference set in the Practice Bank (labeled "Exam 2") is additional sequences/series/power-series drilling in the same style, not required.
          </p>
          <p style={{ color: T.chalk, fontSize: 13.5 }}>{exam2Set.topics}</p>
        </Card>
      )}
    </div>
  );
}

export default function CalcTutorApp() {
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const [currentSessionId, setCurrentSessionId] = useState(2);
  const [activeSession, setActiveSession] = useState(null);
  const [examDate] = useState(FINAL_DATE);
  const [openFormula, setOpenFormula] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [sessionLog, setSessionLog] = useState([]);
  const [hwState, setHwState] = useState({});
  // Mastery Map is now computed live from hwState against the final exam's
  // own tagged questions — real "% solid" per category, not a manual
  // per-session increment.
  const mastery = useMemo(() => computeFinalMastery(hwState), [hwState]);
  const finalCoverage = useMemo(() => computeFinalCoverage(hwState), [hwState]);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [exploredSessionIds, setExploredSessionIds] = useState([]);
  const [checkIns, setCheckIns] = useState({});
  const [role, setRole] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [flashBoxes, setFlashBoxes] = useState({});
  const [pendingPracticeSet, setPendingPracticeSet] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dailyPlanOpen, setDailyPlanOpen] = useState(false);

  const [theme, setTheme] = useState("auto");
  const [fontSize, setFontSize] = useState(2);
  const [fontFamily, setFontFamily] = useState("sora");

  const chat = useChat(role);

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  const pickRole = (r) => {
    setRole(r);
    setStoredRole(r);
  };

  useEffect(() => {
    (async () => {
      const [sid, log, hw, th, fs, ff, explored, ci, boxes, savedTasks, lastSeenDaily] = await Promise.all([
        loadState("current-session-id", 2),
        loadState("session-log", []),
        loadState("hw-state", {}),
        loadState("theme", "auto"),
        loadState("font-size", 2),
        loadState("font-family", "sora"),
        loadState("explored-sessions", []),
        loadState("check-ins", {}),
        loadState("flash-boxes", {}),
        loadState("tasks", null),
        loadState("last-seen-daily-plan", null),
      ]);
      setCurrentSessionId(sid);
      setSessionLog(log);
      setHwState(hw);
      setTheme(th);
      setFontSize(fs);
      setFontFamily(ff);
      setExploredSessionIds(explored);
      setCheckIns(ci);
      setFlashBoxes(boxes);

      let taskList = savedTasks;
      if (!taskList || taskList.length === 0) {
        taskList = buildTaskPlan(sid);
        saveState("tasks", taskList);
      }
      setTasks(taskList);

      const today = dateStr(new Date());
      if (lastSeenDaily !== today) {
        setDailyPlanOpen(true);
        saveState("last-seen-daily-plan", today);
      }

      setLoaded(true);
      runDailySnapshotIfNeeded();
    })();
  }, []);

  const toggleTask = (id, done) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, done } : t));
    setTasks(next);
    saveState("tasks", next);
  };

  const addTask = (date, text) => {
    const newTask = { id: `custom-${Date.now()}`, date, text, done: false, kind: "custom" };
    const next = [...tasks, newTask].sort((a, b) => a.date.localeCompare(b.date));
    setTasks(next);
    saveState("tasks", next);
    if (date === dateStr(new Date()) && role === "tutor") {
      sendPushToOther("student", "Your tutor", `New task: ${text}`);
    }
  };

  const deleteTask = (id) => {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    saveState("tasks", next);
  };

  const setThemeAndSave = (t) => { setTheme(t); saveState("theme", t); };
  const setFontSizeAndSave = (s) => { setFontSize(s); saveState("font-size", s); };
  const setFontFamilyAndSave = (f) => { setFontFamily(f); saveState("font-family", f); };

  const gradeProblem = (id, val) => {
    const next = { ...hwState, [id]: val };
    setHwState(next);
    saveState("hw-state", next);
  };

  const saveCheckIn = (key, value) => {
    const next = { ...checkIns, [key]: value };
    setCheckIns(next);
    saveState("check-ins", next);
  };

  const saveFlashBoxes = (boxes) => {
    setFlashBoxes(boxes);
    saveState("flash-boxes", boxes);
  };

  const startSession = (session) => { setActiveSession(session); setView("session"); };
  const completeSession = (id, wasOfficial) => {
    const finished = SESSIONS.find((s) => s.id === id);

    if (wasOfficial) {
      const nextId = Math.min(id + 1, SESSIONS.length);
      setCurrentSessionId(nextId);
      saveState("current-session-id", nextId);
      if (finished && !sessionLog.some((s) => s.id === finished.id)) {
        const log = [...sessionLog, finished];
        setSessionLog(log);
        saveState("session-log", log);
      }
    } else if (!exploredSessionIds.includes(id)) {
      const explored = [...exploredSessionIds, id];
      setExploredSessionIds(explored);
      saveState("explored-sessions", explored);
    }

    setActiveSession(null);
    setView("dashboard");
  };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "tasks", label: "Tasks", icon: ClipboardCheck },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "practice", label: "Practice Bank", icon: ClipboardList },
    { id: "focus", label: "Focus Session", icon: Flame },
    { id: "formulas", label: "Formula Sheet", icon: BookOpen },
    { id: "mockexam", label: "Mock Exam", icon: Timer },
    { id: "flashcards", label: "Flashcards", icon: Layers },
    { id: "flow", label: "How It Works", icon: Route },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const unreadCount = unreadCountFor(chat.messages, role);

  const hour = new Date().getHours();
  const autoDark = hour < 7 || hour >= 18;
  const isDark = theme === "dark" || (theme === "auto" && autoDark);
  const cssVars = isDark ? DARK_VARS : LIGHT_VARS;
  const fontFamilyMap = {
    sora: "'Sora', -apple-system, sans-serif",
    fraunces: "'Fraunces', Georgia, serif",
    mono: "'JetBrains Mono', monospace",
  };
  const fontSizeMap = { 0: 14, 1: 15, 2: 16, 3: 18 };
  const daysLeft = Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000));
  const readiness = computeReadiness(mastery, daysLeft);
  const weakCount = Object.values(hwState).filter((v) => v === "miss").length;

  return (
    <div style={{ ...cssVars, minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: fontFamilyMap[fontFamily], fontSize: fontSizeMap[fontSize], position: "relative", transition: "background .25s ease, color .25s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500;1,9..144,600&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes fadein { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none; } }
        @keyframes popin { from { opacity:0; transform: scale(.94) translateY(8px);} to { opacity:1; transform:scale(1) translateY(0);} }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(95,174,130,0.35);} 50% { box-shadow: 0 0 0 10px rgba(95,174,130,0);} }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideInRight { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity:0; transform: translateX(-16px); } to { opacity:1; transform: translateX(0); } }
        @keyframes viewFadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes checkPop { 0% { transform: scale(0.6); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        * { box-sizing: border-box; }
        ::selection { background: ${T.amber}; color: var(--on-primary); }
        body { margin:0; }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: T.amber, color: "var(--on-primary)" }}>&#8747;</div>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, color: T.chalk, fontWeight: 600 }}>My Tutor</span>
          </div>
          <div className="flex gap-1 rounded-full p-1 flex-wrap" style={{ background: T.surface, border: `1px solid ${T.chalkFaint}` }}>
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={view === n.id ? { background: T.amber, color: "var(--on-primary)" } : { color: T.chalkDim }}
              >
                <n.icon size={14} /> <span className="hidden sm:inline">{n.label}</span>
                {n.id === "focus" && weakCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-mono text-[9px] font-bold"
                    style={{ width: 15, height: 15, background: T.coral, color: "#fff" }}
                  >
                    {weakCount > 9 ? "9+" : weakCount}
                  </span>
                )}
                {n.id === "messages" && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-mono text-[9px] font-bold"
                    style={{ width: 15, height: 15, background: T.coral, color: "#fff" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <button
              onClick={() => setHandoffOpen(true)}
              title="Scan progress & generate handoff notes"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, color: T.amber }}
            >
              <FileText size={15} />
            </button>
            <button
              onClick={() => setThemeAndSave(isDark ? "light" : "dark")}
              title="Toggle theme"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: T.surface, border: `1px solid ${T.chalkFaint}`, color: T.amber }}
            >
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>

        {!loaded ? (
          <div className="flex flex-col items-center justify-center" style={{ color: T.chalkDim, padding: 80 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${T.chalkFaint}`, borderTopColor: T.amber, animation: "spin 0.8s linear infinite", marginBottom: 14 }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading {STUDENT}'s progress...
          </div>
        ) : (
          <div key={view} style={{ animation: "viewFadeIn .35s cubic-bezier(.2,.85,.3,1)" }}>
            {view === "dashboard" && (
              <Dashboard
                role={role}
                currentSessionId={currentSessionId}
                examDate={examDate}
                mastery={mastery}
                finalCoverage={finalCoverage}
                sessionLog={sessionLog}
                exploredSessionIds={exploredSessionIds}
                hwState={hwState}
                messages={chat.messages}
                unreadCount={unreadCount}
                tasks={tasks}
                onOpenChat={() => setView("messages")}
                onSelectSession={(s) => startSession(s)}
                onStartSession={startSession}
                onOpenFlow={() => setView("flow")}
                onOpenFocus={() => setView("focus")}
                onOpenTasks={() => setView("tasks")}
              />
            )}
            {view === "tasks" && <TasksView tasks={tasks} onToggle={toggleTask} onAdd={addTask} onDelete={deleteTask} />}
            {view === "session" && activeSession && (
              <SessionFlow
                session={activeSession}
                isOfficial={activeSession.id === currentSessionId}
                onExit={() => setView("dashboard")}
                onComplete={completeSession}
                onOpenFormula={setOpenFormula}
                hwState={hwState}
                onGradeProblem={gradeProblem}
                checkIns={checkIns}
                onSaveCheckIn={saveCheckIn}
              />
            )}
            {view === "messages" && (
              <ChatView role={role} chat={chat} onOpenAssign={() => setAssignModalOpen(true)} />
            )}
            {view === "practice" && (
              <PracticeBankView hwState={hwState} onGradeProblem={gradeProblem} initialSetId={pendingPracticeSet} onConsumeInitial={() => setPendingPracticeSet(null)} />
            )}
            {view === "focus" && <FocusSessionView hwState={hwState} onGradeProblem={gradeProblem} onOpenFormula={setOpenFormula} />}
            {view === "formulas" && <FormulaSheetView onOpenFormula={setOpenFormula} />}
            {view === "mockexam" && <MockExamView hwState={hwState} onGradeProblem={gradeProblem} />}
            {view === "flashcards" && <FlashcardsView flashBoxes={flashBoxes} onSaveBoxes={saveFlashBoxes} />}
            {view === "flow" && <AppFlowView />}
            {view === "settings" && (
              <SettingsView theme={theme} setTheme={setThemeAndSave} fontSize={fontSize} setFontSize={setFontSizeAndSave} fontFamily={fontFamily} setFontFamily={setFontFamilyAndSave} role={role} onChangeRole={pickRole} />
            )}
          </div>
        )}
      </div>

      <FormulaModal formula={openFormula} onClose={() => setOpenFormula(null)} />
      <HandoffModal
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        appState={{ currentSessionId, sessionLog, mastery, hwState, exploredSessionIds, checkIns, readiness }}
      />
      <AssignProblemModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={(text, ref) => chat.send(text, "assignment", ref)}
      />
      <ChatToast
        toast={chat.toast}
        onOpen={() => { setView("messages"); chat.setToast(null); }}
        onDismiss={() => chat.setToast(null)}
      />
      <RoleModal open={loaded && !role} onPick={pickRole} />
      <DailyPlanModal
        open={dailyPlanOpen && loaded}
        onClose={() => setDailyPlanOpen(false)}
        todayTask={tasks.find((t) => t.date === dateStr(new Date()))}
        weakCount={weakCount}
        pendingAssignments={chat.messages.filter((m) => m.kind === "assignment" && !m.assignment_done).length}
      />
    </div>
  );
}
