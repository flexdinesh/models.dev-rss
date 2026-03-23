# Decision Log: `providerId` RSS filtering

## What
- Added optional `providerId` filtering to `GET /rss`.
- The endpoint accepts repeated `providerId` query params, for example `?providerId=openai&providerId=openrouter`.
- Filtering matches upstream provider ids exactly and returns an empty RSS feed when nothing matches.
- When filtering is applied, the channel title appends the matched provider display names, capped at 4 names with `etc` if more providers match.
- The implementation is centralized in `rss.js`, with request parsing in `app.js`, and covered by static RSS tests.

## Why
- The RSS feed is generated on demand from `models.dev/api.json`, so filtering at request time keeps the server stateless and CDN-friendly.
- Provider ids are stable identifiers, which makes them a better filter key than human-readable provider names.
- Repeated query params preserve a simple, standard URL shape for multiple providers without introducing custom parsing rules.
- Appending provider names to the title makes filtered feeds self-describing for consumers.
- Limiting the suffix to 4 names keeps the title readable while still signaling the filter scope.
- Returning a valid empty feed is safer than an error response because it keeps the endpoint predictable for consumers.

## How
- `app.js` reads `c.req.queries("providerId")`, trims values, removes empties, and forwards the resulting list to `buildFeed`.
- `rss.js` normalizes the incoming provider id list and filters upstream providers before flattening models into RSS items.
- `rss.js` derives the channel title suffix from the matched provider display names in query order, keeps at most 4 names, and adds `etc` when more providers match.
- Existing item ordering remains unchanged because sorting still happens on `release_date` descending after filtering.
- `test/rss.test.js` verifies the unfiltered feed, filtered output, title suffix behavior, and empty-result behavior with fixed fixture data.
- `README.md` documents the new query parameter and filtered-title behavior so consumers know how to use the endpoint.
