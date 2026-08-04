# SEO Strategy — Event Platform (MatchMeIn)

## Core Principle
Core site SEO comes first, blog second. Transactional/high-intent traffic (people looking
for events now) lands on event/city pages. The blog builds topical authority and feeds
internal links back to those pages. Don't skip core-site SEO to "keep it simple."

## 1. Rendering (prerequisite for everything else)
- Event pages, city/category pages, and blog must be crawlable HTML at first load —
  not client-only React rendering.
- Use SSR or static pre-rendering for these page types specifically. Pure client-side
  Vite/React is invisible to crawlers.
- Fast TTFB. Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Mobile-first — most event searches happen on mobile.

## 2. Page Architecture
- **Individual event pages** (`/events/[slug]`) — one per event, permanent URL.
  Do not delete past event pages after the event ends; update them into a recap
  with links to related upcoming events. Deleting them wastes accumulated SEO value.
- **City/location landing pages** (`/events/[city]`, e.g. `/events/rasht`,
  `/events/tehran`) — hyper-localized, not one generic "national" events page.
  Each city page needs unique content, not templated boilerplate.
- **Category pages** (`/events/[category]`, e.g. networking, singles, workshops).
- Clean URL structure, no query-string-based event URLs.

## 3. Structured Data (critical for this vertical)
- Add `Event` JSON-LD schema to every event page: name, startDate, endDate, location
  (with full address/geo), price, availability, organizer, image.
- This is what makes events eligible for Google's dedicated event rich results /
  "Events Pack" (shown above regular organic results for "events near me" type queries).
  Skipping this makes events invisible to that surface entirely.
- Add `BreadcrumbList` schema for site hierarchy (Home > City > Event).
- Add `LocalBusiness` schema for the platform itself if positioning as a local service.

## 4. Content Rules for Event Pages
- Write event descriptions in natural, conversational language — match how people
  actually search ("things to do in Rasht this weekend") not keyword-stuffed titles
  ("Rasht Networking Event 2026 Best Singles Meetup").
- Unique meta title + description per event and per city page — no duplicate templates
  copy-pasted across cities.
- Include city/neighborhood names naturally in body copy, not just metadata.

## 5. Local SEO
- Set up and maintain a Google Business Profile for the platform.
- Sync real-world event activity with online listings — consistent name/location data
  across all platforms.
- Get listed on relevant event directories and local press/partner sites for backlinks.
- Local backlinks (venues, local partners, sponsorships) matter more than volume of
  generic backlinks for this vertical.

## 6. hreflang / Bilingual
- `hreflang` tags on every page pairing EN and FA versions.
- Separate URLs per language (not a JS toggle) so both versions are indexable.

## 7. Blog (secondary layer)
- Astro or MDX-in-git, static-generated, served at `/blog` subpath (not subdomain) to
  keep authority on the main domain.
- Content angle: local guides ("best networking events in Rasht"), how-to-meet-people
  city guides, event recaps — built to internally link back to city/event pages.
- FAQ schema on relevant posts.

## 8. Technical Baseline (applies site-wide)
- `robots.txt` + XML sitemap, auto-generated, including event pages (keep sitemap
  fresh as events are added/expired).
- Canonical tags on every page.
- Open Graph + Twitter Card tags — especially important for event pages since these
  get shared directly.
- HTTPS only, no mixed content.
- Image optimization: WebP/AVIF, lazy loading, explicit dimensions, descriptive alt text.

## 9. Ongoing
- Update/refresh content regularly — stale event listings signal low relevance to Google.
- Start SEO groundwork early — organic rankings take months, don't treat it as a
  pre-launch checklist item.
