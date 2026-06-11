// orchestrator.js
import { file } from 'zod';
import { registry } from './tools/registry.js';
import ollama from 'ollama';
import { de } from 'zod/locales';
import { writeFile } from 'node:fs/promises';

export async function runAgent(userPrompt) {
  // 1. Convert our plug-and-play tools into a clear text instruction manual for Gemma
  const toolSpecs = registry.getToolDefinitions().map(tool => {
    return `- Name: ${tool.name}\n  Description: ${tool.description}\n  Arguments Format: {"a": number, "b": number}`;
  }).join('\n\n');

  // const systemInstructions =
  //   `You are an agentic math planner. You must solve the user's request step-by-step using tools.\n\n` +
  //   `AVAILABLE TOOLS:\n${toolSpecs}\n\n` +
  //   `CRITICAL FORMAT RULE:\n` +
  //   `You must think about your next step, then write a tool call exactly like this format:\n` +
  //   `THOUGHT: [Your reasoning here]\n` +
  //   `CALL: tool_name({"a": value, "b": value})\n\n` +
  //   `If you have the final answer and no more tools are needed, respond exactly in this format:\n` +
  //   `FINAL_ANSWER: [Your final calculated result here]`;

  const systemInstructions =
    `You are an agentic math planner. You must solve the user's request step-by-step using tools.\n\n` +
    `AVAILABLE TOOLS:\n${toolSpecs}\n\n` +
    `CRITICAL RULES:\n` +
    `1. Before drawing a new line, you MUST use 'check_line' to verify if it already exists.\n` +
    `2. After drawing a line, you MUST use 'check_line' to confirm it was registered correctly.\n\n` +
    `CRITICAL FORMAT RULE:\n` +
    `You must think about your next step, then write a tool call exactly like this format:\n` +
    `THOUGHT: [Your reasoning here]\n` +
    `CALL: tool_name({"a": value, "b": value})\n\n` +
    `If you have the final answer and no more tools are needed, respond exactly in this format:\n` +
    `FINAL_ANSWER: [Your final calculated result here]. FINAL_ANSWER MUST be the last line of your response.`;

  const messages = [
    { role: "system", content: systemInstructions },
    { role: "user", content: userPrompt }
  ];

  console.log(`\n🚀 Starting Text-Based Agentic Flow for: "${userPrompt}"`);

  let keepGoing = true;
  let loopCount = 0;
  const MAX_ITERATIONS = 100;

  while (keepGoing && loopCount < MAX_ITERATIONS) {
  // write meesages to a file for debugging
    loopCount++;
    console.log(`\n--- [Iteration ${loopCount}] ---`);

    // Call Ollama WITHOUT the native tools array parameter
    const response = await ollama.chat({
      // model: 'deepseek-r1:7b',
      model: 'gemma3:4b',
      messages: messages
    });

    const reply = response.message.content;
    console.log(`🤖 Gemma3 Output:\n${reply}`);

    // Add the model's reply to our memory log
    messages.push({ role: "assistant", content: reply });

    // 2. Parse if the model wants to call a tool using a Regex
    const callMatch = reply.match(/CALL:\s*(\w+)\((.+)\)/);
    const finalMatch = reply.match(/FINAL_ANSWER:\s*(.+)/);

    if (callMatch) {
      const toolName = callMatch[1];
      const toolArgsString = callMatch[2];

      try {
        // const toolArgs = JSON.parse(toolArgsString);
        const toolArgs = await safelyParseToolArgs(toolArgsString, toolName);
        console.log(`Running [${toolName}] with args:`, toolArgs);

        // Execute via our plug-and-play registry
        const toolResult = await registry.executeTool(toolName, toolArgs);
        console.log(`Tool Result:`, toolResult,toolArgs);

        // Feed the result back as a system observation text block
        messages.push({
          role: "user",
          content: `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}`
        });

      } catch (err) {
        console.error("❌ Failed to execute or parse text tool call:", err.message);
        messages.push({
          role: "user",
          content: `RESPONSE error: Could not parse arguments. Please try again with strict JSON format.`
        });
      }

    } else if (finalMatch) {
      console.log(`\n🏁 Agent finished in ${loopCount} steps.`);
      console.log(`📝 Verified Final Response: ${finalMatch[1]}`);
      keepGoing = false;
    } 
    // else {
    //   console.log("⚠️ Model did not follow formatting rules. Forcing exit.");
    //   keepGoing = false;
    // }
    await overwriteFile(JSON.stringify(messages));
  }
}

async function safelyParseToolArgs(toolArgsString, toolName) {
  let currentString = toolArgsString;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Tool parse attempt ${attempt} for tool [${toolName}]`);
      // Try parsing the current string
      const validJsonString = currentString
        .replace(/:\s*NaN/g, ': 0')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // 1. Wrap unquoted keys in double quotes
        .replace(/:\s*'([^']*)'/g, ': "$1"');// 2. Replace single quotes on values with double quotes
      const toolArgs = JSON.parse(currentString);
      console.log(`Tool parsed [${toolName}] with args:`, toolArgs);
      return toolArgs; // Success! Return the parsed object

    } catch (parseError) {
      console.warn(`[Attempt ${attempt}/${maxAttempts}] JSON parse failed for ${toolName}: ${parseError.message}`);

      // If we hit the limit, throw the final error
      if (attempt === maxAttempts) {
        throw new Error(`Failed to parse toolArgs after ${maxAttempts} attempts. Original string: ${toolArgsString}`);
      }

      // Ask Ollama to fix the malformed string
      currentString = await askOllamaToFixJson(currentString, parseError.message);
    }
  }
}

async function askOllamaToFixJson(badJsonString, errorMessage) {
  const systemPrompt = `You are a strict JSON repair utility. 
  Fix the syntax errors in the provided JSON string so it becomes valid, parseable JSON. 
  Return ONLY the raw, corrected JSON string. 
  Do NOT include markdown code blocks, backticks (\`\`\`), or explanations.`;

  const userPrompt = `Error: ${errorMessage}\nMalformed JSON:\n${badJsonString}`;

  try {
    const response = await ollama.generate({
      model: 'gemma3:4b', // or 'mistral', 'qwen', etc.
      system: systemPrompt,
      prompt: userPrompt,
      options: {
        temperature: 0.1 // Keep it deterministic
      }
    });

    // Clean up any rogue formatting just in case
    return response.response.trim().replace(/^```json|```$/g, '');
  } catch (ollamaError) {
    console.error('Ollama API error:', ollamaError.message);
    // Return original string to let the next loop iteration handle the failure gracefully
    return badJsonString;
  }
}

async function overwriteFile(content) {
  try {
    // 'w' flag opens the file for writing, clearing existing content first
    await writeFile("./messages_log.json", content, { flag: 'w', encoding: 'utf8' });
    console.log('File successfully updated.');
  } catch (error) {
    console.error('Error writing to file:', error.message);
  }
}
