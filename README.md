# Neonwater Digital — Client Studio

A client review portal for Neonwater Digital Solutions. Clients sign in to see their assigned website concepts, compare published versions, request changes and approve a specific design. Administrators manage projects and publish revisions.

**Status:** implementation ready for configuration. A Firebase project, private user accounts and Xneelo deployment have **not** been created or connected by this repository. The sample workspace is fictional and keeps decisions in memory only. Nothing in sample mode is sent to Neonwater.

## What’s included

- Navy, aqua, blue and purple interface; responsive desktop and phone layouts.
- Email/password sign-in, password reset and account password changes.
- Clients see only projects assigned to their Firebase UID.
- An admin dashboard to create projects and publish immutable design versions.
- Embedded HTTPS previews with desktop/mobile viewport controls and an open-in-new-tab fallback.
- Version-specific change requests and design approvals, recorded with the signed-in identity and a server timestamp.
- Older versions remain available to compare, but cannot receive new approvals or change requests.
- Read-only activity history for the selected project.
- Server-enforced Firestore rules. A browser cannot grant itself administrator access.
- A fictional sample portal for exploring both client and admin layouts without credentials.

Approving a design **does not** publish a website, accept a contract or authorise a payment.

## Run it locally

Use Node 22.12 or later (Node 24 recommended).

```bash
npm ci
npm run dev
```

Open the URL printed by Vite and select **Explore the sample portal**. No configuration is needed to try the sample. This is an application scaffold, not a replacement for Neonwater’s existing marketing website.

## Go live — in order

### 1. Create a separate Firebase project

In the Firebase console, create a new project for the client portal. Use a project ID beginning with `neonwater-`, such as `neonwater-client-portal-tyne` if available. The app deliberately refuses BatchBoss project IDs and unrelated project IDs.

Do not use BatchBoss’s Firebase project, Firestore database or service account.

1. Under **Build → Authentication → Sign-in method**, enable **Email/Password**.
2. Under **Authentication → Settings → Authorized domains**, add `localhost` for local testing and `clients.neonwaterdigital.co.za` for the portal. Add only domains you actually use.
3. Set a password policy with a minimum of 12 characters. Enable email enumeration protection in Authentication settings where offered.
4. Under **Build → Firestore Database**, create the default database in production mode. Choose its location before adding client data.
5. Register a **Web app** in project settings and copy its public Firebase configuration.
6. Copy `.env.example` to `.env.local` on your computer and fill the four values from that new project.

```dotenv
VITE_FIREBASE_API_KEY=your-public-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neonwater-your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
```

These are public Firebase web settings, not an administrator credential. Access is enforced by Firestore rules. Never put a service-account private key in a `VITE_` variable, source code or a browser upload.

### 2. Deploy the access rules

From your own computer, sign into the Firebase CLI and deploy to the **new portal project** explicitly:

```bash
npx firebase-tools@15 login
npx firebase-tools@15 deploy --only firestore --project neonwater-YOUR-PROJECT-ID
```

Do not leave Firestore in test mode. Do not replace these rules with “allow read, write: if true”.

### 3. Create your administrator account

In this portal project’s settings, generate a Firebase Admin SDK service-account key. Store it **outside this repository** on your computer. Do not upload it to Xneelo, GitHub or chat.

Point `GOOGLE_APPLICATION_CREDENTIALS` to that file. Example for PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Private\neonwater-service-account.json"
npm run account -- admin neonwater-YOUR-PROJECT-ID tyne@neonwaterdigital.co.za Tyne
```

Or Bash:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/private/neonwater-service-account.json
npm run account -- admin neonwater-YOUR-PROJECT-ID tyne@neonwaterdigital.co.za Tyne
```

The script checks that the credential belongs to that exact portal project, creates the account if needed and grants the server-side `admin` custom claim. It prints the UID and a private password setup link. Open the link to set your password. Treat the link like a password; do not commit it or paste it into project notes. Sign out and back in after a role change.

### 4. Add a client and their project

Create each client account with the same tool:

```bash
npm run account -- client neonwater-YOUR-PROJECT-ID client@example.com Client Name
```

Share that client’s password setup link with **that client only**, using your chosen secure channel. No invitation emails are sent automatically by this repository. Firebase handles password reset email when a user requests it from the sign-in page.

Sign in as the administrator, choose **New project**, and paste the client’s UID. Then use **Publish a version** to add a label, change description and HTTPS demo URL. The project is private to that UID and administrators. A client can have several assigned projects.

### 5. Protect the actual demo website too

**The portal protects project records and feedback. It does not make an external preview URL private.**

Stage the client’s demo on a host with its own access protection, or use a provider’s private preview sharing. Do not put confidential content on an unprotected public URL. If a preview host blocks iframe embedding or needs a separate sign-in, use the portal’s open-in-new-tab link. The embedded preview is sandboxed; complex apps may need the new-tab option.

Version URLs should point to immutable snapshots, such as a different deployment or version folder for every review round. Replacing the content behind an old URL would make previous approvals ambiguous.

The first release does not upload HTML/ZIPs or host client demos itself. Add protected demo hosting before promising clients that an external staging site is private.

### 6. Upload the portal to Xneelo

1. Create the `clients.neonwaterdigital.co.za` subdomain in your hosting account and enable HTTPS.
2. With `.env.local` configured for the portal project, run `npm run build` on your computer.
3. Back up any files in the subdomain’s website folder.
4. Upload **the contents of `dist/`**, including the `assets/` folder and `.htaccess`, into the subdomain’s document root. Keep `index.html` unchanged. Preserve folder names; do not flatten `assets/` into the root.
5. Do **not** upload `.env.local`, `bin/`, credentials, `node_modules/`, tests or the repository itself.
6. Test login from `clients.neonwaterdigital.co.za` with your admin account and a separate client account.
7. Add a **Client login** link on the existing Neonwater website pointing to the portal after the tests pass.

The generated app uses relative asset paths and has no special URL routing. Vite runs only on your development computer; Xneelo serves the compiled static files. `.htaccess` adds response headers on Apache hosts; verify those headers with your host before relying on them.

### 7. Verify before inviting real clients

- Signed-out visitors cannot see projects.
- Client A cannot see Client B’s project, versions or feedback.
- A client cannot create a project or publish a version.
- A request for changes needs a note.
- Approvals are associated with the current version and signed-in client.
- Publishing a new version leaves old feedback attached to the old version.
- Old versions are read-only and previous approvals do not carry over to the new version.
- A client changing their computer clock cannot change the server timestamp.
- Demo URLs have the required access protection at the preview host.
- Test password setup/reset email delivery, logout, mobile layout and new-tab previews.

## Development checks

```bash
npm test
npm run build
```

The rules integration tests use a local Firestore emulator, with no real Firebase account or client data. Java 21 and the Firebase CLI are required:

```bash
npx firebase-tools@15 emulators:exec --project demo-neonwater-portal --only firestore "npm run test:rules"
```

GitHub Actions runs these checks on pushes and pull requests. Check the workflow result before deploying. The emulator project ID starts with `demo-` and cannot address a real Firebase project.

## Repository map

```text
src/                   Portal interface, Firebase calls and input validation
bin/account.mjs        Local-only admin/client account provisioning
firestore.rules        Server-side project, version and feedback permissions
tests/                 Input and Firestore security tests
public/.htaccess       Static-host response headers
.env.example           Blank public Firebase settings
.github/workflows/     Build and test workflow
```

## Scope of this release

Single-client ownership per project. Published versions and reviews cannot be edited or deleted through client access. No payments, billing, automatic site publishing, automatic feedback email notifications, file uploads or contract signing. Admins can read feedback but do not submit decisions on behalf of clients. To revoke access, disable the client account in Firebase Authentication; set up project archival/data retention before production use at larger scale.

Repository visibility is controlled in GitHub settings. This repository was public when implementation started. Keep client content, passwords and private credentials out of its history even if you make it private later.
