# Daminicodesphere Blog

The official blog of [Daminicodesphere](https://daminicodesphere.org) — notes on AI, code and building in public.

## How it works

- **Fully static**: pure HTML/CSS/JS, no build step, no server. Host it free on Vercel/Netlify.
- **Posts live in the repo**: each post is a markdown file in `posts/`, indexed by `posts/posts.json`.
- **Admin panel**: open `/admin`, enter the panel password, connect a GitHub token once, then write, edit and delete posts from the browser. Publishing commits straight to this repo, and your hosting platform auto-redeploys within ~1 minute.

## Writing a post (admin flow)

1. Open `https://<your-blog-domain>/admin`
2. Enter the panel password (set in `js/admin.js`, `ADMIN_PASSWORD`, change it!)
3. First time only: paste a GitHub personal access token with **repo** scope. It's stored in your browser's localStorage only.
4. Click **+ New post** → title, cover URL (optional), tags, excerpt, content in markdown → **Publish**.

## Deploy on Vercel

1. vercel.com → Add New Project → import this repo
2. Framework preset: **Other**, no build command, output directory `.`
3. Deploy, then Domains → add `blog.daminicodesphere.org` and add the CNAME record Vercel shows you in your DNS.

## Post markdown support

Headings (`#`–`####`), bold, italic, inline code, fenced code blocks, lists, quotes, links, images, horizontal rules.

## Contact

- WhatsApp: +234 805 467 1458
- Email: damibotzinc@gmail.com

© 2026 Daminicodesphere
