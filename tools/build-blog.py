#!/usr/bin/env python3
"""Build the Hash Brown blog.

Reads posts/*.md (YAML-ish front matter + markdown body) and writes, for each post,
a fully static page at blog/<slug>/index.html with the article text baked into the
HTML. Also regenerates posts.json and sitemap.xml.

Why static: crawlers must see the words. Fetching the body from /posts/*.md at
runtime made the article invisible to Google, because robots.txt disallows /posts/.

Usage:  python3 tools/build-blog.py
"""
import os, re, io, json, datetime, html, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hashbrown.biz"
AUTHOR_URLS = {
    "Tom":   "https://www.linkedin.com/in/thomas-brown-33775912b/",
    "Monty": "https://www.linkedin.com/in/monty-hasan/",
}
STATIC_PAGES = [("/", None), ("/blog/", None), ("/privacy/", None), ("/terms/", None)]

try:
    import markdown
except ImportError:
    sys.exit("Missing dependency. Run: pip3 install --user markdown")


def parse(path):
    raw = io.open(path, encoding="utf-8").read()
    if not raw.startswith("---"):
        sys.exit("No front matter in %s" % path)
    _, fm, body = raw.split("---", 2)
    meta = {}
    for line in fm.strip().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    meta["body_md"] = body.strip()
    return meta


def human(d):
    return datetime.datetime.strptime(d, "%Y-%m-%d").strftime("%d %b %Y").lstrip("0")


def build():
    tpl = io.open(os.path.join(ROOT, "tools", "post-template.html"), encoding="utf-8").read()
    md = markdown.Markdown(extensions=["extra", "sane_lists", "smarty"])
    posts = []

    for name in sorted(os.listdir(os.path.join(ROOT, "posts"))):
        if not name.endswith(".md"):
            continue
        m = parse(os.path.join(ROOT, "posts", name))
        slug = m.get("slug") or name[:-3]
        md.reset()
        body = md.convert(m["body_md"])
        # House rule: no em dashes or en dashes anywhere on the site.
        body = body.replace("—", ", ").replace("–", "-")
        page = tpl
        for key, val in [
            ("BODY", body),
            ("SLUG", slug),
            ("TITLE", html.escape(m["title"], quote=True)),
            ("META_TITLE", html.escape(m.get("meta_title", m["title"]), quote=True)),
            ("DESCRIPTION", html.escape(m["description"], quote=True)),
            ("DATE_HUMAN", human(m["date"])),
            ("DATE", m["date"]),
            ("AUTHOR", m.get("author", "Hash Brown")),
            ("AUTHOR_URL", AUTHOR_URLS.get(m.get("author", ""), SITE + "/#why")),
        ]:
            page = page.replace("{{%s}}" % key, val)

        outdir = os.path.join(ROOT, "blog", slug)
        os.makedirs(outdir, exist_ok=True)
        io.open(os.path.join(outdir, "index.html"), "w", encoding="utf-8").write(page)

        posts.append({
            "slug": slug,
            "title": m["title"],
            "date": m["date"],
            "author": m.get("author", "Hash Brown"),
            "excerpt": m.get("excerpt", m["description"]),
        })
        print("  built  /blog/%s/  (%d words)" % (slug, len(re.sub(r"<[^>]+>", " ", body).split())))

    posts.sort(key=lambda p: p["date"], reverse=True)
    io.open(os.path.join(ROOT, "posts.json"), "w", encoding="utf-8").write(
        json.dumps(posts, indent=2, ensure_ascii=False) + "\n")

    today = datetime.date.today().isoformat()
    urls = ["  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n  </url>" % (SITE, p, today)
            for p, _ in STATIC_PAGES]
    urls += ["  <url>\n    <loc>%s/blog/%s/</loc>\n    <lastmod>%s</lastmod>\n  </url>"
             % (SITE, p["slug"], p["date"]) for p in posts]
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) + "\n</urlset>\n")

    print("  wrote  posts.json (%d posts) and sitemap.xml" % len(posts))


if __name__ == "__main__":
    print("Building blog...")
    build()
    print("Done.")
