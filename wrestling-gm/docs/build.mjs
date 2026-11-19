// בונה את כל מסמכי ה-Markdown שב-docs/ לדפי HTML בעיצוב האחיד.
// שימוש:  cd wrestling-gm/docs && npm install && node build.mjs
// פלט: docs/dist/<שם>.html (מתאים לפרסום כדף, וגם נפתח ישירות בדפדפן).
//
// פורמט קובץ מקור: front matter בראש הקובץ:
// ---
// title: מסמך אפיון
// kind: מסמך אפיון
// version: 0.1
// date: 2026-11-19
// status: טיוטה
// lead: משפט פתיחה אחד.
// ---
// תוספות תחביר:  > [!החלטה] / > [!לאמת] / > [!הערה] / > [!לגרסה שלנו]  בתחילת ציטוט,
// ו-[[לאמת]] בתוך שורה לתגית "לאמת".
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "template", "style.css"), "utf8");
const shell = readFileSync(join(here, "template", "page.html"), "utf8");
const outDir = join(here, "dist");
mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return [meta, src.slice(m[0].length)];
}

const calloutKinds = { "החלטה": "decision", "לאמת": "verify", "הערה": "note", "לגרסה שלנו": "ours" };

function build(file) {
  const [meta, body] = frontMatter(readFileSync(join(here, file), "utf8"));
  const toc = [];
  let n = 0;
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    if (depth === 2) {
      n += 1;
      const id = `s${n}`;
      toc.push({ id, n, text });
      return `<h2 id="${id}"><span class="n">${String(n).padStart(2, "0")}</span><span>${text}</span></h2>\n`;
    }
    return `<h${depth}>${text}</h${depth}>\n`;
  };
  renderer.table = function (token) {
    return `<div class="table-wrap">${marked.Renderer.prototype.table.call(this, token)}</div>\n`;
  };
  renderer.blockquote = function ({ tokens }) {
    const inner = this.parser.parse(tokens);
    const m = inner.match(/^<p>\[!([^\]]+)\]\s*(?:<br>)?\s*/);
    if (m && calloutKinds[m[1]]) {
      const rest = inner.replace(m[0], "<p>").replace(/<p>\s*<\/p>/, "");
      return `<div class="callout ${calloutKinds[m[1]]}"><p class="callout-label">${esc(m[1])}</p>${rest}</div>\n`;
    }
    return `<blockquote>${inner}</blockquote>\n`;
  };
  marked.use({ renderer, gfm: true });
  let html = marked.parse(body);
  html = html.replace(/\[\[לאמת\]\]/g, '<span class="badge">לאמת</span>');

  const tocHtml = toc.map((t) => `<li><a href="#${t.id}"><span class="n">${String(t.n).padStart(2, "0")}</span><span>${t.text}</span></a></li>`).join("");
  const page = shell
    .replaceAll("{{title}}", esc(meta.title || basename(file, ".md")))
    .replace("{{css}}", css)
    .replace("{{kind}}", esc(meta.kind || "מסמך"))
    .replace("{{version}}", esc(meta.version || "0.1"))
    .replace("{{date}}", esc(meta.date || ""))
    .replace("{{status}}", esc(meta.status || "טיוטה"))
    .replace("{{lead}}", esc(meta.lead || ""))
    .replace("{{toc}}", tocHtml)
    .replace("{{content}}", html)
    .replace("{{source}}", esc(`wrestling-gm/docs/${file}`));
  const out = join(outDir, basename(file, ".md") + ".html");
  writeFileSync(out, page);
  console.log("built", out);
}

for (const f of readdirSync(here).filter((f) => f.endsWith(".md") && f !== "README.md")) build(f);
