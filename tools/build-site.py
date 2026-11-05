#!/usr/bin/env python3
"""Build the marketing pages.

Sources
  tools/src/home.html          -> index.html
  tools/src/pages/*.html       -> <path>/index.html   (front matter: path, title, description, ...)
  tools/partials/mockups.html  -> named UI mockups, used as {{mk:name}}
  tools/partials/site.js       -> shared page script, used as {{site_js}}

Then runs tools/sync-site.py, which inlines styles.css and ui.css and stamps the shared
nav and footer. Run build-blog.py afterwards (it also writes the sitemap).

Usage:  python3 tools/build-site.py && python3 tools/build-blog.py
"""
import glob, html, io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hashbrown.biz"


def read(*p):
    return io.open(os.path.join(ROOT, *p), encoding="utf-8").read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf-8").write(text)


# ---------- partials ----------
mk_src = read("tools", "partials", "mockups.html")
MOCKS = {m.group(1): m.group(2).strip("\n") for m in re.finditer(r"<!--mk:(\w+)-->(.*?)<!--/mk-->", mk_src, re.S)}
SITE_JS = read("tools", "partials", "site.js").rstrip("\n")


def expand(text, where):
    def mk(m):
        name = m.group(1)
        if name not in MOCKS:
            sys.exit("Unknown mockup {{mk:%s}} in %s" % (name, where))
        return MOCKS[name]
    text = re.sub(r"\{\{mk:(\w+)\}\}", mk, text)
    text = text.replace("{{site_js}}", "<script>\n%s\n</script>" % SITE_JS)
    return text


# ---------- shared head pieces ----------
GA = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3Z1DHNXWMV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());
  gtag("config", "G-3Z1DHNXWMV");
</script>"""

FONTS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"></noscript>"""

SVG_DEFS = """<!-- SVG defs: the mark, reused site-wide -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <path id="hb-mark" d="M110,6 C130,2 148,10 158,16 C176,10 196,24 194,44 C206,52 212,66 208,82 C214,96 210,112 206,124 C214,138 212,156 206,168 C214,182 212,200 206,212 C212,226 210,244 202,254 C206,272 194,288 178,290 C170,306 150,314 134,308 C120,318 98,318 84,308 C66,314 46,306 40,290 C22,288 10,272 16,254 C6,244 6,226 12,212 C4,200 4,182 12,168 C4,156 4,138 12,124 C6,112 4,96 12,82 C6,66 14,52 26,44 C24,24 44,10 62,16 C74,8 92,2 110,6 Z"/>
  </defs>
</svg>"""


def parse_front(raw, where):
    if not raw.startswith("---"):
        sys.exit("No front matter in %s" % where)
    _, fm, body = raw.split("---", 2)
    meta = {}
    for line in fm.strip().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, body.strip("\n")


def strip_tags(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def faq_schema(body):
    items = re.findall(r'<button aria-expanded="false">(.*?)</button>\s*<div class="faq-a"><p>(.*?)</p></div>', body, re.S)
    if not items:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": strip_tags(q), "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}}
            for q, a in items
        ],
    }


def ld(obj):
    return '<script type="application/ld+json">\n%s\n</script>' % json.dumps(obj, indent=2, ensure_ascii=False)


def build_page(meta, body, where):
    path = meta["path"].strip("/")
    url = "%s/%s/" % (SITE, path)
    title = meta["title"]
    desc = meta["description"]
    esc_t, esc_d = html.escape(title, quote=True), html.escape(desc, quote=True)

    crumbs = [{"@type": "ListItem", "position": 1, "name": "Hash Brown", "item": SITE + "/"}]
    parts = path.split("/")
    names = meta.get("crumbs", "").split("|") if meta.get("crumbs") else [meta.get("crumb", title)]
    acc = ""
    for i, seg in enumerate(parts):
        acc += "/" + seg
        label = names[i] if i < len(names) else seg
        crumbs.append({"@type": "ListItem", "position": i + 2, "name": label.strip(), "item": SITE + acc + "/"})
    schemas = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}]

    if meta.get("service_name"):
        svc = {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": meta["service_name"],
            "description": meta.get("service_desc", desc),
            "url": url,
            "serviceType": meta.get("service_type", meta["service_name"]),
            "areaServed": "Asia Pacific",
            "provider": {"@type": "ProfessionalService", "name": "Hash Brown", "url": SITE + "/"},
        }
        if meta.get("price_from"):
            svc["offers"] = {
                "@type": "Offer",
                "priceCurrency": "USD",
                "priceSpecification": {"@type": "PriceSpecification", "priceCurrency": "USD", "minPrice": meta["price_from"]},
            }
        schemas.append(svc)
    faq = faq_schema(body)
    if faq:
        schemas.append(faq)

    robots = '<meta name="robots" content="noindex">\n' if meta.get("noindex") else ""
    out = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{GA}
<script>document.documentElement.className+=' js'</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc_t}</title>
<meta name="description" content="{esc_d}">
{robots}<link rel="canonical" href="{url}">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hash Brown">
<meta property="og:title" content="{esc_t}">
<meta property="og:description" content="{esc_d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/icon-512.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc_t}">
<meta name="twitter:description" content="{esc_d}">
<meta name="twitter:image" content="{SITE}/icon-512.png">
{chr(10).join(ld(s) for s in schemas)}
{FONTS}
<style id="shared-css"></style>
<style id="ui-css"></style>
</head>
<body>

{SVG_DEFS}

<nav aria-label="Main"></nav>

{expand(body, where)}

<footer></footer>

<div class="sticky-cta"><a class="btn" href="/#contact">Book a call</a></div>

<script>
{SITE_JS}
</script>
</body>
</html>
"""
    return path, out


def main():
    built = []
    # homepage
    home = expand(read("tools", "src", "home.html"), "home.html")
    write("index.html", home)
    built.append("index.html")

    # pages
    listing = []
    for f in sorted(glob.glob(os.path.join(ROOT, "tools", "src", "pages", "*.html"))):
        meta, body = parse_front(io.open(f, encoding="utf-8").read(), f)
        path, out = build_page(meta, body, os.path.basename(f))
        write(path + "/index.html", out)
        built.append(path + "/index.html")
        if not meta.get("noindex"):
            listing.append({"path": "/" + path + "/", "title": meta["title"]})
    write("tools/site-pages.json", json.dumps(listing, indent=2) + "\n")

    for b in built:
        print("  built  %s" % b)
    subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "sync-site.py")])


if __name__ == "__main__":
    print("Building site pages...")
    main()
    print("Done.")
