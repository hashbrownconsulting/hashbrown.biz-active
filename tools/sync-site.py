#!/usr/bin/env python3
"""Keep the shared pieces identical on every page.

Inlines styles.css (and ui.css on marketing pages) into each page's <head> (no
render-blocking request, no flash of unstyled content) and stamps the shared nav and
footer partials from tools/partials/.

Normally run for you by build-site.py. Run build-blog.py afterwards so blog posts pick up
the updated post template.

Usage:  python3 tools/sync-site.py
"""
import io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*p):
    return io.open(os.path.join(ROOT, *p), encoding="utf-8").read()


css = read("styles.css").rstrip("\n")
ui = read("ui.css").rstrip("\n")
nav = read("tools", "partials", "nav.html").rstrip("\n")
footer = read("tools", "partials", "footer.html").rstrip("\n")

PAGES = ["index.html", "blog/index.html", "privacy/index.html", "terms/index.html", "tools/post-template.html"]
NO_FOOTER = {"privacy/index.html", "terms/index.html"}

listing = os.path.join(ROOT, "tools", "site-pages.json")
if os.path.exists(listing):
    for p in json.load(io.open(listing, encoding="utf-8")):
        rel = p["path"].strip("/") + "/index.html"
        if rel not in PAGES:
            PAGES.append(rel)

CSS_RE = re.compile(r'<style id="shared-css">.*?</style>|<style>\s*/\* =+\s*\n\s*HASH BROWN .*?</style>', re.S)
UI_RE = re.compile(r'<style id="ui-css">.*?</style>', re.S)
NAV_RE = re.compile(r'<nav aria-label="Main">.*?</nav>', re.S)
FOOT_RE = re.compile(r'<footer>.*?</footer>', re.S)

for rel in PAGES:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        print("  skip   %s (missing)" % rel)
        continue
    s = io.open(path, encoding="utf-8").read()
    n_css = len(CSS_RE.findall(s))
    s = CSS_RE.sub(lambda m: '<style id="shared-css">\n%s\n</style>' % css, s, count=1)
    s, n_ui = UI_RE.subn(lambda m: '<style id="ui-css">\n%s\n</style>' % ui, s, count=1)
    s, n_nav = NAV_RE.subn(lambda m: nav, s, count=1)
    n_foot = 0
    if rel not in NO_FOOTER:
        s, n_foot = FOOT_RE.subn(lambda m: footer, s, count=1)
    io.open(path, "w", encoding="utf-8").write(s)
    print("  synced %-40s css:%d ui:%d nav:%d footer:%d" % (rel, n_css, n_ui, n_nav, n_foot))
