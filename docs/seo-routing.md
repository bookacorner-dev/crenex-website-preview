# SEO routing and crawl checks

## Scope

The canonical site remains `https://crenex.io`, with its existing `.html` page URLs.
This change repairs the migration from the old React routes without renaming the
current public pages or changing their commercial content.

The inventory in `seo-redirects.json` records 28 source-to-destination mappings:
the former product, industry, MRI and legal routes; the blog index and its six
published articles; current extensionless page aliases; and `/index.html`.
The former routes were checked against `bookacorner-dev/crenex-landing/src/App.jsx`.
Industry routes share the current use-case page because it contains their replacement content.

## Behaviour

- Known legacy routes return a permanent **301** directly to the HTTPS canonical
  destination. Extensionless routes work both with and without a trailing slash.
- Query strings, including campaign parameters, survive redirects.
- `/blog` and `/blog/` redirect to `/blog.html`, before the physical directory can
  return an error or trigger an extra redirect.
- `/index.html` redirects to `/`. `THE_REQUEST` prevents a loop when the server
  internally resolves the home page to its index file.
- Unknown routes retain **404**, displaying `404.html` instead of the home page.
  The error page is `noindex,follow`, has no canonical pointing to a content page,
  and is excluded from the sitemap.
- HTML navigation, resources and dynamic product screenshots use root-relative
  URLs. Shared JavaScript preserves active-menu highlighting and has a new cache
  version in the HTML references.
- The sitemap still contains exactly the 20 canonical, indexable pages. The
  blanket `2026-07-14` modification dates were removed rather than inventing fresh
  content dates. Restore `lastmod` only when reliable per-page dates are available.
- `robots.txt` already permits crawling and points to the correct sitemap; it is
  unchanged. Existing security headers remain in place.

## Validation

```sh
python3 docs/check_seo.py
node --check assets/js/app.js
python3 docs/check_seo.py --base-url https://crenex.io
```

The static check validates sitemap coverage, unique canonicals, Open Graph URLs,
indexability, local links, anchors, assets and redirect destinations. It runs on
pull requests and pushes to `main`.

The HTTP check covers 83 redirect requests (including trailing slashes and query
strings), a HEAD request, all 20 canonical pages, four unknown routes, robots.txt
and sitemap.xml. Before publication on 2026-09-27 it passed against Apache 2.4.62
using the actual `.htaccess` over local HTTPS. Five additional HTTP/www origin
normalization checks passed. Browser checks confirmed active navigation and the
new error-page layout.

Production uses Hostinger/LiteSpeed, so repeat the HTTP check after deployment.
Before this change, live `/solutions/crm/` returned 404 with home-page content,
and `/blog/` returned 403. Both crawl files were already accessible with 200.

## Publishing and rollback

Follow `deploy-runbook.md`: feature branch → PR → `main` → `build` → Hostinger.
Tests and this inventory live under `docs/`, which the deployment already excludes.
After publishing, check HTTP responses as well as the deployment job: the GitHub
job finishing is not proof that Hostinger has served the updated files.
Rollback is a revert of this change on `main`, using the same deployment pipeline.
