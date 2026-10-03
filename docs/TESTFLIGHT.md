# TechVisor — TestFlight (iOS)

Two paths:

1. **Automated (recommended):** push a `release/*` branch → EAS Workflow builds iOS, then **EAS Submit** (`type: submit`) uploads it to App Store Connect. It appears in TestFlight after Apple processing.
2. **Manual:** run `eas build` / `eas submit` from your Mac (Apple 2FA in the terminal).

The workflow uses the free-plan submit job, not Expo’s paid `type: testflight` job. A message that you “need a paid plan” for TestFlight-with-`build_id` is an **Expo** plan limit, not your Apple Developer membership. Your stored App Store Connect API key is what CI uses to submit.

Expo project: [emayan/techvisor](https://expo.dev/accounts/emayan/projects/techvisor)  
Bundle ID: `ca.techvisor.app`  
API baked into builds: `https://techwiser.onrender.com` (`mobile/eas.json`)  
Workflow file: `mobile/.eas/workflows/testflight.yml`

---

## Automated: GitHub → EAS Workflows → TestFlight

Pushing to **`main` does not** ship to TestFlight. When you are ready (after a batch of commits), cut a **`release/*`** branch and push it. That alone triggers the workflow.

### One-time setup (you must do this in the browser)

#### A. Link GitHub to the Expo project

1. Open **[Expo → techvisor → GitHub settings](https://expo.dev/accounts/emayan/projects/techvisor/github)**.
2. Install the **Expo GitHub App** on the GitHub account/org that owns `EMAYAN08/techwiser` (Owner/Admin on the Expo account).
3. Link repository **`EMAYAN08/techwiser`**.
4. Set **Base directory** to **`mobile`** (this repo is a monorepo; `eas.json` and `.eas/workflows/` live under `mobile/`).
5. Confirm the Expo account has a **linked GitHub user** under [Account → Connections](https://expo.dev/accounts/emayan/settings/connections).

Without the GitHub link + base directory `mobile`, pushes will not run the workflow.

#### B. Apple credentials for non-interactive CI

CI cannot complete Apple 2FA prompts. Do this once from a machine where you can finish 2FA:

```bash
cd mobile
npm install
npx eas-cli login          # Expo account emayan
npx eas credentials:configure-build -p ios -e preview
```

Also configure App Store Connect for submit (API key preferred for CI):

1. [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api) → create a key with **App Manager** (or Admin).
2. Download the `.p8` once.
3. On Expo: project → **Credentials** / or run:

```bash
cd mobile
npx eas credentials -p ios
# Choose the submit / App Store Connect API key path and upload Issuer ID, Key ID, .p8
```

Or set submit credentials via `eas.json` / EAS dashboard as described in [Apple App Store CI/CD submission](https://docs.expo.dev/submit/ios/#submitting-your-app-using-cicd-servers).

Until Apple credentials + ASC API key exist on the Expo project, the workflow’s **build** may work after a one-time interactive build, but **TestFlight submit** will fail in CI.

#### C. App Store Connect app record

If not already created:

1. [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **+** → New App.
2. Bundle ID: `ca.techvisor.app`
3. Name: **TechVisor**
4. Encryption: `ITSAppUsesNonExemptEncryption` is already `false` in `app.json`.

### Cut a release and publish to TestFlight

From a clean `main` (or the commit you want to ship):

```bash
git checkout main
git pull origin main

# Name the branch with the version you are shipping
git checkout -b release/1.0.1
git push -u origin release/1.0.1
```

What happens next:

1. Expo GitHub App sees the push to `release/*`.
2. EAS runs `mobile/.eas/workflows/testflight.yml`.
3. Job **Build iOS (preview)** uses profile `preview` (`distribution: store`, autoIncrement).
4. Job **Submit to App Store Connect (TestFlight)** runs `type: submit` with profile `preview` (same as `eas submit -p ios --profile preview`). It uploads the IPA with the ASC API key already on the Expo project. This is not the paid `type: testflight` job.
5. Watch progress: [Expo → techvisor → Workflows](https://expo.dev/accounts/emayan/projects/techvisor/workflows) and the commit’s GitHub Checks.
6. After Apple processing (often 10–30+ minutes), the build shows in App Store Connect → TestFlight. Install via the **TestFlight** app on your iPhone. (Submit does not auto-assign external groups; add yourself as an internal tester in App Store Connect if needed.)

Optional: bump marketing version in `mobile/app.json` before cutting the branch if you want the version string to change (build number still auto-increments via EAS).

### Releasing again later

```bash
git checkout main && git pull
git checkout -b release/1.0.2   # new branch name each time
git push -u origin release/1.0.2
```

Extra commits pushed to the **same** `release/1.0.1` branch will also re-trigger the workflow. Prefer a **new** `release/x.y.z` per ship so each TestFlight build maps to one intentional cut.

### Manual workflow run (without a new branch)

If GitHub is linked and you are logged into EAS:

```bash
cd mobile
npx eas workflow:run .eas/workflows/testflight.yml
```

Do **not** use this casually — it still costs a full iOS build + submit.

---

## Manual path (local Mac / Apple 2FA)

Use this for the **first** Apple credential setup, or if CI is not linked yet.

### Prerequisites

1. **Apple Developer Program** membership (paid, active).
2. Expo account (`emayan`).
3. Node 20+ and a clone of this repo.
4. On [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → **App-Specific Passwords**, create one labeled `EAS` if the CLI asks for a password.

### 1. Install tools and log in

```bash
cd mobile
npm install
npx eas-cli login
npx eas whoami             # should print emayan
```

### 2. Confirm app identity

In `mobile/app.json`:

- `"name": "TechVisor"`
- `"slug": "techvisor"`
- `"ios.bundleIdentifier": "ca.techvisor.app"`
- `extra.eas.projectId` → `aa04c275-a2ea-45aa-8fbf-250f88865b3f`

### 3. One Apple login (do not interrupt)

```bash
cd mobile
npx eas build --platform ios --profile preview
```

When prompted: Apple account → app-specific password if asked → device/sms 2FA → allow distribution cert / provisioning / App Store Connect app creation.

Leave the terminal alone until you see a build URL:

`https://expo.dev/accounts/emayan/projects/techvisor/builds/<id>`

### 4. Wait for the cloud build

```bash
npx eas build:list --platform ios --limit 5
```

### 5. Submit to TestFlight

```bash
cd mobile
npx eas submit --platform ios --profile preview --latest
```

Or from the Expo build page: **Submit to App Store**.

### 6. Install on your iPhone

1. Install **TestFlight** from the App Store.
2. App Store Connect → app → **TestFlight** → add yourself as an internal tester.
3. Accept invite, install **TechVisor**.

---

## Profiles

| Profile | In `eas.json` | Use when |
|--------|----------------|----------|
| `preview` | store distribution + autoIncrement | TestFlight / internal testing (workflow + manual TF) |
| `production` | store + autoIncrement | App Store release |
| `development` | `developmentClient: true` | Custom dev client (not TestFlight) |

For a store release later (manual):

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production --latest
```

---

## Troubleshooting

- **Workflow never starts:** GitHub not linked, Expo GitHub App not installed, or **Base directory** not set to `mobile`. Recheck [GitHub settings](https://expo.dev/accounts/emayan/projects/techvisor/github).
- **“TestFlight jobs … require a paid plan”:** that is Expo’s paid `type: testflight` + `build_id` job, not your Apple account. The workflow uses `type: submit`, which the free Expo plan includes. Do not switch the YAML back to `type: testflight` unless you upgrade Expo.
- **Submit fails in CI / non-interactive:** App Store Connect API key missing on the Expo project. Configure credentials (section B above). Never rely on interactive 2FA in workflow runs.
- **Repeated Allow / new codes (manual):** you started multiple `eas build` logins. Stop extras, wait, run **one** build again.
- **Wrong API host in the app:** confirm `EXPO_PUBLIC_API_URL` in `eas.json` for that profile, then rebuild (env is baked in at build time).
- **JS-only changes:** if the native binary has not changed, prefer [EAS Update](https://docs.expo.dev/eas-update/introduction/) instead of a full TestFlight rebuild when you have Update configured.

---

## What’s already done in this repo

- App renamed to **TechVisor**, bundle ID `ca.techvisor.app`
- `mobile/eas.json` with preview/production pointing at Render; build images set for GitHub/EAS CI
- Expo project linked in app config: `aa04c275-a2ea-45aa-8fbf-250f88865b3f`
- EAS Workflow: `mobile/.eas/workflows/testflight.yml` on `push` → `release/*` (`build` then free-plan `submit` to App Store Connect / TestFlight)
- **Still on you:** link GitHub + set base directory `mobile`, finish Apple/ASC credentials for CI, then cut `release/x.y.z` when you want TestFlight
