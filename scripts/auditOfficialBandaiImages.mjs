import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const INVENTORIES = [
  "docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-01.json",
  "docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-02.json",
  "docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-03.json",
  "docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-04.json",
  "docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-05.json",
];
const BEST_SELECTION = "docs/catalogue-coverage/official-premium-card-collection-best-selection-vol6.json";
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
  for (const relativePath of INVENTORIES) {
    const data = JSON.parse(readFileSync(resolve(ROOT, relativePath), "utf8"));
    for (const page of data.pages || []) {
      for (const entry of page.entries || []) {
        const imageId = typeof entry.image_url === "string"
          ? (entry.image_url.match(/\/([^/?#]+)\.(?:png|webp|jpg|jpeg)(?:[?#]|$)/i) || [])[1] || null
          : null;
        addUrl(urls, entry.image_url, page.set, page.language, imageId);
        if (page.language === "English" && (page.set === "OP-14" || page.set === "OP-15") && entry.card_number?.startsWith("EB04-")) {
          addUrl(urls, entry.image_url, "EB-04", "English", imageId);
        }
      }
    }
  }
  const bestSelection = JSON.parse(readFileSync(resolve(ROOT, BEST_SELECTION), "utf8"));
  for (const card of bestSelection.cards || []) {
    const imageId = typeof card.official_product_image_url === "string"
      ? (card.official_product_image_url.match(/\/([^/?#]+)\.(?:png|webp|jpg|jpeg)(?:[?#]|$)/i) || [])[1] || null
      : null;
    addUrl(urls, card.official_product_image_url, "Best Selection Vol.6", "English", imageId);
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
