import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const INPUTS = [
  "docs/catalogue-coverage/bandai-extraction-op01-op05-2026-11-27.json",
  "docs/catalogue-coverage/bandai-extraction-op06-op10-2026-11-27.json",
  "docs/catalogue-coverage/bandai-extraction-op11-op17-2026-11-27.json",
  "docs/catalogue-coverage/bandai-extraction-jp-op15-op18-2026-11-27.json",
  "docs/catalogue-coverage/bandai-extraction-op15-op18-eb05-2026-11-27.json",
  "docs/catalogue-coverage/bandai-extraction-eb-prb-2026-11-27.json",
];
const MATRIX = "docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json";
const OUTPUT = "artifacts/official-bandai-image-http-audit.json";
const CONCURRENCY = Math.max(1, Number(process.env.IMAGE_AUDIT_CONCURRENCY || 8));
const TIMEOUT_MS = Math.max(1000, Number(process.env.IMAGE_AUDIT_TIMEOUT_MS || 12000));

export function expectedHostForLanguage(language) {
  const normalized = language === "en" ? "English" : language === "jp" ? "Japanese" : language;
  if (normalized === "English") return "en.onepiece-cardgame.com";
  if (normalized === "Japanese") return "www.onepiece-cardgame.com";
  return null;
}

export function classifyImageHttpResult({ status, contentType = "", language, url }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "INVALID_URL";
  }
  const expectedHost = expectedHostForLanguage(language);
  if (!expectedHost || parsed.protocol !== "https:" || parsed.hostname !== expectedHost) {
    return "INVALID_URL";
  }
  if (status === 404 || status === 410) return "MISSING";
  if (status === 200 || status === 206) {
    return /^image\//i.test(contentType) ? "LOADED" : "INVALID_URL";
  }
  if (status === 401 || status === 403 || status === 408 || status === 425 || status === 429 || status >= 500) {
    return "TEMPORARY_FAILURE";
  }
  if (status >= 400 && status < 500) return "INVALID_URL";
  return "TEMPORARY_FAILURE";
}

function addUrl(map, url, set, language, imageId = null) {
  if (typeof url !== "string" || !url.trim()) return;
  const item = map.get(url) || { url, associations: [] };
  const association = { set, language, image_id: imageId };
  if (!item.associations.some(x => x.set === set && x.language === language && x.image_id === imageId)) {
    item.associations.push(association);
  }
  map.set(url, item);
}

function collectUrls() {
  const urls = new Map();
  for (const relativePath of INPUTS) {
    const data = JSON.parse(readFileSync(resolve(ROOT, relativePath), "utf8"));
    for (const row of data.rows || []) {
      for (const url of row.official_card_image_urls || []) {
        addUrl(urls, url, row.set, row.language);
      }
    }
  }
  const matrix = JSON.parse(readFileSync(resolve(ROOT, MATRIX), "utf8"));
  for (const row of matrix.rows || []) {
    for (const entry of row.official_printing_entries || []) {
      addUrl(urls, entry.official_image_url, row.set, row.language, entry.official_image_id);
    }
  }
  return [...urls.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function checkOne(item) {
  const languageHosts = [...new Set(item.associations.map(x => expectedHostForLanguage(x.language)))];
  let parsed;
  try {
    parsed = new URL(item.url);
  } catch {
    return { ...item, status: "INVALID_URL", status_code: null, content_type: null, elapsed_ms: 0, final_url: null, error: "URL parsing failed" };
  }
  if (languageHosts.length !== 1 || !languageHosts[0] || parsed.protocol !== "https:" || parsed.hostname !== languageHosts[0]) {
    return { ...item, status: "INVALID_URL", status_code: null, content_type: null, elapsed_ms: 0, final_url: null, error: "Official image host does not match the source language" };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(item.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "GrandLineArchiveOfficialImageAudit/1.0" },
    });
    const contentType = response.headers.get("content-type") || "";
    const result = {
      ...item,
      status: classifyImageHttpResult({ status: response.status, contentType, language: item.associations[0]?.language, url: item.url }),
      status_code: response.status,
      content_type: contentType,
      elapsed_ms: Date.now() - started,
      final_url: response.url,
      error: null,
    };
    try { await response.body?.cancel(); } catch {}
    return result;
  } catch (error) {
    const timedOut = controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError";
    return {
      ...item,
      status: timedOut ? "TIMEOUT" : "TEMPORARY_FAILURE",
      status_code: null,
      content_type: null,
      elapsed_ms: Date.now() - started,
      final_url: null,
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runImageAudit() {
  const inputs = collectUrls();
  if (!inputs.length) throw new Error("No official image URLs were found in the audit source files.");
  const results = new Array(inputs.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= inputs.length) return;
      results[index] = await checkOne(inputs[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, worker));

  const summary = Object.fromEntries(
    ["LOADED", "MISSING", "INVALID_URL", "TIMEOUT", "TEMPORARY_FAILURE"].map(status => [
      status, results.filter(result => result.status === status).length,
    ]),
  );
  const report = {
    retrieved_at: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    branch: process.env.GITHUB_REF_NAME || null,
    timeout_ms: TIMEOUT_MS,
    concurrency: CONCURRENCY,
    unique_official_image_urls: inputs.length,
    summary,
    results,
  };
  mkdirSync(dirname(resolve(ROOT, OUTPUT)), { recursive: true });
  writeFileSync(resolve(ROOT, OUTPUT), JSON.stringify(report, null, 2) + "\n");
  const markdown = [
    "## Official Bandai image HTTP audit",
    "",
    `Unique official image URLs checked: **${inputs.length}**`,
    "",
    ...Object.entries(summary).map(([status, count]) => `- ${status}: **${count}**`),
    "",
    `Full per-URL results: workflow artifact \`official-bandai-image-http-audit\`.`,
    "",
  ].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(JSON.stringify({ unique_official_image_urls: inputs.length, summary }));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runImageAudit();
}
