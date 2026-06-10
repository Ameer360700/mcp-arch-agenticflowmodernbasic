// index.js
import { runAgent } from './orchestrator.js';

// The exact dynamic scenario you wanted to test
// const prompt = "What is 2+2, then add 100, then add 50?";
const prompt = "Draw a sqaure in the middle of canvas?";

// Fire up the local agentic flow
runAgent(prompt).catch(err => {
  console.error("💥 Critical Agent Error:", err);
});