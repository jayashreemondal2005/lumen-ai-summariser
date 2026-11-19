// Black-box security check against a running Lumen deployment.
// Usage: node scripts/security-check.mjs https://lumen-ai-summariser.netlify.app
// Writes reports/raw/security.json and prints a summary. Makes no AI calls:
// every probe is rejected before the model is reached, or is a cheap health call.
import { mkdirSync, writeFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const results = [];
const record = (group, name, pass, detail = "") => {
  results.push({ group, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  [${group}] ${name}${detail ? `  (${detail})` : ""}`);
};

async function post(path, body, headers = {}) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* streamed or empty */
  }
  return { status: res.status, json, headers: res.headers };
}

// 1. Security headers on pages and APIs
{
  const res = await fetch(base + "/");
  const h = res.headers;
  const csp = h.get("content-security-policy") || "";
  record("headers", "Content-Security-Policy present", csp.length > 0);
  for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
    record("headers", `CSP has ${d}`, csp.includes(d));
  }
  record("headers", "CSP connect-src is restricted", /connect-src 'self'( https:\/\/[a-z0-9]+\.supabase\.co wss:\/\/[a-z0-9]+\.supabase\.co)?(;|$)/.test(csp));
  record("headers", "Strict-Transport-Security", (h.get("strict-transport-security") || "").includes("max-age="));
  record("headers", "X-Frame-Options DENY", h.get("x-frame-options") === "DENY");
  record("headers", "X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
  record("headers", "Referrer-Policy", h.get("referrer-policy") === "strict-origin-when-cross-origin");
  record("headers", "Permissions-Policy", (h.get("permissions-policy") || "").includes("camera=()"));
  record("headers", "Cross-Origin-Opener-Policy", h.get("cross-origin-opener-policy") === "same-origin");
  record("headers", "No X-Powered-By", !h.get("x-powered-by"));
  const api = await fetch(base + "/api/health");
  record("headers", "API responses are not cached", (api.headers.get("cache-control") || "").includes("no-store"));
  const health = await api.json();
  record("secrets", "Health endpoint exposes no secret values", !JSON.stringify(health).match(/gsk_|sb_secret|AIza|@gmail\.com/));
}

// 2. SSRF probes (all must be refused before any network fetch or AI call)
const ssrf = [
  "http://127.0.0.1/",
  "http://localhost/",
  "http://0.0.0.0/",
  "http://2130706433/",
  "http://0x7f.0.0.1/",
  "http://017700000001/",
  "http://169.254.169.254/latest/meta-data/",
  "http://metadata.google.internal/computeMetadata/v1/",
  "http://10.0.0.1/",
  "http://172.16.0.1/",
  "http://192.168.0.1/",
  "http://100.64.0.1/",
  "http://[::1]/",
  "http://[::ffff:127.0.0.1]/",
  "http://[fd00::1]/",
  "http://[fe80::1]/",
  "http://example.com:22/",
  "http://example.com:6379/",
  "file:///etc/passwd",
  "gopher://127.0.0.1:25/",
  "ftp://example.com/",
  "javascript:alert(1)",
  "http://user:pass@example.com/",
  "http://intranet/",
  "http://printer.local/",
];
for (const url of ssrf) {
  const r = await post("/api/summarise", { url });
  const code = r.json?.error?.code;
  record("ssrf", url, r.status === 400 && ["BLOCKED_HOST", "BLOCKED_PORT", "UNSUPPORTED_SCHEME", "INVALID_URL"].includes(code), `${r.status} ${code}`);
}
// Same guard on the Ask endpoint
for (const url of ["http://169.254.169.254/", "http://[::1]/"]) {
  const r = await post("/api/ask", { url, question: "What is here?" });
  record("ssrf", `ask: ${url}`, r.status === 400, `${r.status} ${r.json?.error?.code}`);
}

// 3. Input validation and CSRF defences
{
  const cross = await post("/api/summarise", { url: "example.com" }, { Origin: "https://evil.example" });
  record("validation", "Cross-origin POST rejected", cross.status === 403, String(cross.status));
  const crossTicket = await post("/api/tickets", { name: "x" }, { Origin: "https://evil.example" });
  record("validation", "Cross-origin ticket rejected", crossTicket.status === 403, String(crossTicket.status));
  const bad = await post("/api/summarise", "{not json");
  record("validation", "Malformed JSON rejected", bad.status === 400, String(bad.status));
  const big = await post("/api/summarise", { url: "https://example.com/" + "a".repeat(5000) });
  record("validation", "Oversized body rejected", big.status === 400, String(big.status));
  const enumBad = await post("/api/summarise", { url: "example.com", length: "huge" });
  record("validation", "Unknown option rejected", enumBad.status === 400, String(enumBad.status));
  const ticketBad = await post("/api/tickets", { name: "A", email: "nope", subject: "x", message: "short" });
  record("validation", "Invalid ticket rejected", ticketBad.status === 400, String(ticketBad.status));
  const rewriteBad = await post("/api/rewrite", { mode: "poem", content: {} });
  record("validation", "Invalid rewrite rejected", rewriteBad.status === 400, String(rewriteBad.status));
  const taraBad = await post("/api/tara", { message: "x".repeat(700) });
  record("validation", "Overlong Tara message rejected", taraBad.status === 400, String(taraBad.status));
}

// 4. Authorisation: owner-only data needs a session
for (const [m, p] of [
  ["GET", "/api/summaries"],
  ["DELETE", "/api/summaries"],
  ["GET", "/api/summaries/00000000-0000-4000-8000-000000000000"],
  ["GET", "/api/account"],
  ["DELETE", "/api/account"],
]) {
  const res = await fetch(base + p, { method: m });
  record("authz", `${m} ${p} without a session`, res.status === 401, String(res.status));
}

// 4b. Auth callback never redirects off-site (open-redirect) or to an internal host
for (const q of ["", "?next=//evil.example", "?next=https://evil.example", "?next=/%5Cevil.example"]) {
  const res = await fetch(`${base}/auth/callback${q}`, { redirect: "manual" });
  const loc = res.headers.get("location") || "";
  let host = "";
  try {
    host = new URL(loc, base).host;
  } catch {
    host = "";
  }
  record("authz", `auth/callback${q || " (no code)"} stays on the site`, res.status >= 300 && res.status < 400 && host === new URL(base).host, loc.slice(0, 70));
}

// 5. Client bundle contains no server secrets
{
  const html = await (await fetch(base + "/")).text();
  const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
  let bundle = "";
  for (const s of scripts) bundle += await (await fetch(base + s)).text();
  record("secrets", `Scanned ${scripts.length} client scripts`, scripts.length > 0, `${Math.round(bundle.length / 1024)} KB`);
  for (const needle of ["GROQ_API_KEY", "SUPABASE_SECRET_KEY", "SMTP_PASS", "IP_HASH_SALT"]) {
    record("secrets", `Bundle has no "${needle}"`, !bundle.includes(needle));
  }
  // Key-shaped values (the bare prefixes appear in supabase-js's own key-type check).
  for (const [label, re] of [
    ["Groq key (gsk_...)", /gsk_[A-Za-z0-9]{20,}/],
    ["Supabase secret key (sb_secret_...)", /sb_secret_[A-Za-z0-9_-]{16,}/],
    ["Google API key (AIza...)", /AIza[0-9A-Za-z_-]{30,}/],
    ["JWT service_role token", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS/],
  ]) {
    record("secrets", `Bundle has no ${label}`, !re.test(bundle));
  }
}

const passed = results.filter((r) => r.pass).length;
const summary = { base, when: new Date().toISOString(), total: results.length, passed, failed: results.length - passed, results };
mkdirSync("reports/raw", { recursive: true });
writeFileSync("reports/raw/security.json", JSON.stringify(summary, null, 2));
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
