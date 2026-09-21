# SpecMatch

Mobile app that compares tech products from Canadian retailer URLs — specs, AI summary, and side-by-side trade-offs.

## Structure

- `/mobile` — React Native (Expo) app
- `/server` — Node.js (Express) API
- `/site` — Public GitHub Pages site (privacy, terms, support)
- `/docs` — PRD, design specs, and store submission guide
- `/.agents` — AI agent instructions

## Getting started

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Backend

```bash
cd server
npm install
npm run dev
```

## Public site

[emayan08.github.io/techwiser](https://emayan08.github.io/techwiser/)

| Page | URL |
| --- | --- |
| Home | https://emayan08.github.io/techwiser/ |
| Privacy | https://emayan08.github.io/techwiser/privacy.html |
| Terms | https://emayan08.github.io/techwiser/terms.html |
| Support | https://emayan08.github.io/techwiser/support.html |

Paste the Privacy and Support URLs into App Store Connect. The iOS Settings screen opens the same pages.

## App Store

Step-by-step approval guide (icons, privacy, review notes, EAS submit):

**[docs/APP_STORE.md](docs/APP_STORE.md)**

Track progress on the GitHub issue: **[App Store checklist](https://github.com/EMAYAN08/techwiser/issues/2)** (boxes are clickable).
