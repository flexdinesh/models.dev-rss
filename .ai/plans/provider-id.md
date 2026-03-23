# ProviderId-filtered RSS endpoint

## Goal
Add optional `providerId` filtering to `GET /rss` so callers can request only the matching models from `models.dev/api.json`, and append the filtered provider names to the feed title.

## Tasks
- [x] Parse repeated `providerId` query params in `app.js` and ignore empty values. Verify: `/rss?providerId=openai&providerId=openrouter` reaches the feed builder with two ids.
- [x] Filter upstream providers in `rss.js` before flattening items. Verify: only matching providers are emitted, with existing ordering and `pubDate` behavior preserved.
- [x] Derive the channel title suffix from the filtered provider display names. Verify: the title becomes `{existing-title} - Name1, Name2, ...` using query order, capped at 4 names with `etc` if more providers match.
- [x] Add static tests for unfiltered, filtered, title-suffix, and empty-result feeds. Verify: `node --test` passes and the XML remains valid.
- [x] Update the README to document the new query param and title behavior. Verify: the endpoint docs mention `providerId` and the title suffix rule.

## Done When
- [x] `/rss` accepts `providerId` and returns the expected RSS subset.
- [x] Filtered feeds include the provider-name suffix in the channel title.
- [x] Empty or unmatched filters still return a valid RSS document.
- [x] Existing feed behavior is unchanged when no filter is supplied.
