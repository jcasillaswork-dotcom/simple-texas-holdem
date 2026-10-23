# Hold’em

No-limit Texas Hold’em against computer players, built with React and Vite and installable as a
Progressive Web App (PWA) on iPhone, Android, Windows, macOS, Linux and ChromeOS. It works offline
once installed.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests: hand ranking, chip conservation, side pots
npm run build      # production build in dist/
npm run preview    # serve dist/ locally (the service worker only runs in a build)
npm run desktop    # standalone desktop app, see below
npm run linux      # Linux .deb and tarballs, see below
```

Requires Node 18 or newer.

## Where accounts are stored

Accounts, profiles and results go through one storage module (`src/storage/`) with two modes.
Pick one with `VITE_STORAGE` at build time (copy `.env.example` to `.env`).

**Local (default).** Accounts live in each browser. No server needed, works offline, and several
people can share one device. Passwords are hashed in the browser with PBKDF2, but anyone with access
to the device's storage could copy the hashes, so treat it as casual protection. Accounts don't move
between devices.

**Server.** Accounts live on your own server (`server/`), so you can log in from any device. The
last account is cached so the app still opens and plays offline; profile changes made offline are
queued and sent when the connection returns. Passwords are hashed on the server (PBKDF2, 310,000
iterations, per-user salt), session tokens are stored only as hashes, and repeated wrong passwords
lock the username for 15 minutes.

## Running the server

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Then build the app in server mode from the project root:

```bash
VITE_STORAGE=server npm run build
```

The server also serves `dist/` when it exists, so `http://localhost:8000` gives you the whole app on
one origin. During development, run `VITE_STORAGE=server npm run dev`; Vite forwards `/api` to port 8000.

Server settings (environment variables):

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOLDEM_DB` | `server/holdem.db` | SQLite database file |
| `HOLDEM_SESSION_DAYS` | `90` | How long a login lasts |
| `HOLDEM_CORS_ORIGINS` | empty | Comma-separated origins, only if the app and API are on different domains (then also set `VITE_API_URL`) |
| `HOLDEM_DIST` | `../dist` | Built app to serve |

Tests: `cd server && pip install pytest httpx && pytest -q`.

SQLite is plenty for personal use. To move to PostgreSQL, replace `connect()` and the SQL in
`server/main.py` (the queries are standard SQL apart from `INTEGER PRIMARY KEY` auto-increment).

## Deploying to a VPS

1. Build: `npm ci && npm run build` (add `VITE_STORAGE=server` for server mode).
2. Copy the project to `/var/www/holdem` (at minimum `dist/`, plus `server/` for server mode).
3. Use `deploy/nginx.conf` as your site config and add HTTPS with certbot. **HTTPS is required:**
   browsers only install PWAs and run service workers on HTTPS (or localhost).
4. Server mode only: create the venv in `server/`, make `/var/lib/holdem` writable by `www-data`,
   and install `deploy/holdem-api.service`.

Any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) also works for local mode: upload
`dist/` and make sure `sw.js` isn't cached.

## Desktop app (standalone .exe)

```bash
npx neu update     # once: downloads the pinned Neutralino 6.9.0 runtime into bin/
npm run desktop    # builds the app and packages it into release/holdem/
```

`release/holdem/holdem-win_x64.exe` is a single self-contained file (about 3 MB) with the whole app
embedded. The same command also produces macOS and Linux builds next to it.

- It uses Windows’ built-in WebView2 browser engine, which comes with Windows 11 and current
  Windows 10. On an older Windows 10 machine without it, install the WebView2 Runtime from Microsoft.
- Accounts are stored by WebView2 for the app’s address, `http://localhost:53917`. Keep the `port`
  in `neutralino.config.json` the same between versions, or saved accounts won’t be found. If that
  port is ever taken by another program, the app won’t open; change it (accounts start fresh).
- The exe isn’t code-signed, so Windows SmartScreen shows “Windows protected your PC” the first time.
  Click More info, then Run anyway. Signing needs a code-signing certificate.
- The window shows the app icon, but the .exe file itself keeps Neutralino’s default icon. Changing
  it needs a Windows resource editor such as `rcedit` run on Windows.
- Server mode works in the desktop build too: set `VITE_STORAGE=server`, set `VITE_API_URL` to your
  server’s full address, and add `http://localhost:53917` to `HOLDEM_CORS_ORIGINS` on the server.

## Linux app

```bash
npx neu update     # once, if you haven't already
npm run linux      # desktop build plus Linux packages in release/linux/
```

This produces:

- `holdem_<version>_amd64.deb` for Ubuntu, Debian, Mint, Pop!_OS and other Debian-based distros.
  Install with `sudo apt install ./holdem_1.0.0_amd64.deb` (apt pulls in the dependencies), then open
  Hold’em from the app menu or run `holdem`. Remove with `sudo apt remove holdem`.
- `holdem-<version>-linux-x64.tar.gz` for any distro. Extract it and run `./install.sh`, which installs
  into your home folder (no sudo) and adds a menu entry. `./uninstall.sh` removes it and keeps your
  accounts; `./uninstall.sh --purge` removes those too. You can also just run `./holdem` from the folder.
- `holdem-<version>-linux-arm64.tar.gz`, the same for 64-bit ARM such as a Raspberry Pi 4 or 5.

The app needs GTK 3 and WebKitGTK (4.1, or 4.0 on older releases), which most desktop distros
already have. If it reports a missing library:

| Distro | Command |
| --- | --- |
| Ubuntu 22.04+, Debian 12+ | `sudo apt install libwebkit2gtk-4.1-0` |
| Fedora | `sudo dnf install webkit2gtk4.1` |
| Arch | `sudo pacman -S webkit2gtk-4.1` |
| openSUSE | `sudo zypper install libwebkit2gtk-4_1-0` |

Saved accounts live in `~/.local/share/holdem`. WebKitGTK names that folder after the program’s file
name, so the packages always install it as `holdem`; if you rename the binary, it starts with no accounts.

## Publishing a release on GitHub

`.github/workflows/release.yml` builds the Windows .exe, the .deb, both Linux tarballs and a
`SHA256SUMS.txt`, and publishes them as a GitHub Release, using the text in `.github/release-notes.md`.

1. Set the new version in `package.json` (for example `1.1.0`) and commit.
2. Tag that commit and push the tag:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. Watch it run under the repository’s **Actions** tab. When it finishes (a few minutes), the release
   appears under **Releases** with all files attached.

The tag must match `package.json` (`v` plus the version), or the run stops before building. To test a
build without publishing, open **Actions**, pick **Release**, and click **Run workflow**; the files are
attached to that run as a download. Releases on a private repository are only downloadable by people
with access to it.

## Installing on devices

- **iPhone and iPad:** open the site in Safari, tap Share, then Add to Home Screen.
- **Android:** open it in Chrome and tap Install app (or the menu, then Add to Home screen).
- **Windows, macOS, Linux, ChromeOS:** open it in Chrome or Edge and click the install icon in the
  address bar. In Safari on macOS, use File, then Add to Dock.

When you deploy a new version, players see a "new version is ready" message and choose when to
reload, so an update never interrupts a hand.

## Project layout

```
src/
  engine/        cards.js (evaluation, win chance), game.js (rules, betting, side pots), bots.js
                 Plain JavaScript with no UI or browser dependencies; reusable in any wrapper.
  components/    Table, Seat, Card, Chips, Controls, Log, Setup, GameOver, AuthScreen, ProfilePanel
  storage/       local.js, remote.js, crypto.js, index.js (picks the mode)
  hooks/         useAccounts.js
  App.jsx        game loop, bots' timing, stats recording, keyboard shortcuts
  pwa.js         service worker registration and update prompt
server/          FastAPI accounts server and tests
deploy/          nginx and systemd examples
.github/         release workflow and release notes template
neutralino.config.json   desktop window, port and packaging settings
scripts/package-linux.sh  builds the .deb and Linux tarballs
public/          icons and favicon
```

## Notes

- Accounts and results from the claude.ai version of the table don't transfer automatically.
- The app icons in `public/` were generated for this project; replace them with your own anytime
  (keep the same sizes; the maskable icon needs its artwork inside the central 80%).
