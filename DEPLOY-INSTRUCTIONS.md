# Hash Brown website — deploy & wiring guide

Everything here is a static site, so it runs on **GitHub Pages** for free. Two things need a one-time setup: the **lead form backend** (Google Apps Script) and **publishing to GitHub Pages**.

---

## 1. Connect the lead form (≈5 minutes, one time)

The form needs a tiny backend to write to your Google Sheet and email you. We use Google Apps Script — free, lives on your sheet, no third-party service.

1. Open your leads spreadsheet:
   https://docs.google.com/spreadsheets/d/1CGiIlH6buMuhllyaoDurrQCBa3UAuPctwmhFEFb-Mj4/edit
2. Menu: **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete whatever is in the `Code.gs` file, then paste the **entire contents** of
   `google-apps-script/Code.gs` (in this folder). Click the **Save** icon.
4. Top right: **Deploy → New deployment**.
   - Click the gear icon → choose **Web app**.
   - **Description:** `Hash Brown lead form`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`  ← important, this lets the website reach it
   - Click **Deploy**.
5. Google asks you to **authorize** — approve it with the hashbrownconsulting account.
   (You may see an "unverified app" screen → click *Advanced → Go to … (unsafe)*. It's your
   own script, this is normal.)
6. Copy the **Web app URL** it gives you. It looks like
   `https://script.google.com/macros/s/AKfy……/exec`
7. Open `index.html`, find this line near the bottom (in the `<script>` block):
   ```js
   var SCRIPT_URL = "";
   ```
   Paste your URL between the quotes:
   ```js
   var SCRIPT_URL = "https://script.google.com/macros/s/AKfy……/exec";
   ```
8. Save `index.html`. Done — the form now writes to the **Leads** tab and emails
   hashbrownconsulting@gmail.com on every submission.

**Test it:** open the site, submit the form. You should get a green success message, a new
row in the sheet, and an email within a minute.

### Current live deployment

**Version 2, deployed 30 Jul 2026** — this URL is already pasted into `index.html`:

```
https://script.google.com/macros/s/AKfycbyqWcmMV5EOmEuRDkJwHXD7Vic1Gd6Itdps8mwZ4V7h828yqhm6MnVwLfw6dc9XeXqj9Q/exec
```

> If you change `Code.gs`, redeploy via **Deploy → Manage deployments → (edit the existing
> deployment) → Version: New version → Deploy**. Doing it that way keeps the same URL.
> If you ever create a *brand new* deployment instead, the URL changes and you must paste
> the new one into `index.html` (`var SCRIPT_URL = "…"`) or the form silently stops working.

---

## 2. Launch on GitHub Pages with hashbrown.biz (Spaceship)

### A. Put the site on GitHub

1. Sign in at github.com (create a free account if needed).
2. Top right **+ → New repository**. Name: `hash-brown-site`. Visibility: **Public**
   (required for free Pages). **Create repository**.
3. On the new repo page click **uploading an existing file** (or Add file → Upload files).
   Drag in, from the `hash-brown-site` folder:
   - `index.html`, `styles.css`, `privacy.html`, `terms.html`, `CNAME`
   - the whole `assets/` folder (logos, founders, svg graphics)
   - optional: `blog.html`, `post.html`, `posts.json`, `posts/` (currently unlinked; upload
     if you want the blog ready to switch on later)
   Skip `google-apps-script/` and this file (harmless, just unnecessary).
4. **Commit changes**. The `CNAME` file already contains `hashbrown.biz`.
5. Repo **Settings → Pages** → Source: `Deploy from a branch` → Branch `main` → `/ (root)`
   → **Save**. In ~1 minute the site is live at `https://<username>.github.io/hash-brown-site/`.
   Check it works before touching DNS.

### B. Point hashbrown.biz at it (Spaceship)

6. Same **Settings → Pages** screen: **Custom domain** → type `hashbrown.biz` → **Save**.
   (A DNS warning at this stage is fine; that's the next step.)
7. Log in at spaceship.com → **Domain Manager** → `hashbrown.biz`. Confirm it's on
   Spaceship's own nameservers (the default unless you changed them).
8. Open the domain's DNS editor (Spaceship calls it **Unlimited DNS / Advanced DNS**).
   Delete any existing A, ALIAS, CNAME, or URL-forwarding records on `@` and `www` —
   new domains often carry parking records that will conflict.
9. Add **four A records**, all with Host `@`:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
10. Add **one CNAME record**: Host `www` → Value `<username>.github.io`
    (your GitHub username, NOT the repo name). Default TTL is fine.

### C. Switch on HTTPS and verify

11. Wait for DNS to propagate: usually minutes on Spaceship, allow up to an hour.
12. Back in GitHub **Settings → Pages**: the custom domain should show a green check.
    Tick **Enforce HTTPS** (if greyed out, the certificate is still being issued — retry
    after ~15 minutes).
13. Test: `https://hashbrown.biz` loads · `www.hashbrown.biz` redirects · submit the lead
    form once end-to-end (green message → row in the Leads sheet → email) · open on a phone.

### Updating the site later

Edit files in the GitHub repo (pencil icon) or upload a replacement with the same name,
then Commit. Pages redeploys automatically in ~1 minute. The `CNAME` file must stay in
the repo or the custom domain disconnects.

---

## 3. Add a blog post (no redeploy of the site logic)

Adding a post is two small files — commit them and GitHub Pages publishes automatically.

1. Write the post as Markdown and save it in `posts/`, e.g. `posts/my-post.md`.
2. Open `posts.json` and add an entry at the **top** of the list:
   ```json
   {
     "slug": "my-post",
     "title": "My post title",
     "date": "2026-08-01",
     "author": "Tom",
     "excerpt": "One or two sentences shown on the blog index."
   }
   ```
   - `slug` must match the filename without `.md` (`my-post` → `posts/my-post.md`).
   - `date` is `YYYY-MM-DD`. Posts show newest first automatically.
3. Commit both files. That's it — no code changes, no rebuild.

See `posts/hello-outbound.md` + its entry in `posts.json` as a working example.

---

## Things to swap in when you have them

- **Founder social links** (footer): currently point to instagram.com / linkedin.com
  placeholders. Replace with Monty's Instagram and Tom's LinkedIn URLs in `index.html`.
- **Client logos**: five "Logo — pending" slots in the proof strip.
- **Stats**: two `[ · ]` figures marked `VERIFY`.
- **Privacy / Terms**: `privacy.html` and `terms.html` are working stubs — have them
  reviewed before you rely on them legally.
