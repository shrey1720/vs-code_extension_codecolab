const WebSocket = require('ws');

// Create a WebSocket server listening on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("==================================================");
console.log("🚀 Test WebSocket Server is running on ws://localhost:8080");
console.log("Waiting for the VS Code Extension to connect...");
console.log("==================================================\n");

wss.on('connection', function connection(ws) {
  console.log("🟢 [CONNECTED] The VS Code Extension just connected!");

  ws.on('message', function incoming(message) {
    console.log("\n📥 [RECEIVED DATA] Raw message from VS Code:");
    
    try {
        const data = JSON.parse(message);
        console.log(`- User: ${data.payload.user}`);
        console.log(`- Language: ${data.payload.language}`);
        console.log(`- Question: ${data.payload.question}`);
        console.log(`- Code Snippet:\n\`\`\`\n${data.payload.codeSnippet}\n\`\`\``);

        // Send a mock answer back after 1.5 seconds to simulate processing
        setTimeout(() => {
            console.log("📤 [SENDING ANSWER] Replying to the extension...");
            ws.send("Hello from the Test Server! We received your code perfectly. As a mock answer, please double check your logic on line 3.");
        }, 1500);

    } catch (e) {
        console.log("Message was not valid JSON", message.toString());
    }
  });

  ws.on('close', () => {
    console.log("\n🔴 [DISCONNECTED] The extension disconnected.");
    console.log("Waiting for next connection...\n");
  });
});
