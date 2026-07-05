# PulseFit — AI-Powered Gym Management PWA

**Phase 1 of 6: Foundation** ✅ — Auth (signup/login) + basic dashboard, installable PWA.

## What's in this phase
- Next.js app (works as a website AND an installable app on phones/desktops)
- Firebase Auth — signup & login
- Firestore — stores member profiles
- Tailwind CSS with a custom "training log" design system
- Firestore security rules (so members can only touch their own data)

## Setup — step by step

### 1. Install Node.js
If you don't have it: download from https://nodejs.org (LTS version).

### 2. Install the project dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click "Add project" → name it (e.g. "pulsefit")
3. Once created, click the **web icon (`</>`)** to register a web app
4. Copy the config values it shows you

### 4. Enable Auth and Firestore
- In the Firebase console sidebar: **Build → Authentication → Get started → Email/Password → Enable**
- In the sidebar: **Build → Firestore Database → Create database → start in test mode** (we'll lock it down with the rules file below)

### 5. Add your Firebase keys
Copy `.env.local.example` to a new file called `.env.local`, and paste in the values from step 3.

### 6. Deploy the security rules
In the Firebase console: **Firestore Database → Rules tab** → paste in the contents of `firestore.rules` → Publish.

### 7. Run the app
```
npm run dev
```
Open http://localhost:3000 — you should see the landing page. Try signing up for an account.

### 8. Test "installing" it
Once deployed (or even locally in Chrome), open dev tools → Application tab → you'll see the manifest. In production, visitors get an "Install" prompt/icon in the address bar, and on mobile, a "Add to Home Screen" option.

## Project structure
```
src/
  app/
    page.tsx          -> landing page
    login/page.tsx     -> login
    signup/page.tsx     -> signup
    dashboard/page.tsx   -> authenticated home
  lib/
    firebase.ts         -> Firebase connection setup
firestore.rules          -> database security rules
public/manifest.json      -> makes the app installable (PWA)
```

## What's next
- **Phase 2:** class booking, trainer schedules, admin panel
- **Phase 3:** AI workout/nutrition plan generator (LLM)
- **Phase 4:** RAG chatbot coach
- **Phase 5:** churn prediction ML model
- **Phase 6:** smart scheduling, polish, deploy

Come back to Claude with this project and say "let's do Phase 2" whenever you're ready.
