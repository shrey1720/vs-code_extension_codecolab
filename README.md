# 🌑 CodeColab Obsidian

**Premium Code Collaboration & Discussion Engine for VS Code.**

CodeCollab Obsidian is a high-fidelity collaboration client that connects your editor directly to a centralized knowledge base. Share code, ask questions, and solve complex logic issues without ever leaving your workspace.

**→ [User guide (installation, settings, troubleshooting)](USER_GUIDE.md)**

---

## ✨ Key Features

- **Obsidian Obsidian Dashboard**: A sleek, glassmorphic sidebar for monitoring your collaboration feed.
- **Smart Code Sharing**: Highlight any snippet and instantly post it to your team's platform.
- **Unified Identity**: Questions are automatically attributed to your platform profile via configurable username sync.
- **Bridge Support**: Uses the proprietary **HTTP-Socket Bridge** for high-performance communication, even through restrictive firewalls.

---

## 🚀 Setup

1.  **Backend**: Ensure your Code Collab API is running and exposes the extension ask endpoint — source and deployment: **[shrey1720/ajt_be](https://github.com/shrey1720/ajt_be)**.
2.  **Configuration**: Open Settings (`Ctrl + ,`), search **Code Collab**:
    - **Server Url** — full URL to the ask endpoint (`https://ajt-be-3.onrender.com/api/extension/ask` for the deployed API, or `http://localhost:8080/api/extension/ask` for local dev).
    - **Username** — platform username for attribution.

Details: **[USER_GUIDE.md](USER_GUIDE.md)**.

---

## 🛠 Usage

1.  **Sidebar**: Activity Bar → **Code Collab** → **Ask About Selection** (with code selected).
2.  **Context menu**: Select code → right-click → **Code Collab: Ask Question**.
3.  **Command Palette**: `Ctrl + Shift + P` → **Code Collab: Ask Question**.

---

## 🔗 Project links

| Part | Repository |
|------|----------------|
| **Backend** (Java API, Render deploy) | [github.com/shrey1720/ajt_be](https://github.com/shrey1720/ajt_be) |
| **Frontend** (web UI) | [github.com/shrey1720/codecolab](https://github.com/shrey1720/codecolab) |
| **Extension issues / releases** | Use [codecolab Issues](https://github.com/shrey1720/codecolab/issues) for product feedback, or open issues on **ajt_be** for API-only bugs. |

*   **License**: **MIT** — Free for personal and commercial use.

---

*Powered by the Obsidian Design System.*
