# GYOCC member app — store release checklist

Prepared 15 Nov 2026 against the current Apple App Store Review Guidelines and Google Play policies.

## What changed in code

- **Delete account inside the app**: Menu → Account → Delete account. The member confirms with their password, with Sign in with Apple, or with a 6-digit code emailed to them, and the account is deleted straight away.
  - **Deleted:** the login (including Google/Apple sign-in), profile details, push tokens, inbox, role links, uploaded documents, and the GPS points saved at clock-in/out.
  - **Kept, anonymised as "Former member":** attendance times and pay rows.
  - The organization owner is blocked until ownership is handed over.
  - Server: `backend/src/api/account/deletion.ts` and `backend/src/services/account-deletion.service.ts`. Tests: `backend/tests/account-deletion.db.test.ts`.
- **Sign in with Apple** on iPhone, next to Google (Apple guideline 4.8).
  - Server: `backend/src/lib/apple-signin.ts` and `backend/src/lib/auth.ts`.
  - App: `LoginScreen.tsx`, `api/auth.ts`, and `app.json` (`usesAppleSignIn`, plugin).
- **Privacy policy link** on the Welcome, Sign in and Register screens, plus Help and Privacy policy rows on the Account screen.
- **Permission prompts cleaned up** (`app.json`):
  - Removed: camera, microphone, motion, Face ID, "always" location and the dev-server local-network text.
  - Android: blocked microphone, camera, background location and "draw over other apps".
  - Clearer location and photo wording.
  - Privacy manifest reasons declared.
- **Welcome screen** no longer mentions stipends, which aren't in this release.
- **Website** (separate repo `gyocc-frontend`):
  - New page `/delete-account`.
  - `/privacy` now covers clock-in location, the outside services the app uses, account deletion, and the Philippine Data Privacy Act.

## You must do these (outside the code)

1. **Deploy the website** (`frontend/`, its own git repo) so <https://gyocc.org/delete-account> and the updated <https://gyocc.org/privacy> are live *before* submitting.
2. **Deploy the backend** with this code *before* submitting the app build. The new app calls `/api/account/deletion` and Apple sign-in, and neither works on the old server.
3. **Apple Developer portal → Identifiers → `org.gyocc.official`:** tick **Sign In with Apple**. EAS normally does this automatically when it updates the provisioning profile; check it after the first build.
4. **Apple sign-in revocation key (recommended):**
   - Apple Developer portal → Keys → **+** → enable Sign In with Apple for `org.gyocc.official`, then download the `.p8`.
   - Add these to the production backend environment:
     - `APPLE_TEAM_ID=CF2R28L757`
     - `APPLE_KEY_ID=<10-char key id>`
     - `APPLE_PRIVATE_KEY=<contents of the .p8>`
   - Without the key, deletion still works, but Apple-ID users keep GYOCC in their "Apps Using Apple ID" list.
5. **Create the reviewer demo account** (email + password; Apple can't receive your email codes):
   - Link it to a test roster member with at least one upcoming rehearsal and some attendance history.
   - Put the email and password in App Store Connect → App Review Information, and in Play Console → App access.
   - **Clock-in note for reviewers:** "Clock in only works within the venue's GPS radius during the call window, so the reviewer may see 'not at venue'. Attendance, schedules and account deletion work anywhere."
   - The reviewer may delete the demo account, so be ready to recreate it.
6. **Fill in App Store Connect:**
   - Privacy Policy URL: `https://gyocc.org/privacy`
   - Support URL: `https://gyocc.org/contact`
   - App Privacy answers: see below.
   - Age rating questionnaire: see below.
   - EU trader status: declare it, or leave the EU out of distribution.
7. **Fill in Google Play Console:**
   - Data safety: see below.
   - Account deletion URL: `https://gyocc.org/delete-account`
   - Privacy policy URL: `https://gyocc.org/privacy`
   - App access: the demo account.
   - **Precise-location declaration** (new; required by 27 Jan 2027): "Precise location is used only when the member taps Clock in/Clock out, to confirm they are at the venue."
8. **Check the delete-account page wording**:
   - It promises email requests are handled "within 30 days".
   - The developer name must match the Play listing exactly ("GenSan Youth Orchestra and Choir Corporation").
9. **Minors:** members may be under 18. The privacy page does not yet say anything about parental consent. Decide whether GYOCC wants to add a line about it.

## Apple — App Privacy ("nutrition label") answers

Tracking: **No**. The app does no tracking and has no ad or analytics SDKs.

| Data type | Collected? | Linked to the user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → Name | Yes | Yes | No | App Functionality |
| Contact Info → Email Address | Yes | Yes | No | App Functionality |
| Contact Info → Phone Number | Yes | Yes | No | App Functionality |
| Location → Precise Location | Yes | Yes | No | App Functionality |
| Identifiers → User ID | Yes | Yes | No | App Functionality |
| Identifiers → Device ID (push device id) | Yes | Yes | No | App Functionality |
| Other Data → attendance, RSVPs, clock-in/out times | Yes | Yes | No | App Functionality |
| Photos, Contacts, Health, Financial, Browsing, Search, Diagnostics, Usage analytics | No | | | |

- Phone number is optional; members can add it on the Account screen.
- Precise location is captured only at clock-in/out.
- Photos: not collected in this release, because there is no photo upload on reachable screens. If profile-photo upload comes back, add "Photos or Videos".

## Google Play — Data safety answers

- Does the app collect or share user data? **Yes, it collects. Not shared.** Service providers acting for GYOCC don't count as "sharing".
- Encrypted in transit? **Yes** (HTTPS).
- Can users request deletion? **Yes**: `https://gyocc.org/delete-account`

| Category → type | Collected | Required or optional | Purposes |
|---|---|---|---|
| Personal info → Name | Yes | Required | App functionality, Account management |
| Personal info → Email address | Yes | Required | App functionality, Account management |
| Personal info → User IDs | Yes | Required | App functionality, Account management |
| Personal info → Phone number | Yes | Optional | App functionality |
| Location → Precise location | Yes | Optional (only for clock-in) | App functionality |
| App activity → Other actions (attendance, RSVP) | Yes | Required | App functionality |
| Device or other IDs | Yes | Required | App functionality (push notifications) |

Everything else: **not collected**.

## Age rating inputs (both stores)

- No violence, sexual content, profanity, drugs, gambling, horror or medical content.
- No user-to-user chat, and no user-generated content visible to other users.
- No web browsing; the only links are to gyocc.org pages.
- Location: used only for attendance confirmation. It is **not** shared with other members. Admins of the member's own choir see clock-in results, not a live map.
  - Apple's new "Shared Location" descriptor (answers due 12 Jan 2027) asks about sharing location with other people. Answer **No** unless you see it differently.
- Expected result: **4+** (Apple) / **Everyone** (Google).

## Already fine

- `ITSAppUsesNonExemptEncryption = false`. The app only uses standard HTTPS, so no export-compliance documents are needed.
- Release builds always use `https://api.gyocc.org` (`mobile/src/api/config.ts`).
- Scholarship, earnings and notation screens can't be reached.
- Android target API: Expo SDK 57 / React Native 0.86 targets API 36, which meets Play's current requirement.
- iOS build must use Xcode 26 / iOS 26 SDK. Current EAS images do this.
- Google Play closed-test rule (12 testers for 14 days) only applies to *personal* developer accounts created after Nov 2023.
