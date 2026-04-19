# Code Collab Engine — User Guide

**Extension ID:** `shrey.code-collab-engine` (publisher + package name when published)  
**Display name:** CodeCollab Obsidian  

This guide covers installation, settings, daily use, and fixing common problems.

### Related repositories

| Component | GitHub |
|-----------|--------|
| **Backend** (REST API, database, `/api/extension/ask`) | [shrey1720/ajt_be](https://github.com/shrey1720/ajt_be) |
| **Frontend** (browser UI) | [shrey1720/codecolab](https://github.com/shrey1720/codecolab) |

Deploy the backend (e.g. on Render) so the extension and frontend can call the same API. Configure `codeCollab.serverUrl` to your live ask endpoint (see [Deployed project](#deployed-project-production-on-render) below).

---

## What this extension does

- Sends **selected code** plus your **question** to your **Code Collab backend** over HTTP (`POST` to a configurable URL).
- Shows an **Obsidian-style sidebar** (“Obsidian Dashboard”) with a shortcut to start the same flow.
- Attributes posts to your platform user via the **username** setting.

You need a **running API** that exposes the extension endpoint — see the **[ajt_be](https://github.com/shrey1720/ajt_be)** backend. The **[codecolab](https://github.com/shrey1720/codecolab)** repo is the web frontend. The extension does not replace the web app; it is a thin client from the editor.

### Deployed project (production on Render)

Use this when you are **not** running the backend on your own machine:

| | URL |
|---|-----|
| **API base** | `https://ajt-be-3.onrender.com` |
| **Code Collab: Server Url** (full ask endpoint) | `https://ajt-be-3.onrender.com/api/extension/ask` |

Copy the **Server Url** value into VS Code settings exactly as shown (HTTPS, includes `/api/extension/ask`). The extension default in `package.json` matches this endpoint for out-of-the-box deployed use.

For **local development**, use `http://localhost:8080/api/extension/ask` instead (with your backend running locally).

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **VS Code** | Version **1.80.0** or newer (see `engines.vscode` in `package.json`). |
| **Backend** | Must implement `POST` on your ask URL (e.g. `…/api/extension/ask`) and accept JSON. |
| **Network** | The machine running VS Code must reach your server (HTTPS for hosted APIs). |

---

## Installation

### Option A: Install from a `.vsix` (GitHub Release or file share)

1. Download **`code-collab-engine-0.0.1.vsix`** (or the latest version) from the release **Assets**.
2. In VS Code: **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Open the **⋯** menu on the Extensions view title bar.
4. Choose **Install from VSIX…** and select the downloaded file.
5. **Reload** the window if VS Code prompts you.

### Option B: From a local build (developers)

From the `vscode-extension` folder:

```bash
npm install
npm run compile
npx @vscode/vsce package
```

Then install the generated `.vsix` as in Option A.

---

## Configuration

Open **Settings** (`Ctrl+,` / `Cmd+,`) and search for **Code Collab**, or edit **User** / **Workspace** `settings.json`.

| Setting (UI label) | JSON key | Purpose |
|--------------------|----------|---------|
| **Code Collab: Server Url** | `codeCollab.serverUrl` | Full URL to the **ask** endpoint. **Deployed:** `https://ajt-be-3.onrender.com/api/extension/ask`. **Local dev:** `http://localhost:8080/api/extension/ask`. |
| **Code Collab: Username** | `codeCollab.username` | Username on the platform; used for attribution when the backend resolves the user. |

### Example `settings.json`

**Deployed (this project on Render):**

```json
{
  "codeCollab.serverUrl": "https://ajt-be-3.onrender.com/api/extension/ask",
  "codeCollab.username": "your_username"
}
```

**Local backend:**

```json
{
  "codeCollab.serverUrl": "http://localhost:8080/api/extension/ask",
  "codeCollab.username": "your_username"
}
```

**Important:** If you previously saved `codeCollab.serverUrl` pointing at **localhost**, that value overrides the extension default until you change it. For the **deployed** API, set it to `https://ajt-be-3.onrender.com/api/extension/ask`.

---

## How to use

### 1. Sidebar — “Obsidian Dashboard”

1. Click the **Code Collab** icon in the **Activity Bar** (left strip).
2. The sidebar opens with **Ask About Selection**.
3. In an editor, **select code**, then click **Ask About Selection**.
4. Enter your question in the input box and confirm.

### 2. Editor context menu

1. **Select** one or more lines of code in the active editor.
2. **Right-click** the selection.
3. Choose **Code Collab: Ask Question** (only appears when there is a selection).
4. Enter your question when prompted.

### 3. Command Palette

1. `Ctrl+Shift+P` / `Cmd+Shift+P`.
2. Run **Code Collab: Ask Question**.
3. You must still have **code selected** in the active editor; otherwise you will see a warning.

### What is sent to the server

The extension sends JSON roughly like:

- `username` — from settings  
- `title` — your question text  
- `description` — includes editor language id  
- `code` — selected source  
- `tags` — document language id (e.g. `typescript`)

Exact behavior depends on your backend implementation.

---

## Logs and success or failure

- Open **View → Output**.
- In the output dropdown, select **Code Collab Engine**.
- You will see timestamps, the URL used, server replies, or error details.

Successful posts show a notification: **Code Collab: Question posted successfully!**

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **“fetch failed” / network error** | Backend URL in `codeCollab.serverUrl` (no typo, **https** for production). Backend running and reachable from your PC (try the same URL with a REST client if possible). |
| **Still hitting localhost** | Search settings and `settings.json` for `codeCollab.serverUrl` and set it to `https://ajt-be-3.onrender.com/api/extension/ask` for the deployed backend. |
| **Timeout / first request very slow** | Common on **Render free tier** after idle: the service may need **1–2 minutes** to wake. The extension allows up to **120 seconds** for one request. Retry once the service is warm. |
| **HTTP 4xx / 5xx** | Read the body in **Output → Code Collab Engine**. Check backend logs (database, env vars, etc.). |
| **“Please select some code”** | Extend the selection so it is non-empty, then run the command or sidebar action again. |
| **“No active text editor”** | Focus a normal text editor tab (not only the sidebar). |

---

## Updates and GitHub Releases

When a new **GitHub Release** is published:

1. Note the **version** in the release title or filename (e.g. `code-collab-engine-0.0.2.vsix`).
2. Download the new `.vsix` from **Assets**.
3. **Install from VSIX** again (VS Code will upgrade the installed extension).

You can paste a short summary from this guide into the release description and link to this file. A common pattern is to attach the `.vsix` under **Releases** on [shrey1720/codecolab](https://github.com/shrey1720/codecolab) or [shrey1720/ajt_be](https://github.com/shrey1720/ajt_be), whichever you use as the main distribution repo.

---

## Privacy and security

- Selected code and your question are sent to the **server URL you configure**. Use only URLs you trust.
- Do not commit secrets inside code you select to send, unless your team policy allows it.

---

## Getting help

- **Extension / frontend:** [codecolab — Issues](https://github.com/shrey1720/codecolab/issues) (also linked from `package.json` → `bugs`).
- **Backend API:** [ajt_be — Issues](https://github.com/shrey1720/ajt_be/issues) for server, database, or deployment problems.
- When reporting a bug, include: VS Code version, extension version, **redacted** `codeCollab.serverUrl` (host only is enough), and relevant lines from **Output → Code Collab Engine**.
