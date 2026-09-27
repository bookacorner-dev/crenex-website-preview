#!/usr/bin/env python3
"""Check the static site, or its actual HTTP responses with --base-url.

Standard library only. Run from any directory: python3 docs/check_seo.py
HTTP example: python3 docs/check_seo.py --base-url https://crenex.io
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import ssl
from urllib.error import HTTPError
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://crenex.io'
MAPPINGS = json.loads((ROOT / 'docs/seo-redirects.json').read_text())


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.canonicals, self.robots, self.refs, self.ids, self.og_urls = [], [], [], set(), []
        self.feed(text)

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name') == 'robots':
            self.robots.append(attrs.get('content', ''))
        if tag == 'meta' and attrs.get('property') == 'og:url':
            self.og_urls.append(attrs.get('content'))
        for key in ('href', 'src', 'action', 'data-src', 'data-screen-base'):
            if attrs.get(key):
                self.refs.append(attrs[key])


def local_file(path):
    return ROOT / (unquote(path).lstrip('/') or 'index.html')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def check_static():
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    urls = [n.text for n in sitemap.findall('.//{*}loc')]
    require(len(urls) == len(set(urls)), 'Duplicate sitemap URLs')
    expected = set()
    files = sorted(ROOT.glob('*.html')) + sorted((ROOT / 'blog').glob('*.html'))
    pages = {p: Page(p.read_text()) for p in files}
    refs_checked = 0
    for path, page in pages.items():
        if path.name == '404.html':
            require(any('noindex' in r for r in page.robots), '404 must be noindex')
            require(not page.canonicals, '404 must not canonicalize to the homepage')
        else:
            relative = path.relative_to(ROOT).as_posix()
            canonical = ORIGIN + ('/' if relative == 'index.html' else '/' + relative)
            expected.add(canonical)
            require(page.canonicals == [canonical], f'{relative}: wrong canonical')
            require(page.og_urls == [canonical], f'{relative}: wrong og:url')
            require(page.robots and all('noindex' not in r for r in page.robots), f'{relative}: not indexable')
        for ref in page.refs:
            parts = urlsplit(ref)
            if parts.scheme and parts.scheme not in ('https', 'http'):
                continue
            if parts.netloc and parts.netloc != 'crenex.io':
                continue
            require(ref.startswith(('/', '#', ORIGIN + '/')), f'{path.name}: relative reference {ref}')
            base = ORIGIN + '/' + path.relative_to(ROOT).as_posix()
            target = urlsplit(urljoin(base, ref))
            target_file = local_file(target.path)
            require(target_file.is_file(), f'{path.name}: missing target {ref}')
            if target.fragment and target_file.suffix == '.html':
                require(unquote(target.fragment) in pages[target_file].ids, f'{path.name}: missing anchor {ref}')
            refs_checked += 1
    require(set(urls) == expected, 'Sitemap must contain exactly the canonical, indexable pages')
    robots = (ROOT / 'robots.txt').read_text()
    require('Sitemap: ' + ORIGIN + '/sitemap.xml' in robots, 'robots.txt: wrong sitemap')
    require(not re.search(r'^Disallow:\s*/\s*$', robots, re.M), 'robots.txt blocks the site')
    for source, target in MAPPINGS.items():
        require(ORIGIN + target in expected, f'{source}: target not canonical: {target}')
        require(target not in MAPPINGS, f'{source}: redirect chain')
    for path in ROOT.glob('assets/css/*.css'):
        for ref in re.findall(r'url\([\"\']?([^\)\"\']+)', path.read_text()):
            if not urlsplit(ref).scheme:
                require((path.parent / ref).resolve().is_file(), f'{path.name}: missing CSS asset {ref}')
    print(f'PASS: {len(expected)} canonical sitemap pages, {refs_checked} references, '
          f'{len(MAPPINGS)} redirect mappings, robots.txt and 404 metadata.')
    return urls


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def check_http(base_url, ca_file, urls):
    context = ssl.create_default_context(cafile=ca_file)

    def fetch(path, method='GET'):
        opener = build_opener(NoRedirect(), HTTPSHandler(context=context))
        request = Request(base_url.rstrip('/') + path, method=method,
                          headers={'Host': 'crenex.io', 'User-Agent': 'Crenex-SEO-Check/1.0'})
        try:
            response = opener.open(request, timeout=30)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read().decode('utf-8', errors='replace')

    cases = []
    for source, target in MAPPINGS.items():
        for variant in ([source] if source.endswith('.html') else [source, source + '/']):
            cases.append((variant, target))
    # Verify tracking/query parameters survive, and HEAD agrees with GET.
    query = '?utm_source=seo-check&category=specialty%20leasing'
    cases += [(source + query, target + query) for source, target in MAPPINGS.items()]

    def redirect(case):
        source, target = case
        status, headers, _ = fetch(source)
        require(status == 301, f'{source}: expected 301, got {status}')
        require(headers.get('Location') == ORIGIN + target, f'{source}: wrong Location {headers.get("Location")}')
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(redirect, cases))
    status, headers, _ = fetch('/solutions/crm/', 'HEAD')
    require(status == 301 and headers.get('Location') == ORIGIN + '/workflow.html', 'HEAD redirect failed')

    def canonical(url):
        status, headers, text = fetch(urlsplit(url).path)
        require(status == 200, f'{url}: expected direct 200, got {status}')
        require(Page(text).canonicals == [url], f'{url}: HTTP canonical mismatch')
        require('noindex' not in headers.get('X-Robots-Tag', ''), f'{url}: HTTP noindex')
        require(all('noindex' not in r for r in Page(text).robots), f'{url}: HTML noindex')
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(canonical, urls))

    for path in ('/seo-check-missing-20260927', '/solutions/crm/missing-page',
                 '/blog/nonexistent-seo-check', '/assets/missing-seo-check.css'):
        status, _, text = fetch(path)
        require(status == 404, f'{path}: expected real 404, got {status}')
        page = Page(text)
        require(any('noindex' in r for r in page.robots), f'{path}: not the custom error page')
        require(not page.canonicals, f'{path}: error canonicalizes to another page')
        require('/platform.html' in page.refs and '/blog.html' in page.refs, f'{path}: broken recovery navigation')
    for path, content_type in (('/robots.txt', 'text/plain'), ('/sitemap.xml', 'xml')):
        status, headers, body = fetch(path)
        require(status == 200 and content_type in headers.get('Content-Type', ''), f'{path}: wrong HTTP response')
        require(body == (ROOT / path[1:]).read_text(), f'{path}: deployed content differs')
    print(f'PASS: {len(cases)} HTTP redirects + HEAD, {len(urls)} direct canonical responses, '
          '4 real 404s, robots.txt and sitemap.xml.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--ca-file', help='CA certificate for a local HTTPS test server')
    args = parser.parse_args()
    urls = check_static()
    if args.base_url:
        check_http(args.base_url, args.ca_file, urls)
