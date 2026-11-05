#!/usr/bin/env python3
"""Keep the shared pieces identical on every page.

Inlines styles.css into each page's <head> (no render-blocking request, no flash of
unstyled content) and stamps the shared nav and footer partials from tools/partials/.

Usage:  python3 tools/sync-site.py && python3 tools/build-blog.py
Run build-blog.py afterwards so the blog posts pick up the updated post template.
"""
import io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(*p):
    return io.open(os.path.join(ROOT, *p), encoding="utf-8").read()

css = read("styles.css").rstrip("\n")
nav = read("tools", "partials", "nav.html").rstrip("\n")
footer = read("tools", "partials", "footer.html").rstrip("\n")

PAGES = ["index.html", "blog/index.html", "privacy/index.html", "terms/index.html", "tools/post-template.html"]
FOOTER_PAGES = {"index.html", "blog/index.html", "tools/post-template.html"}

CSS_RE = re.compile(r'<style id="shared-css">.*?</style>|<style>\s*/\* =+\s*\n\s*HASH BROWN .*?</style>', re.S)
NAV_RE = re.compile(r'<nav aria-label="Main">.*?</nav>', re.S)
FOOT_RE = re.compile(r'<footer>.*?</footer>', re.S)

for rel in PAGES:
    path = os.path.join(ROOT, rel)
    s = io.open(path, encoding="utf-8").read()
    n_css = len(CSS_RE.findall(s))
    s = CSS_RE.sub(lambda m: '<style id="shared-css">\n%s\n</style>' % css, s, count=1)
    s, n_nav = NAV_RE.subn(lambda m: nav, s, count=1)
    n_foot = 0
    if rel in FOOTER_PAGES:
        s, n_foot = FOOT_RE.subn(lambda m: footer, s, count=1)
    io.open(path, "w", encoding="utf-8").write(s)
    print("  synced %-28s css:%d nav:%d footer:%d" % (rel, n_css, n_nav, n_foot))
