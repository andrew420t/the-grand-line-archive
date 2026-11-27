import test from "node:test";
import assert from "node:assert/strict";
import { classifyImageHttpResult, collectUrls, expectedHostForLanguage } from "../scripts/auditOfficialBandaiImages.mjs";

const en = "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png?261124";
const jp = "https://www.onepiece-cardgame.com/images/cardlist/card/OP01-001.png?261124";

test("official source host remains language-specific", () => {
  assert.equal(expectedHostForLanguage("English"), "en.onepiece-cardgame.com");
  assert.equal(expectedHostForLanguage("Japanese"), "www.onepiece-cardgame.com");
  assert.equal(expectedHostForLanguage("en"), "en.onepiece-cardgame.com");
  assert.equal(expectedHostForLanguage("jp"), "www.onepiece-cardgame.com");
});

test("successful image GET is classified as loaded", () => {
  assert.equal(classifyImageHttpResult({ status: 200, contentType: "image/png", language: "English", url: en }), "LOADED");
  assert.equal(classifyImageHttpResult({ status: 206, contentType: "image/webp", language: "Japanese", url: jp }), "LOADED");
});

test("confirmed absent image response is classified as missing", () => {
  assert.equal(classifyImageHttpResult({ status: 404, contentType: "text/html", language: "English", url: en }), "MISSING");
  assert.equal(classifyImageHttpResult({ status: 410, contentType: "text/html", language: "Japanese", url: jp }), "MISSING");
});

test("malformed, wrong-host and non-image references are invalid", () => {
  assert.equal(classifyImageHttpResult({ status: 200, contentType: "text/html", language: "English", url: en }), "INVALID_URL");
  assert.equal(classifyImageHttpResult({ status: 200, contentType: "image/png", language: "English", url: jp }), "INVALID_URL");
  assert.equal(classifyImageHttpResult({ status: 400, contentType: "text/html", language: "English", url: en }), "INVALID_URL");
  assert.equal(classifyImageHttpResult({ status: 200, contentType: "image/png", language: "English", url: "not a url" }), "INVALID_URL");
});

test("rate limits, access restrictions and server errors remain temporary failures", () => {
  for (const status of [401, 403, 408, 425, 429, 500, 502, 503]) {
    assert.equal(classifyImageHttpResult({ status, contentType: "text/html", language: "English", url: en }), "TEMPORARY_FAILURE");
  }
});

test("the audit includes all twelve official Best Selection Vol.6 product images", () => {
  const urls = collectUrls()
  const productImages = urls.filter((item) =>
    item.associations.some((association) => association.set === "Best Selection Vol.6"),
  )
  assert.equal(productImages.length, 12)
  assert.equal(urls.length, 7798)
  assert.ok(productImages.some((item) => item.url.endsWith("/img_item11.webp")))
  assert.ok(productImages.some((item) => item.url.endsWith("/img_item12.webp")))
  assert.ok(productImages.every((item) => item.associations.every((association) => association.language === "English")))
  assert.ok(productImages.every((item) => new URL(item.url).hostname === "en.onepiece-cardgame.com"))
})
