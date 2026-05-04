# Aria — Your Brilliant Personal Assistant

Aria is a cross-platform virtual assistant built with Expo (React Native) that runs on Android and in any laptop browser. She knows your tracked hours, todos, and notes before you say a word.

---

## What Aria does

- **Dashboard** with Work and Personal tabs — each with their own GitHub repo
- **Today's Hours** (Work tab) — live Clockify data, running timer, progress bar
- **Todo lists** — read and write GitHub-hosted `todos/todos.md` via natural language or buttons
- **Daily notes** — read and write GitHub-hosted `notes/YYYY-MM-DD.md` with a full-screen editor
- **AI chat** — powered by Gemini 2.0 Flash, Aria can manage your todos and notes hands-free
- **Voice output** — tap the speaker icon to have Aria read her last response aloud
- **Image input** — attach a photo from your library for multimodal queries
- **Responsive** — two-column layout on wide screens, single-column + FAB on mobile
- **PWA** — installable on Android via "Add to Home Screen"

---

## Quick Start

### 1. Install Node.js and Expo CLI

Download Node.js from https://nodejs.org (LTS version recommended).

```bash
npm install -g expo-cli
```

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/aria-app.git
cd aria-app
npm install
```

### 3. Start the development server

```bash
# Web (opens in your browser)
npm run web

# Android (opens in Expo Go or your emulator)
npm run android
```

### 4. Configure Aria in Settings

On first launch, Aria will prompt you to open Settings. Add your API keys there — they are stored only on your device.

---

## API Keys

### Gemini API Key (required)

1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click **Get API key** → **Create API key in new project**
4. Copy the key (starts with `AIza`)
5. Paste it in Aria's Settings → Work → Gemini API Key

The free tier gives you 15 requests/minute and 1 million tokens/day — more than enough.

### Clockify API Key (optional, Work tab)

1. Go to https://clockify.me/user/settings
2. Scroll to **API** at the bottom
3. Click **Generate** next to "API key"
4. Copy the key
5. Paste it in Aria's Settings → Work → Clockify API Key

### GitHub Personal Access Token (PAT)

You need one PAT per repo (Work and Personal), or one PAT with access to both.

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Give it a name (e.g. "Aria Work")
4. Set expiry (recommended: 1 year)
5. Check these scopes:
   - `repo` (full control of private repositories)
6. Click **Generate token**
7. Copy immediately — GitHub won't show it again
8. Paste it in Aria's Settings → Work or Personal → GitHub PAT

### GitHub Repo Setup

Create two private GitHub repositories (or use existing ones):

- **Work repo** — e.g. `my-work-notes`
- **Personal repo** — e.g. `my-personal-notes`

Aria will automatically create:
```
/todos/todos.md      ← your todo list
/notes/YYYY-MM-DD.md ← one file per day
```

on first use. No manual setup needed.

---

## Adding Aria to your Android Home Screen

1. Open the deployed Aria web app in Chrome on your Android phone
2. Tap the three-dot menu (⋮) in the top-right corner
3. Tap **"Add to Home screen"**
4. Tap **"Add"** in the dialog
5. Aria will appear as an app icon on your home screen

On Samsung Internet: tap the hamburger menu → **"Add page to"** → **"Home screen"**

---

## Adding New Integrations

Aria's integrations are self-contained modules. To add a new one:

1. Create `app/integrations/your-service.js` with this shape:

```js
export const yourServiceIntegration = {
  name: 'your_service',
  description: 'What it does',
  functionDeclarations: [
    {
      name: 'your_service_do_thing',
      description: 'Does the thing',
      parameters: {
        type: 'OBJECT',
        properties: {
          param: { type: 'STRING', description: 'The param' },
        },
        required: ['param'],
      },
    },
  ],
};

export function createYourServiceHandlers(config) {
  return {
    your_service_do_thing: async ({ param }) => {
      // your logic
      return { result: 'done' };
    },
  };
}
```

2. Register it in `app/integrations/index.js`:

```js
import { yourServiceIntegration, createYourServiceHandlers } from './your-service';

// Add to INTEGRATIONS array
export const INTEGRATIONS = [clockifyIntegration, todosIntegration, notesIntegration, yourServiceIntegration];

// Add handlers in buildHandlers()
if (settings.your_service_key) {
  Object.assign(handlers, createYourServiceHandlers({ key: settings.your_service_key }));
}

// Add declarations in getEnabledDeclarations()
if (settings.your_service_key) {
  declarations.push(...yourServiceIntegration.functionDeclarations);
}
```

3. Add a settings field in `app/screens/Settings.jsx` if the integration needs a key.

That's it — Aria will automatically use the new function when it's relevant.

---

## File Structure

```
/
├── app.json              # Expo + PWA manifest
├── package.json
├── babel.config.js
├── vercel.json           # Vercel deployment config
├── .env.example          # Reference — keys go in Settings, not here
├── README.md
├── DEPLOYMENT.md
└── app/
    ├── index.jsx         # Root: layout, routing, theme, header
    ├── theme.js          # Design system: colours, spacing, typography
    ├── lib/
    │   ├── storage.js    # AsyncStorage + localStorage unified API
    │   ├── github.js     # GitHub Contents API client
    │   ├── gemini.js     # Gemini chat + function calling
    │   └── markdown.js   # Styles + date helpers
    ├── integrations/
    │   ├── index.js      # Registry + handler builder
    │   ├── clockify.js   # Clockify time tracking
    │   ├── todos.js      # GitHub todo list
    │   └── notes.js      # GitHub daily notes
    ├── components/
    │   ├── TabBar.jsx         # Work / Personal toggle
    │   ├── HoursCard.jsx      # Clockify hours card
    │   ├── TodoCard.jsx       # Todo list card
    │   ├── NoteSnippetCard.jsx # Note preview card
    │   └── ChatPanel.jsx      # Full Aria chat UI
    └── screens/
        ├── WorkDashboard.jsx
        ├── PersonalDashboard.jsx
        ├── NoteEditor.jsx     # Full-screen markdown editor
        └── Settings.jsx       # All configuration
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo (React Native) |
| AI Brain | Google Gemini 2.0 Flash via `@google/generative-ai` |
| Storage | AsyncStorage (native) + localStorage (web) |
| Time tracking | Clockify REST API |
| Notes & todos | GitHub Contents API |
| Voice output | expo-speech |
| Image input | expo-image-picker |
| Deployment | Vercel (static web export) |

No backend. No paid services. All keys stay on your device.

---

## Privacy

- All API keys are stored locally (browser localStorage or device AsyncStorage)
- Keys are never transmitted to any server other than the service they authenticate (Gemini, Clockify, GitHub)
- No analytics, no telemetry, no accounts
- The deployed Vercel app serves only static files

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Vercel setup guide.
