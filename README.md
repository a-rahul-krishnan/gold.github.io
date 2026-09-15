# Tamil Nadu Gold Predictor — GitHub Pages

A front-end-only HTML/CSS/JS dashboard inspired by the prediction method discussed in the uploaded video.

## What it does

- Live XAU/USD spot data through XAUS (browser CORS-enabled).
- Daily USD/INR reference rate through Frankfurter.
- Manual COMEX Gold futures input (current + previous close).
- Optional manual MCX Gold confirmation.
- Simple directional score:
  - COMEX > +2% = +2
  - COMEX +0.5% to +2% = +1
  - COMEX -0.5% to +0.5% = 0
  - COMEX -2% to -0.5% = -1
  - COMEX < -2% = -2
  - USD/INR up (rupee weaker) = +1
  - USD/INR down (rupee stronger) = -1
  - MCX up = +1
  - MCX down = -1
- Produces UP / WAIT / DOWN and a conservative indicative 22K range.

## Important limitation

This is a heuristic dashboard, not a verified predictive model and not financial advice. The live global-gold feed is XAU/USD spot, **not a guaranteed COMEX futures quote**. For faithful reproduction of the video method, enter a COMEX Gold futures quote manually at the chosen overnight checkpoint.

The "2:00–2:30 AM IST" timing shown in the UI is the practical window discussed from the video analysis. It should be treated as a window, not a guaranteed daily settlement. US daylight-saving changes can shift the exact session-equivalent time.

MCX live data is intentionally manual in this static build because a trustworthy, browser-safe public MCX quote feed is not assumed. You can later wire one in with a public API or your own backend.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. GitHub → Settings → Pages → Deploy from branch → `main` / root.
4. Open the published Pages URL.

No build step is required.

## Data sources

- XAUS API: https://xaus.com/api/ — browser CORS, no API key required, indicative mid-market XAU/USD spot; the API documentation asks clients to cache responses for at least 30 seconds.
- Frankfurter: https://frankfurter.dev/ — free, keyless FX reference data; current public documentation exposes daily latest/rate endpoints.

See source websites for their current terms and data definitions.
