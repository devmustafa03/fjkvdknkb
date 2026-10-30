# Submission guide: video, Vercel, GitHub

Everything needed to turn this repo into the three deliverables the brief asks for: an unlisted YouTube video (two parts, 10 minutes max), a public GitHub repo with a random name, and a live Vercel URL in the README. Budget about 2 hours: 30 minutes for deploy and repo, 30 minutes to rehearse, 30 minutes to record, 30 minutes to upload and check.

## 1. What you are submitting

- [ ] Public GitHub repo with an anonymous name (for example `kjhwr`), containing this code and a README with the file list, how to start it, and the Vercel link.
- [ ] Live Vercel deployment, URL pasted into `README.md` (the "Live demo" line near the top).
- [ ] Unlisted YouTube video, 10 minutes max: Part 1 (client pitch, up to 5 min) then Part 2 (tech lead review, up to 5 min).
- [ ] The video link and the repo link in your submission message.

Do these in the order below: deploy first (so the video can show the live URL), then the repo, then the video.

## 2. Deploy on Vercel for free

The free Hobby plan is enough: 1,000,000 function invocations, 4 CPU-hours and 360 GB-hours of function memory per month, 100 GB of data transfer, functions up to 300 s (ours finish in about 2 s cold, 0.1 s warm), and up to 100 deployments a day ([Hobby plan](https://vercel.com/docs/plans/hobby), checked October 2026). Hobby is for personal, non-commercial use, which a take-home demo is. No credit card is needed.

1. **Create an account** at vercel.com (sign up with GitHub so step 3 is easier).
2. **Log in from the terminal** at the repo root:
   ```bash
   npx vercel login
   ```
   Follow the browser prompt, then come back.
3. **Deploy to production:**
   ```bash
   npx vercel --prod
   ```
   Answer the prompts: set up and deploy → yes; scope → your personal account; link to existing project → no; project name → anything (this is not the public repo name); directory → `./` (the repo root); modify settings → no. `vercel.json` already tells Vercel to install and build the frontend and to run `api/index.py` as a Python function. The first deploy takes 2 to 3 minutes (npm install plus Python packages).
4. **Check it works.** Replace the host with the URL Vercel printed:
   ```bash
   curl -s https://YOUR-APP.vercel.app/api/v1/health
   curl -sI "https://YOUR-APP.vercel.app/api/v1/wind/analysis?from=2026-01-05&to=2026-01-11&gate=09:50" | grep -i -E "cache-control|x-vercel-cache|content-security|strict-transport"
   ```
   The first call to the analysis endpoint takes about 2 s (Elexon fetch); call it twice and the second shows `x-vercel-cache: HIT`. Open the URL in a browser, pick a week, move the slider, open the table view, try the phone layout with the browser's device toolbar.
5. **Put the URL in the README.** Edit the "Live demo" line at the top of `README.md`, then commit.
6. **Optional, recommended:** in the Vercel dashboard open the project → Settings → Git and connect the GitHub repo you create in section 3. Every push to `main` then redeploys automatically, so the README link stays valid as you fix things.

Things to know:

- No environment variables are needed. Elexon's API is public.
- Vercel reads `pyproject.toml` and `uv.lock` for Python dependencies and `.python-version` for the interpreter (3.12).
- Each cold function instance fetches the January data from Elexon once (about 2.5 MB). The CDN then caches responses for a day (`s-maxage=86400`), so a demo audience hits Elexon rarely.
- `.vercel/` is in `.gitignore`. Never commit it: it contains project ids and, for anonymous deploys, a token.
- If a deploy fails on the Python step, run `uv lock && uv export --frozen --no-dev --no-hashes --no-emit-project -o requirements.txt` locally and push again.

## 3. Create the anonymous GitHub repo

1. **Pick a random name** and create the repo on GitHub (public, no README, no licence, no .gitignore so the first push is clean):
   ```bash
   openssl rand -hex 3        # for example: a91f3c
   ```
2. **Check what you are about to publish.** From the repo root:
   ```bash
   git status --short          # should list only project files
   grep -rn "vcn_\|token" --include="*.json" . | grep -v node_modules | grep -v "\.vercel/"   # expect no output
   ```
   `.gitignore` already excludes `node_modules`, `dist`, `.venv`, `.vercel`, `.env*` and the design-check folder.
3. **Commit and push** (the repo has no commits yet):
   ```bash
   git add .
   git commit -m "feat: WindSight day-ahead wind forecast monitor"
   git branch -M main
   git remote add origin git@github.com:YOUR-USER/a91f3c.git
   git push -u origin main
   ```
   If you want the commit author to stay anonymous too, set a neutral name and email for this repo before committing: `git config user.name "windsight"` and `git config user.email "windsight@users.noreply.github.com"`.
4. **Check the repo page** renders the README screenshot (`docs/screenshot.png`) and the three doc links.

## 4. Record the video

### Setup (15 minutes)

- **Tools:** QuickTime Player → File → New Screen Recording (or press Cmd+Shift+5) records the screen with your microphone. OBS Studio is fine too. Record at the native display resolution; YouTube will offer 1080p.
- **Window:** a single browser window at about 1440 by 900, light mode, browser zoom 110% so numbers read on a phone. Hide bookmarks and other tabs. Close notifications (Do Not Disturb).
- **Tabs, in order:** (1) the live Vercel URL, default view; (2) the same URL with `?from=2026-01-25&to=2026-01-31&gate=09:50`; (3) `https://YOUR-APP.vercel.app/api/docs`; (4) the repo in your editor with `backend/app/analysis.py` open; (5) a terminal in `backend/` ready to run `.venv/bin/pytest -q`; (6) `docs/DESIGN.md` on GitHub, scrolled to the architecture diagram.
- **Warm the cache** by loading tabs 1 and 2 once before recording, so no spinner appears on camera.
- **Microphone:** a headset or the laptop mic in a quiet room. Speak at a normal pace, about 140 words a minute. Each script below is around 600 words, which is 4 to 4.5 minutes with pauses for clicking.
- **Record Part 1 and Part 2 as two takes**, then trim and join them in QuickTime (Edit → Add Clip to End) or iMovie. Retakes are cheap; a clean 9-minute video beats a rushed 10-minute one.

### Part 1 script: the client (up to 5 minutes)

Audience: the day-ahead buying desk and their manager. Goal: they want to use it tomorrow.

**0:00 Opening (tab 1, default view)**
"Good morning. This is WindSight, the pilot we built for your day-ahead desk. You asked for two things: the wind forecast as it stood when you had to buy, and a measured answer to how far you can trust it. Here is January 2026 at the 09:50 N2EX gate."

**0:25 The finding (point at the title line)**
"The page starts with the answer. Over 744 delivery hours the forecast ran 1.7 gigawatts high on average, and in one hour in ten the wind came in more than 4.2 gigawatts below it. That one line is the month."

**0:50 The planning number (summary strip)**
"The strip turns that into a planning rule: wind you can count on, nine hours in ten, is the forecast minus 4.2 gigawatts. Next to it, the typical miss was just under 2 gigawatts, about two large CCGT units every hour. The bias is plus 1.7 gigawatts, so the forecast you have been trading on runs high. And the worst hour: a 6.9 gigawatt shortfall at 1 a.m. on 12 January."

**1:30 The main chart (hover one windy peak)**
"Black is what the wind farms actually produced. Blue is the forecast you had at 09:50 the day before. The shaded band is where the actual landed eight hours in ten. Watch the windy days: the blue line sits above the black one almost every time. When the forecast is high, the miss is bigger. The strip says it plainly: above 15 gigawatts, the 4.2 gigawatt haircut was beaten in 51 of 299 hours."

**2:20 Changing the decision time (drag slider to 16:00, then click N2EX)**
"You asked whether waiting for a later forecast would help. Drag the decision time to 4 p.m. The typical miss barely moves. The lead-time chart below shows why: accuracy improves slowly with lead time, and your window sits in the middle of a gentle slope. The error is structural, not stale data. Back to 09:50."

**3:05 The hardest week (tab 2)**
"Here is the last week of January alone. The typical miss jumps to 2.5 gigawatts and the nine-in-ten haircut to 5 gigawatts. The band widens. This is the kind of week where the hedge has to be bigger, and now you can see it coming."

**3:40 The distribution and the table (scroll to histogram, click Table on the main chart)**
"The error distribution leans to the shortfall side. That asymmetry is what you hedge against. Every chart has a table view with plain numbers and timestamps, ready to paste into your spreadsheet."

**4:05 Sharing and close (click Copy link)**
"Any view has a link. Copy it, send it to risk, and they see exactly what you see, on a phone, in dark mode if they like. Where next: a haircut that depends on wind level, a bias-corrected forecast that already cuts the typical miss by about a fifth in our tests, and your demand forecast on top to turn this into megawatts to buy. The pilot is live today at the URL in the repo. Thank you."

### Part 2 script: the tech lead (up to 5 minutes)

Audience: the engineer reviewing the code. Goal: an easy review and a clean hand-over.

**0:00 Architecture (tab 6, the diagram)**
"Part two, for the review. Architecture first. A React single-page app talks to one read-only FastAPI endpoint. The backend fetches two Elexon datasets once per process, the half-hourly wind actuals and the wind forecasts, about 2.5 megabytes, validates them and keeps them in memory. There is no database because the scope is a fixed historical month. Responses carry cache headers, so on Vercel the CDN answers repeat queries. In Docker, nginx serves the build and proxies the API."

**0:45 The domain rule (tab 4, analysis.py)**
"The whole product rests on one rule in `analysis.py`. A GB delivery day runs 23:00 to 23:00 UK time and is bought at the gate on the day before. For each target hour we find that gate, then take the latest forecast run published at or before it. Rows published after their own target are restatements, not forecasts, and are dropped. Errors are forecast minus actual, so positive means the buyer is short. Metrics are plain Python: MAE, RMSE, bias, deciles, a lead-time profile and a histogram. No pandas, which keeps the Vercel cold start small."

**1:40 Robustness (scroll to elexon.py and main.py)**
"`elexon.py` is the only I/O. Timestamps must carry an offset, actuals must be wind, and an empty 200 from Elexon raises instead of being cached, so a bad upstream response can never be memoised for a day. A lock stops concurrent cold requests fetching twice. `main.py` validates input before touching Elexon, uses an ASCII-only gate pattern because a Unicode digit would pass a `\d` regex and crash the parser, and wraps every error, including unexpected ones, in the same JSON envelope."

**2:25 Tests (tab 5, run pytest)**
"Forty-four backend tests, no network. Domain rules including the summer-time case, the API contract, and the Elexon client against a fake upstream: the exact query parameters, failed fetch not cached, empty payload rejected, five concurrent cold requests fetch once. On the frontend, eighteen unit tests for URL parsing, tick maths and formatting, and six Playwright journeys on desktop and phone: the date picker applies and cancels, the keyboard slider batches requests, the table view, no console errors, no horizontal scroll."

**3:15 Frontend decisions (tab 1)**
"The frontend keeps one piece of state, the query, mirrored in the URL. Fetches abort when superseded, and a failed refetch drops stale data so numbers never sit under the wrong controls. Charts load as a separate chunk, so the first paint ships 128 kilobytes of JavaScript instead of 254 and the figures appear before Recharts does. Accessibility was audited with axe: the slider announces the time, the picker is a named dialog, chart sections are headings, focus rings meet contrast. Lighthouse on the Docker stack scores 1.0 for accessibility and best practices and 0.78 for performance on the mobile profile."

**4:00 Deployment and hand-over**
"Deployment is two paths from one config. Docker: a non-root Python image and an nginx image with gzip, an uncached `index.html` so redeploys cannot strand old asset hashes, security headers, a content security policy on documents, and a re-resolving upstream. Vercel: static build plus a Python function with the same headers. Python versions are pinned in `uv.lock` and exported to `requirements.txt`, so both targets run identical packages."

**4:30 Known limits and next steps**
"Two honest caveats are documented and shown in the UI. The P90 haircut is pooled across wind levels: too cautious below 15 gigawatts, too loose above 20, where it fails about half the time. And the forecast dataset sits about 15 percent above the metered one even for hours already past, so part of the bias is a basis difference. The next steps follow from that: a level-conditioned band, then a bias-corrected forecast. `DESIGN.md` has the trade-offs and the module map. Thanks for reviewing."

## 5. Upload to YouTube as unlisted

1. Export the joined recording as MP4 (QuickTime: File → Export As → 1080p).
2. Go to studio.youtube.com → Create → Upload videos, pick the file.
3. Title: "WindSight: GB day-ahead wind forecast monitor (pilot demo + technical review)". Description: one line per part with timestamps ("0:00 Part 1: client overview", "4:45 Part 2: technical review") and the repo and Vercel links.
4. Audience: "No, it's not made for kids". Visibility: **Unlisted**. Save and copy the link.
5. Open the link in a private window to confirm it plays without signing in.

## 6. Final checks before you submit

```bash
cd backend && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check .
cd ../frontend && npm run check && npm run e2e
cd .. && docker compose up --build -d && curl -s http://localhost:8080/api/v1/health && docker compose down
```

- [ ] README "Live demo" line has the real URL and the link opens.
- [ ] Repo name is random, repo is public, `.vercel/` is not in it.
- [ ] Video is under 10 minutes, unlisted, and plays in a private window.
- [ ] The README states that AI tools were used (it does, last section) and the file list matches the tree.
