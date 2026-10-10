# My Dashboard

This started as my personal browser dashboard — one page for bookmarks, services on my home server, smart-home controls, media, and sports. I built it using **HTML, CSS, and vanilla JavaScript**.

The version in this repository is an **offline preview** that can run on GitHub Pages. It keeps the original dark purple/grey theme, blue headings, service icons, and main dashboard sections. Widgets use local sample values instead of connecting to my network. The light slider and on/off control still work in the browser, but won't control a real device.

## Features

- Bookmark shortcuts and keyboard-friendly search (`/` to focus search)
- Clock and weather preview
- Expandable Glances, Home Assistant, and container sections
- qBittorrent status and a working light-control preview
- Plex activity, movie/game releases, and European sports sections
- Original full-width, flex-wrap layout: bookmarks stay consistently sized, clock/weather panels wrap naturally, and the compact monitoring widgets stack on smaller screens

## Preview

Open `index.html` to see the dashboard in your browser. The public version uses sample data and does not need access to a home server.

## Run locally

Download the repository and open `index.html` in a browser. You can also run a local server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. No build process, backend, account, or API keys are required.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page content and widget layout |
| `dashboard.css` | Styling and responsive layout |
| `dashboard.js` | Search, clock, panel behavior, and the original integration functions |
| `sports.js` | Sports section and original sports fetch logic |
| `demo.js` | Offline sample content and interactive controls |
| `dashboard.config.js` | Public-safe settings; no private connection details |
| `images/` | Icons for bookmarks and services |

## Live integrations vs. public preview

My original local dashboard used Home Assistant, qBittorrent, Tautulli/Plex, external movie and game APIs, and sports feeds. The corresponding JavaScript includes those integration routines, but this public copy runs in `demo` mode so it doesn't send requests to private services. Some sections display intentionally fictional values.

**Security:** Never commit Home Assistant tokens or API keys to a public repository or expose them in client-side JavaScript. A publicly accessible live version would need a properly secured backend or proxy.

## Publishing with GitHub Pages

1. Upload the files to a GitHub repository (with `index.html` at the top level).
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Save and use the published Pages link in your repository description.

## Icons

**Tip:** I found the icons for my home services at [Dashboard Icons](https://dashboardicons.com/). It's a useful place to find matching icons for popular self-hosted applications and services. The included logos and trademarks belong to their respective owners; check applicable licenses before reusing or redistributing assets.

## About this edition

This repository is based on the original dashboard I built for my own use. Its public-ready presentation, offline simulated data, and documentation were added so others can explore it without access to my home network.

## License

The code does not currently have an open-source license. The third-party icon assets may be subject to separate terms.
