import * as vscode from 'vscode';
import WebSocket from 'ws';

// Global websocket client reference
let wsClient: WebSocket | null = null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Collab Engine is now active!');

    outputChannel = vscode.window.createOutputChannel('Code Collab Engine');
    context.subscriptions.push(outputChannel);

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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Send current username to webview
        const config = vscode.workspace.getConfiguration('codeCollab');
        const username = config.get<string>('username', 'admin');
        webviewView.webview.postMessage({ type: 'updateUser', username: username });

        // Listen for configuration changes
        const changeConfigDisposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codeCollab.username')) {
                const newUsername = vscode.workspace.getConfiguration('codeCollab').get<string>('username', 'admin');
                webviewView.webview.postMessage({ type: 'updateUser', username: newUsername });
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

    private _getHtmlForWebview(webview: vscode.Webview) {
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
                    <div class="status-value" id="username">Loading...</div>
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

async function postQuestion(url: string, payload: any) {
    outputChannel.show(true);
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Sending question to ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data: any = await response.json();
            outputChannel.appendLine(`[Server Reply]: ${JSON.stringify(data)}`);
            vscode.window.showInformationMessage('Code Collab: Question posted successfully!');
        } else {
            const errData: any = await response.json();
            outputChannel.appendLine(`[Error]: ${JSON.stringify(errData)}`);
            vscode.window.showErrorMessage(`Server error: ${errData.error || 'Unknown error'}`);
        }
    } catch (err: any) {
        outputChannel.appendLine(`[Network Error]: ${err.message}. Ensure your Java Backend is running!`);
        throw err;
    }
}

export function deactivate() {}
