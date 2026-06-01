# elphiene.com

El's personal website. Old-web aesthetic.

Live at **[elphiene.com](https://elphiene.com)** (Cloudflare Pages).

## What's here

- Static HTML/CSS/JS pages (homepage, blog, guestbook)
- A Cloudflare Worker (`worker/index.js`) backs the guestbook and a live "what I'm listening to / watching / playing" status widget
- D1 database for guestbook entries and status state

## Quick start

Just open `index.html` in a browser. No build step.

To work on the Worker:

```bash
wrangler dev          # local Worker
wrangler deploy       # deploy Worker
```

The static site auto-deploys via GitHub Actions on push to `main`. The Worker deploys separately.

## Tech

Pure HTML5/CSS3/JS · Cloudflare Pages · Cloudflare Worker + D1
