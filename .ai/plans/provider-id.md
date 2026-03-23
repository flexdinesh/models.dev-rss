# ProviderId-filtered RSS endpoint

## Goal
Add optional `providerId` filtering to `GET /rss` so callers can request only the matching models from `models.dev/api.json`.

## Tasks
- [x] Parse repeated `providerId` query params in `app.js` and ignore empty values. Verify: `/rss?providerId=openai&providerId=openrouter` reaches the feed builder with two ids.
- [x] Filter upstream providers in `rss.js` before flattening items. Verify: only matching providers are emitted, with existing ordering and `pubDate` behavior preserved.
- [x] Add static tests for unfiltered, filtered, and empty-result feeds. Verify: `node --test` passes and the XML remains valid.
- [x] Update the README to document the new query param. Verify: the endpoint docs mention `providerId`.

## Done When
- [x] `/rss` accepts `providerId` and returns the expected RSS subset.
- [x] Empty or unmatched filters still return a valid RSS document.
- [x] Existing feed behavior is unchanged when no filter is supplied.
