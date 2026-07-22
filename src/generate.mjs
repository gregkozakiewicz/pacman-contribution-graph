import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchCalendar, demoCalendar } from "./contributions.mjs";
import { buildSvg } from "./svg.mjs";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, def) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const out = val("--out", "dist");
const demo = has("--demo");
const username = val("--user", process.env.GH_USERNAME);
const token = process.env.GITHUB_TOKEN;

const grid = demo
  ? demoCalendar()
  : await fetchCalendar({ username, token });

if (!demo && (!username || !token)) {
  console.error("Need --user (or GH_USERNAME) and GITHUB_TOKEN env var.");
  process.exit(1);
}

mkdirSync(out, { recursive: true });
const svg = buildSvg(grid);
writeFileSync(join(out, "pacman.svg"), svg);
console.log(`Wrote ${join(out, "pacman.svg")} (${(svg.length / 1024).toFixed(1)} KB)`);
