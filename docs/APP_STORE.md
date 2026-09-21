# SpecMatch — App Store approval guide

How to get the iOS app approved. Use this with the [App Store checklist issue](https://github.com/EMAYAN08/techwiser/issues/2) — check items off there as you finish them.

This app is an Expo React Native product comparison tool (camera / photo barcode + QR, URL compare, AI spec extraction, no user accounts). Apple will review it as a **Shopping** or **Lifestyle** app that talks to your backend and to an LLM.

Official references:

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Expo: App store best practices](https://docs.expo.dev/distribution/app-stores/)
- [Expo: Submit to Apple](https://docs.expo.dev/submit/ios/)

---

## 0. Current gaps in this repo (fix first)

These will get a first-time binary rejected if you ship today:

| Gap | Where | What to do |
| --- | --- | --- |
| Display name is `"mobile"` | `mobile/app.json` | Set `"name": "SpecMatch"` (or the final store name) |
| No iOS bundle identifier | `mobile/app.json` → `ios.bundleIdentifier` | Add something like `ca.specmatch.app` |
| No EAS project | `mobile/` | Run `npx eas init` and commit `eas.json` |
| Privacy Policy row opens GitHub | `mobile/app/(tabs)/settings.tsx` | Point at a public HTTPS HTML privacy page |
| Terms of Service row opens GitHub | same file | Point at a public HTTPS HTML terms page |
| No `PrivacyInfo.xcprivacy` | iOS build | Add a privacy manifest (Expo generates one if you configure it) |
| No production API URL | `mobile/utils/apiBase.ts` | Ship a stable HTTPS backend, not Expo tunnel |
| Icon / splash still generic | `mobile/assets/icon.png` | 1024×1024 marketing icon, no alpha, no baked rounded corners |

---

## 1. Apple Developer Program

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) with the legal entity that will own the app (you as an individual, or a Canadian corporation).
2. Pay the annual fee and wait for Apple to activate the account (can take 24–48 hours).
3. In [App Store Connect](https://appstoreconnect.apple.com) accept the latest Paid Apps / Free Apps agreements, tax, and banking even if the app is free.
4. Create the app record: **My Apps → + → New App**.
   - Platform: iOS
   - Name: the store listing name (30 characters max)
   - Primary language: English (Canada) if available, else English (US)
   - Bundle ID: must match `ios.bundleIdentifier` exactly
   - SKU: internal, e.g. `specmatch-ios`
   - User access: Full Access for you

Done when the app appears in App Store Connect with status **Prepare for Submission**.

---

## 2. Identity, bundle ID, and EAS

1. In `mobile/app.json` set:

```json
{
  "expo": {
    "name": "SpecMatch",
    "slug": "specmatch",
    "scheme": "specmatch",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "ca.specmatch.app",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}
```

2. From `mobile/`:

```bash
npx eas-cli login
npx eas init
npx eas build:configure
```

3. In `eas.json` keep a `production` profile that uses the App Store distribution certificate. Commit `eas.json` and the Expo project ID.

4. Register the bundle ID on the Apple Developer portal (EAS can do this on first build if you allow it).

Done when `eas.json` exists, the bundle ID is unique, and the store name is no longer `mobile`.

---

## 3. App icon, splash, and store artwork

Apple rejects icons with transparency, baked-in rounded corners, or “coming soon” screenshots.

1. **App icon (required):** 1024×1024 PNG, RGB, no alpha channel, no rounded corners. Keep the owl on a solid background. Set `expo.icon` to this file.
2. **iOS splash:** `expo.splash` with a solid background that matches launch (white for light). EAS will generate the storyboard.
3. **Screenshots** in App Store Connect, for the devices Apple currently requires (check the media manager — typically 6.7"/6.9" iPhone and 13" iPad if `supportsTablet` is true):
   - Home with two product URLs ready
   - Loading owl
   - Comparison overview
   - A spec category
   - Product detail
   - Settings
4. Do **not** screenshot “Coming soon”, empty states only, or Expo Dev Client chrome.
5. Optional: a 15–30s App Preview of URL → compare. No iOS status bar overlays that look fake.

Done when the 1024 icon uploads without an alpha error and screenshots show the real product.

---

## 4. Privacy policy and terms (Guideline 5.1.1)

Apple requires a **public HTTPS HTML** privacy policy, linked in **two** places: App Store Connect metadata **and** inside the app.

1. Host pages such as `https://specmatch.ca/privacy` and `https://specmatch.ca/terms` (GitHub repo, Google Doc, or PDF **will be rejected**).
2. The privacy page must say, in plain language:
   - What you collect: product URLs / barcodes the user submits, optional photos they pick for scanning, comparison history stored **on device**
   - What you do **not** collect: no account, no email, no precise location, no contacts
   - That product pages are fetched by your server and sent to an AI provider (name OpenAI and Google Gemini if used as fallback) to extract specs
   - Retention: server logs (how long), on-device history (user can Clear search history)
   - How to request deletion of server logs (an email is enough because there is no account)
   - PIPEDA contact for Canada
3. Terms: acceptable use (no scraping abuse), AI output is informational not professional advice, retailer trademarks belong to them.
4. In Settings, change the Privacy Policy and Terms rows from GitHub to those URLs.
5. Paste the same privacy URL into App Store Connect → App Information → Privacy Policy URL.
6. Add a Support URL (Guideline 1.5) — a simple contact page or email `mailto` landing page.

Done when a reviewer can tap Settings → Privacy Policy and read a real policy in Safari with no login.

---

## 5. App Privacy nutrition labels

In App Store Connect → App Privacy, declare **exactly** what the binary does.

Recommended answers for SpecMatch today:

| Data type | Collected? | Linked to identity? | Used for tracking? | Notes |
| --- | --- | --- | --- | --- |
| Product interaction / browsing history | Optional, if you log URLs server-side | No (no account) | No | If you only keep URLs in memory for the request, you can say not collected |
| Photos or videos | Yes, if they pick a photo to scan | No | No | User-provided; used only to decode barcode/QR |
| Crash data | Yes if you add Sentry / Expo updates | No | No | Skip if you have none |
| Email / name / location / contacts | No | — | — | |

Also declare third-party partners: **OpenAI**, **Google** (Gemini fallback), your hosting provider.

This questionnaire **must match** the privacy policy. Mismatch is an automatic 5.1.1 / 5.1.2 bounce.

Done when App Privacy status is **Published** and matches the policy.

---

## 6. Privacy manifest (`PrivacyInfo.xcprivacy`)

Required for App Store uploads.

1. Expo SDK 51+ emits a manifest from config plugins. After `eas build`, open the archive and confirm `PrivacyInfo.xcprivacy` is present.
2. Declare required-reason APIs you actually use:
   - `NSPrivacyAccessedAPICategoryUserDefaults` — theme, haptics, recent comparisons (`CA92.1`)
   - File timestamp APIs only if a dependency uses them
3. Declare collected data the same way as nutrition labels.
4. List third-party SDKs (OpenAI is server-side so it does **not** go in the iOS manifest; `expo-camera` / `expo-image-picker` do).

Done when the Transporter / EAS submit log does not warn about a missing privacy manifest.

---

## 7. Permission strings (Guideline 5.1.1(iv))

Already in `mobile/app.json`. Keep them specific and only for APIs you call:

- **Camera:** “Compare uses the camera to scan product barcodes and QR codes from boxes, shelf tags, and retailer pages.”
- **Photo library:** “Compare reads a photo so you can scan a product barcode or QR code from your camera roll.”

Rules:

1. Do **not** add microphone, location, tracking, or contacts. `expo-camera` already has `microphonePermission: false`.
2. Prompt only when the user taps Scan — never on first launch.
3. If they deny, the rest of the app (URL compare) must still work. Reviewers test this.
4. Do not use `NSPhotoLibraryAddUsageDescription` unless you save images (you don’t).

Done when a fresh install can compare two URLs without ever seeing a permission dialog.

---

## 8. AI / third-party disclosure (Guideline 5.1.2)

Apple requires explicit disclosure when personal data is sent to third-party AI. Product URLs and scraped page text go to OpenAI (Gemini fallback).

1. State this in the privacy policy (section 4).
2. Optional but safer: a one-line note on the compare confirmation / loading screen: “Product pages are analyzed by AI to build this comparison.”
3. Do not send photos of the user’s face to the LLM. Barcode/QR should be decoded on device; only the resulting URL/UPC hits the server.
4. In Review Notes, mention: “No account. User-submitted retailer URLs are sent to our API, which uses OpenAI to extract public product specs.”

Done when the policy names the AI vendors and the binary does not upload camera frames to the LLM.

---

## 9. Completeness (Guideline 2.1) — no placeholders

Reviewers reject Expo apps that look unfinished.

1. Replace or hide **Coming soon** surfaces if they look like a stub. Name search that is not shipped should not be a primary tab that dead-ends.
2. Remove any mock/dev “seed comparison” tools from the production build (`__DEV__` only).
3. Production `apiBase` must be HTTPS and stay up for the entire review (often 24–72 hours). Tunnel URLs fail 2.1.
4. Loading, empty, and error states must be real UI (you already have these) — not “lorem” or Expo boilerplate.
5. Every button in Settings must go somewhere real (privacy, terms, clear history).

Done when a reviewer can complete **URL → Compare → spec sheet → product page → back** without a dead end.

---

## 10. Review notes and demo material (Guideline 2.1)

There is **no login**, so no demo account. You still must make review easy.

In App Store Connect → Review Information:

1. Contact name, phone, email you will answer within hours.
2. Notes template:

```
SpecMatch compares 2–3 Canadian retailer product pages.

No account. No IAP. No tracking.

To review:
1. Open Home.
2. Paste these two Best Buy Canada URLs (or any in-stock tech SKUs):
   <URL A>
   <URL B>
3. Tap Compare. Wait for the owl animation.
4. Open a spec row, then a product.

Camera / Photos are only used if you choose Barcode or QR. URL compare works without granting them.

Backend: https://<your-api-host>  (must stay up during review)
```

3. Attach a screenshot of two valid URLs if helpful.
4. For QR review, you may attach a sample QR image in the review notes attachments (optional).

Done when notes include working URLs you tested the same week you submit.

---

## 11. Metadata (Guideline 2.3)

| Field | Limit | Suggestion |
| --- | --- | --- |
| Name | 30 | SpecMatch |
| Subtitle | 30 | Compare tech. Instantly. |
| Description | 4000 | What it does, Canada retailers, no account, AI summaries. Do not mention Expo or competitors as the headline. |
| Keywords | 100 chars | compare,specs,best buy,electronics,price |
| Category | — | Shopping (primary). Lifestyle or Reference secondary. |
| Age rating | questionnaire | 4+ unless review text is spicy. Answer no to unrestricted web, gambling, etc. |
| Copyright | — | `2026 <Your Legal Name>` |
| Content rights | — | You display retailer product data for comparison; you do not claim their trademarks. |

Screenshots and description must match the binary. Don’t advertise price-match across 7 retailers if that tab is incomplete.

Done when the listing would make sense to a stranger who never saw the repo.

---

## 12. iPad, small phones, and orientation (Guideline 2.4 / 4.2)

`ios.supportsTablet` is currently `true`, so Apple **will** launch it on iPad.

1. Test iPhone SE (small) and iPhone 16 Pro Max.
2. Test iPad — tab bar, comparison columns, and product cards must be usable. If iPad is poor, set `supportsTablet: false` **before** the first review (changing later is painful).
3. Portrait only is already set (`orientation: "portrait"`). Don’t claim landscape in metadata.
4. Dynamic Type: titles should not clip at the largest accessibility size if you can help it.

Done when the same compare flow works on SE, Pro Max, and iPad (or tablet support is turned off on purpose).

---

## 13. Performance, crashes, and IPv6 (Guideline 2.1 / 2.2)

1. TestFlight the production build on a physical iPhone **and** iPad.
2. Run: cold launch, compare 2 URLs, compare 3 URLs, cancel mid-load, deny camera, open Library / Settings after a compare, export PDF, dark mode, light mode.
3. No crashes, no infinite spinners, no Expo error redbox.
4. Apple reviews on IPv6. Your API host must work on IPv6 (most managed hosts do).
5. Don’t ship `__DEV__` logging of full retailer HTML.

Done after at least one external tester (or you on a clean device) finishes the flow on TestFlight.

---

## 14. Legal, scraping, and trademarks (Guidelines 4.1, 5.2)

1. You may compare publicly available product listings. Do not scrape behind a login or bypass retailer anti-bot in a way that impersonates a user session cookie you don’t own.
2. Don’t use Best Buy / Apple / Samsung logos in **App Store screenshots** in a way that implies partnership. In-app retailer marks for attribution is normal; keep them accurate.
3. AI summaries must not claim to be the retailer or a certified expert. Your empty/error copy is already cautious — keep it.
4. Export PDF should not include a fake “official” retailer letterhead.

Done when listing and PDF clearly present SpecMatch as an independent comparison tool.

---

## 15. Kids, accounts, IAP, tracking (N/A — still answer)

| Topic | SpecMatch | Action |
| --- | --- | --- |
| Kids Category | No | Don’t check Kids. |
| Sign in / Sign in with Apple | No accounts | Don’t add a fake login. |
| Account deletion (5.1.1(v)) | N/A | Skip. “Clear search history” is enough for on-device data. |
| In-app purchases | None | Don’t add the IAP capability. |
| App Tracking Transparency | No cross-app tracking | Don’t include `NSUserTrackingUsageDescription`. Answer No to tracking in nutrition labels. |
| Encryption export | HTTPS only | In App Store Connect, typically **Yes, but exempt** (standard HTTPS). Expo/EAS: `ios.config.usesNonExemptEncryption: false`. |

Done when capabilities in the Apple portal match the binary (no leftover Sign in with Apple or IAP).

---

## 16. Production backend for review

1. Deploy `server/` to a stable host (Fly, Railway, Cloud Run, etc.) with HTTPS.
2. Set mobile production API base to that host.
3. Keys (`OPENAI_API_KEY`, Gemini) live **only** on the server. Never in the Expo client extra config.
4. Rate-limit compare so a reviewer (and bots) can’t run up a huge LLM bill, but don’t 429 the reviewer on the first compare.
5. Keep the service up until the app is **Ready for Sale** (not just until you click Submit).

Done when you can compare two live Best Buy URLs on a TestFlight build with no tunnel.

---

## 17. Build, TestFlight, submit

```bash
cd mobile
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

Then in App Store Connect:

1. Select the build (processing can take 10–30 minutes).
2. Fill version release notes (“Initial release: compare products from Canadian retailer URLs.”).
3. Answer the encryption question.
4. Add review notes + sample URLs.
5. **Add for Review** → **Submit to App Review**.

Expect 24–48 hours. Reply to Rejection Resolution Center within 24 hours if they ask for more info.

---

## 18. Common rejection replies (have these ready)

| Rejection | Fix |
| --- | --- |
| 5.1.1 Privacy policy | Host real HTML; link it in Settings and in Connect |
| 2.1 App completeness | Backend was down / tunnel URL / Coming soon as a main path |
| 2.1 Demo | Paste working retailer URLs in notes; confirm products are in stock |
| 2.3.1 Hidden features | Production build still had seed/mock tools |
| 4.2 Minimum function | App looks like a thin web wrapper — keep native UI, which you have |
| 5.1.2 Data to third parties | Name OpenAI/Gemini in the policy |
| Camera purpose too vague | Keep the current barcode/QR-specific strings |
| iPad layout | Fix or set `supportsTablet: false` |

---

## 19. After approval

1. Set pricing to Free (Canada + countries you support).
2. Phased release optional.
3. Bump `version` / `ios.buildNumber` for every new upload.
4. Keep privacy policy and nutrition labels in sync when you add analytics, accounts, or ads.

---

## Checklist map

Every box on the GitHub issue maps to a section above:

| Issue item | This guide |
| --- | --- |
| Developer Program + App Store Connect app record | §1 |
| Bundle ID, display name, EAS | §2 |
| Icon, splash, screenshots | §3 |
| Privacy + terms URLs in app and Connect | §4 |
| Nutrition labels | §5 |
| Privacy manifest | §6 |
| Permission strings | §7 |
| AI disclosure | §8 |
| No placeholders / live API | §9, §16 |
| Review notes + sample URLs | §10 |
| Store metadata | §11 |
| Device QA | §12, §13 |
| Legal / trademarks | §14 |
| N/A capabilities | §15 |
| TestFlight + submit | §17 |
