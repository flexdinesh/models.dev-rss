import test from "node:test";
import assert from "node:assert/strict";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildFeed } from "../rss.js";

function toItems(parsedRss) {
  const raw = parsedRss.rss.channel.item;
  return Array.isArray(raw) ? raw : [raw];
}

test("buildFeed produces valid RSS XML and expected item ordering", () => {
  const fixture = {
    alpha: {
      id: "alpha",
      name: "Alpha Provider",
      api: "https://alpha.example/api",
      models: {
        "alpha/old-model": {
          id: "alpha/old-model",
          name: "Old Model",
          release_date: "2025-12-31",
          family: "old",
          limit: { context: 4096, output: 512 },
          tags: ["legacy", "stable"],
        },
      },
    },
    beta: {
      id: "beta",
      name: "Beta & Co",
      models: {
        "beta/new-model": {
          id: "beta/new-model",
          name: "New <Model>",
          release_date: "2026-02-14",
          family: "new",
          limit: { context: 200000, output: 8000 },
          nested: { enabled: true, threshold: 0.7 },
        },
      },
    },
  };

  const rss = buildFeed(fixture, {
    origin: "https://rss.local",
    maxItems: 10,
  });

  const validation = XMLValidator.validate(rss);
  assert.equal(validation, true, "RSS XML should be valid");
  assert.match(rss, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/);
  assert.doesNotMatch(rss, /<description><!\[CDATA\[/);
  assert.match(rss, /<content:encoded><!\[CDATA\[/);
  assert.match(rss, /<description>Provider: Beta &amp; Co/);
  assert.match(rss, /Model ID: beta\/new-model/);
  assert.match(rss, /model\.nested\.enabled: true<br \/>/);

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rss);
  const items = toItems(parsed);

  assert.equal(parsed.rss.channel.title, "models.dev LLM Catalog");
  assert.equal(parsed.rss.channel.link, "https://rss.local/rss");
  assert.equal(items.length, 2);

  assert.equal(items[0].title, "Beta & Co: New <Model>");
  assert.equal(items[0].pubDate, "Sat, 14 Feb 2026 00:00:00 GMT");
  assert.match(items[0].description, /model\.nested\.enabled: true/);
  assert.doesNotMatch(items[0].description, /<br \/>/);
  assert.match(items[0]["content:encoded"], /model\.nested\.enabled: true<br \/>/);
  assert.match(items[0].description, /model\.limit\.context: 200000/);
  assert.match(items[0].description, /model\.limit\.output: 8000/);

  assert.equal(items[1].title, "Alpha Provider: Old Model");
  assert.equal(items[1].pubDate, "Wed, 31 Dec 2025 00:00:00 GMT");
  assert.match(items[1].description, /model\.tags: \["legacy", "stable"\]/);
  assert.match(items[1].description, /model\.limit\.context: 4096/);
  assert.match(items[1].description, /model\.limit\.output: 512/);
});
