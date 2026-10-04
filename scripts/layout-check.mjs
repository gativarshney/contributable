// Opens every main page at phone, tablet and desktop widths and fails when anything
// reaches past the edge of the screen. Needs a running site and a Chrome or Edge binary.
//
//   BASE_URL=http://localhost:3210 node scripts/layout-check.mjs
//   CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" ...
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "google-chrome";
const WIDTHS = [360, 375, 414, 768, 1024, 1280];
const PAGES = [
  "/",
  "/explore",
  "/gsoc",
  "/gsoc/the-linux-foundation",
  "/issues",
  "/check",
  "/start",
  "/match?stack=python",
  "/compare",
  "/repo/OpenPrinting/cups",
  "/about",
  "/methodology",
  "/status",
  "/guide",
  "/saved",
];

// Runs in the page: elements whose box reaches past the screen, ignoring things that
// are meant to: marquees, scroll boxes, hidden info bubbles and the 3D canvas.
const PROBE = `JSON.stringify((() => {
  const width = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.right <= width + 1 && box.left >= -1) continue;
    if (el.closest(".logo-wall, .overflow-x-auto, .overflow-auto, [role=tooltip], canvas, nav[aria-label='On this page'], nav[aria-label='Steps']")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden") continue;
    const child = [...el.children].some((c) => {
      const b = c.getBoundingClientRect();
      return b.width > 0 && (b.right > width + 1 || b.left < -1);
    });
    if (!child) out.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 50) + " [" + Math.round(box.left) + ".." + Math.round(box.right) + "]");
  }
  return { width, scroll: document.documentElement.scrollWidth, out: out.slice(0, 5) };
})())`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "layout-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

let target;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
if (!target) {
  console.error(`Could not start ${CHROME}.`);
  chrome.kill();
  process.exit(2);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id))
    pending.get(message.id)(message.result ?? message);
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

let failures = 0;
for (const width of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  for (const path of PAGES) {
    await send("Page.navigate", { url: BASE + path });
    await sleep(2500);
    const result = await send("Runtime.evaluate", { expression: PROBE });
    const { scroll, out } = JSON.parse(result.result.value);
    const ok = scroll <= width && out.length === 0;
    if (!ok) {
      failures += 1;
      console.log(`FAIL ${width}px ${path}: page ${scroll}px wide`);
      for (const line of out) console.log(`     ${line}`);
    }
  }
  console.log(`checked ${PAGES.length} pages at ${width}px`);
}

ws.close();
chrome.kill();
if (failures) {
  console.log(`${failures} layout problem(s).`);
  process.exit(1);
}
console.log("No page reaches past the screen at any width.");
