// index.js
import readline from 'readline';
import { runAgent } from './orchestrator.js';
import { unlink, access } from 'node:fs/promises';

// The exact dynamic scenario you wanted to test
// const prompt = "What is 2+2, then add 100, then add 50?";
// const prompt = "Draw a square in the middle of canvas?";

// Fire up the local agentic flow
// runAgent(prompt).catch(err => {
//   console.error("💥 Critical Agent Error:", err);
// });

async function removeFile() {
  try {
    // 1. Check if the file exists
    await access('/Users/abuabdullah/Desktop/agentic-flow-mcp/canvas.png');

    // 2. If no error was thrown, delete it
    await unlink('/Users/abuabdullah/Desktop/agentic-flow-mcp/canvas.png');
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

    const userPrompt = await askUser("\nYour Question: ");
    if (!userPrompt.trim()) continue;

    // mcp client to AI Call
    await runAgent(userPrompt)

    const again = await askUser("\nContinue? (yes/no): ");
    if (again.toLowerCase() !== 'yes') running = false;
  }

  rl.close();
  console.log("👋 Goodbye!");
}

main().catch(err => {
  console.error("💥 Critical Error in Main:", err);
});