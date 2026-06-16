// index.js
import readline from 'readline';
import { runAgent } from './orchestrator.js';
import { unlink, access } from 'node:fs/promises';
import dotenv from 'dotenv';



async function removeFile() {
  try {
    // 1. Check if the file exists
    await access('/Users/ameershadab/Desktop/agentic-flow-mcp/canvas.png');

    // 2. If no error was thrown, delete it
    await unlink('/Users/ameershadab/Desktop/agentic-flow-mcp/canvas.png');
    console.log('File successfully deleted.');
  } catch (error) {
  }
}

const main = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askUser = (q) => new Promise(resolve => rl.question(q, resolve));

  let running = true;
  while (running) {

    await removeFile();

    const aiProvider = await askUser("\nAI Provider (ollama): ");
    if (!aiProvider.trim()) continue;


    const userPrompt = await askUser("\nYour Question: ");
    if (!userPrompt.trim()) continue;

    // mcp client to AI Call
    await runAgent(userPrompt,aiProvider)

    const again = await askUser("\nContinue? (yes/no): ");
    if (again.toLowerCase() !== 'yes') running = false;
  }

  rl.close();
  console.log("👋 Goodbye!");
}

main().catch(err => {
  console.error("💥 Critical Error in Main:", err);
});