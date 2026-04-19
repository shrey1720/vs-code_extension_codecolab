import * as vscode from 'vscode';
import WebSocket from 'ws';

// Global websocket client reference
let wsClient: WebSocket | null = null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Collab Engine is now active!');

    outputChannel = vscode.window.createOutputChannel('Code Collab Engine');
    context.subscriptions.push(outputChannel);
    
    // Initialize Notification Bridge
    initNotificationBridge();

    // Register Sidebar Provider
    const provider = new CodeCollabViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CodeCollabViewProvider.viewType, provider)
    );

    // Register our main command
    let disposable = vscode.commands.registerCommand('codeCollab.askQuestion', async () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }

        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);

        if (!selectedCode) {
            vscode.window.showWarningMessage('Please select some code to ask a question about.');
            return;
        }

        const question = await vscode.window.showInputBox({
            prompt: 'Ask your code collaboration engine about this code:',
            placeHolder: 'E.g., Why is this loop running infinitely?'
        });

        if (!question) {
            return;
        }

        const config = vscode.workspace.getConfiguration('codeCollab');
        const serverUrl = config.get<string>('serverUrl', 'https://ajt-be-3.onrender.com/api/extension/ask');
        const username = config.get<string>('username', 'admin');

        try {
            await postQuestion(serverUrl, {
                username: username,
                title: question,
                description: `Question from VS Code (${editor.document.languageId})`,
                code: selectedCode,
                tags: editor.document.languageId
            });
        } catch (error: any) {
            outputChannel.show(true);
            outputChannel.appendLine(`[Network Error]: ${error.message}`);
            vscode.window.showErrorMessage(`Code Collab: Failed to connect to backend — ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

class CodeCollabViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeCollab.sidebar';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Read username from settings and embed directly into the HTML (avoids race condition)
        const config = vscode.workspace.getConfiguration('codeCollab');
        const username = config.get<string>('username', 'admin');
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, username);

        // Listen for configuration changes
        const changeConfigDisposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codeCollab.username') || e.affectsConfiguration('codeCollab.serverUrl')) {
                const newUsername = vscode.workspace.getConfiguration('codeCollab').get<string>('username', 'admin');
                // Re-render the entire webview so username updates immediately
                webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, newUsername);
            }
        });
        webviewView.onDidDispose(() => changeConfigDisposable.dispose());

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'postSelection':
                    vscode.commands.executeCommand('codeCollab.askQuestion');
                    break;
                case 'showError':
                    vscode.window.showErrorMessage(data.message);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview, username: string) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Obsidian Dashboard</title>
                <style>
                    :root {
                        --bg-deep: #080808;
                        --bg-card: #121212;
                        --accent: #E0E0E0;
                        --text: #D4D4D4;
                        --border: #222222;
                    }
                    body {
                        background-color: var(--bg-deep);
                        color: var(--text);
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 15px;
                        margin: 0;
                    }
                    .header {
                        font-size: 1.2rem;
                        font-weight: 600;
                        margin-bottom: 20px;
                        color: var(--accent);
                        border-bottom: 1px solid var(--border);
                        padding-bottom: 10px;
                    }
                    .btn {
                        background: var(--accent);
                        color: black;
                        border: none;
                        padding: 10px 15px;
                        width: 100%;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 600;
                        margin-bottom: 20px;
                        transition: all 0.2s;
                    }
                    .btn:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }
                    .status-card {
                        background: var(--bg-card);
                        border: 1px solid var(--border);
                        padding: 12px;
                        border-radius: 6px;
                    }
                    .status-title {
                        font-size: 0.8rem;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    .status-value {
                        font-size: 0.95rem;
                        font-weight: 500;
                    }
                    .hint {
                        margin-top: 15px;
                        font-size: 0.75rem;
                        color: #555;
                        line-height: 1.4;
                    }
                </style>
            </head>
            <body>
                <div class="header">Obsidian Dash</div>
                
                <button class="btn" onclick="postSelection()">Ask About Selection</button>
                
                <div class="status-card">
                    <div class="status-title">CONNECTED USER</div>
                    <div class="status-value" id="username">${username}</div>
                </div>

                <div class="hint">
                    Highlight any code in the editor and click the button above to post it to the collaboration engine.
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function postSelection() {
                        vscode.postMessage({ type: 'postSelection' });
                    }

                    // Update username from settings (this is a simplified mock, in real we would pass it via postMessage)
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if(message.type === 'updateUser') {
                            document.getElementById('username').innerText = message.username;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

/** Long timeout: Render free tier cold starts can take 60s+ before the service accepts traffic. */
const ASK_REQUEST_TIMEOUT_MS = 120_000;

async function postQuestion(url: string, payload: any) {
    outputChannel.show(true);
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Sending question to ${url}...`);

    const localhostHint =
        url.includes('localhost') || url.includes('127.0.0.1')
            ? ' You are targeting localhost — set "Code Collab: Server Url" (codeCollab.serverUrl) to your HTTPS Render URL if the API is deployed.'
            : '';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(ASK_REQUEST_TIMEOUT_MS)
        });

        if (response.ok) {
            const data: any = await response.json();
            outputChannel.appendLine(`[Server Reply]: ${JSON.stringify(data)}`);
            vscode.window.showInformationMessage('Code Collab: Question posted successfully!');
        } else {
            let errBody: string;
            try {
                const errData: any = await response.json();
                errBody = JSON.stringify(errData);
                vscode.window.showErrorMessage(`Server error: ${errData.error || response.statusText || 'Unknown error'}`);
            } catch {
                errBody = await response.text();
                vscode.window.showErrorMessage(`Server error: HTTP ${response.status} ${response.statusText}`);
            }
            outputChannel.appendLine(`[Error]: ${errBody}`);
        }
    } catch (err: any) {
        const name = err?.name || '';
        const extra =
            name === 'TimeoutError'
                ? ' Request timed out — if the API is on Render free tier, retry after the service wakes (first request can take 1–2 minutes).'
                : '';
        outputChannel.appendLine(
            `[Network Error]: ${err.message}.${localhostHint}${extra} Ensure the URL is correct and the backend is reachable.`
        );
        throw err;
    }
}

export function deactivate() {
    if (wsClient) {
        wsClient.close();
    }
}

function initNotificationBridge() {
    const config = vscode.workspace.getConfiguration('codeCollab');
    const baseUrl = config.get<string>('serverUrl', 'https://ajt-be-3.onrender.com/api/extension/ask');
    const username = config.get<string>('username', 'admin');
    
    // Transform HTTP/HTTPS to WS/WSS
    let wsUrl = baseUrl.replace('/extension/ask', '/ws/notifications')
                       .replace('/api/extension/ask', '/api/ws/notifications');
    
    if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace('http://', 'ws://');
    }

    outputChannel.appendLine(`[Bridge]: Connecting to ${wsUrl}...`);
    
    try {
        wsClient = new WebSocket(wsUrl);

        wsClient.on('open', () => {
            outputChannel.appendLine(`[Bridge]: Real-time connection established for user: ${username}`);
        });

        wsClient.on('message', (data) => {
            try {
                const event = JSON.parse(data.toString());
                
                // Check if this notification is relevant to the current user
                // For simplicity in this v1, we show a toast for all relevant collaboration activities
                if (event.type === 'answer_posted' || event.type === 'comment_posted') {
                    const message = event.message || 'New activity on CodeCollab';
                    const qId = event.details?.questionId;
                    
                    vscode.window.showInformationMessage(`🔔 CodeCollab: ${message}`, 'View Solution').then(selection => {
                        if (selection === 'View Solution' && qId) {
                            const webUrl = baseUrl.replace('/api/extension/ask', '').replace('/extension/ask', '') + `/question.html?id=${qId}`;
                            vscode.env.openExternal(vscode.Uri.parse(webUrl));
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to parse socket message', err);
            }
        });

        wsClient.on('error', (err) => {
            outputChannel.appendLine(`[Bridge Error]: ${err.message}`);
        });

        wsClient.on('close', () => {
            outputChannel.appendLine(`[Bridge]: Connection closed. Retrying in 30s...`);
            setTimeout(initNotificationBridge, 30000);
        });

    } catch (err: any) {
        outputChannel.appendLine(`[Bridge Setup Error]: ${err.message}`);
    }
}
