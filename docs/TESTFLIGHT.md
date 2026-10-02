# TechVisor — TestFlight (iOS) step-by-step

Build and install a real iPhone build via **EAS + TestFlight**. Do this on **your Mac** (or any machine where you can complete Apple 2FA once without interrupting the CLI).

Expo project (already linked): [emayan/techvisor](https://expo.dev/accounts/emayan/projects/techvisor)  
Bundle ID: `ca.techvisor.app`  
API used in builds: `https://techwiser.onrender.com` (set in `mobile/eas.json`)

---

## Prerequisites

1. **Apple Developer Program** membership (paid, active) for the Apple ID you will use.
2. An **Expo** account (you already use `emayan`).
3. Node 20+ and a clone of this repo.
4. On [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → **App-Specific Passwords**, create one labeled `EAS` (you will need it if the CLI asks for a password).

---

## 1. Install tools and log in

```bash
cd mobile
npm install
npx eas-cli login          # browser login to Expo (emayan)
npx eas whoami             # should print emayan
```

---

## 2. Confirm app identity

In `mobile/app.json` you should already have:

- `"name": "TechVisor"`
- `"slug": "techvisor"`
- `"ios.bundleIdentifier": "ca.techvisor.app"`
- `extra.eas.projectId` pointing at the Expo project above

`mobile/eas.json` defines `preview` and `production` profiles with `EXPO_PUBLIC_API_URL=https://techwiser.onrender.com`.

---

## 3. One Apple login (do not interrupt)

Run the build **once** and finish Apple 2FA in the same terminal session:

```bash
cd mobile
npx eas build --platform ios --profile preview
```

When prompted:

1. **Log in to your Apple account?** → `Y`
2. Enter your **Apple ID** (if asked).
3. Enter the **app-specific password** (if asked) — not your normal Apple password.
4. **How do you want to validate?** → choose **device** (trusted device) or **sms**.
5. On your iPhone/Mac, tap **Allow**, then enter the **6-digit code** into the same terminal when asked.
6. If EAS asks to create a distribution certificate / provisioning profile for `ca.techvisor.app`, allow it.
7. If it asks for an App Store Connect app / bundle ID registration, allow EAS to create them.

Leave the terminal alone until you see a build URL like:

`https://expo.dev/accounts/emayan/projects/techvisor/builds/<id>`

Interrupting and re-running this step will send **new** Apple Allow prompts and invalidate old codes.

---

## 4. Wait for the cloud build

```bash
npx eas build:list --platform ios --limit 5
```

Or open the build URL from step 3. Status should become **finished**.

---

## 5. Submit to TestFlight

After the iOS build succeeds:

```bash
cd mobile
npx eas submit --platform ios --profile preview --latest
```

Or from the Expo build page: **Submit to App Store**.

First-time App Store Connect setup (if not done yet):

1. Open [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **+** → New App.
2. Bundle ID: `ca.techvisor.app`
3. Name: **TechVisor**
4. Complete encryption / export compliance if asked (`ITSAppUsesNonExemptEncryption` is already `false` in `app.json`).

---

## 6. Install on your iPhone

1. Install **TestFlight** from the App Store.
2. In App Store Connect → your app → **TestFlight**, add yourself as an internal tester (or use the public link once processing finishes).
3. Accept the invite email/SMS, open TestFlight, install **TechVisor**.

Apple processing after submit often takes **10–30 minutes** (sometimes longer).

---

## Profiles (what to use)

| Profile | In `eas.json` | Use when |
|--------|----------------|----------|
| `preview` | store distribution | TestFlight / internal testing (recommended first) |
| `production` | store + autoIncrement | App Store release |
| `development` | `developmentClient: true` | Custom dev client (not needed for TestFlight) |

For a store release later:

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production --latest
```

---

## Troubleshooting

- **Repeated Allow / new codes:** you started multiple `eas build` logins. Stop extras (`Ctrl+C`), wait a minute, run **one** build again.
- **Invalid code:** code expired or was typed into the wrong prompt. Request a new Allow and enter the new code only at `Please enter the 6 digit code`.
- **Credentials not set up / non-interactive:** never use `--non-interactive` until Apple credentials already exist on the Expo project.
- **Wrong API host in the app:** confirm `EXPO_PUBLIC_API_URL` in `eas.json` for that profile, then rebuild (env is baked in at build time).

---

## What’s already done in this repo

- App renamed to **TechVisor**
- Bundle ID `ca.techvisor.app`
- `mobile/eas.json` with preview/production env pointing at Render
- Expo project linked: `aa04c275-a2ea-45aa-8fbf-250f88865b3f`
- Expo CLI login on the agent machine was completed as **emayan**; you still need to finish Apple credentials + build on your side
