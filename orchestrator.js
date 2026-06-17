// orchestrator.js
import { registry } from './tools/registry.js';
import { writeFile } from 'node:fs/promises';
import { callAI } from './ai/ai.service.js';

export async function runAgent(userPrompt, provider = 'ollama') {

  const systemInstructions =
    `You are a drawing agent. You draw shapes using the draw_line tool.\n\n` +

    `AVAILABLE TOOLS:\n` +
    `- draw_line: draws a line. Args: {"startX": number, "startY": number, "endX": number, "endY": number, "lineColor": "black"}\n` +
    `- check_line: verifies a line exists. Args: {"startX": number, "startY": number, "endX": number, "endY": number}\n\n` +

    `CANVAS: 800x480 pixels. Top-left is (0,0). Center is (400,240).\n\n` +

    `RULES:\n` +
    `1. Draw one line at a time.\n` +
    `2. After each draw_line, call check_line to verify it.\n` +
    `3. Output ONE CALL per turn. Never output multiple CALLs.\n` +
    `4. Only output FINAL_ANSWER when ALL lines are drawn and verified.\n\n` +

    `FORMAT:\n` +
    `THOUGHT: [your reasoning]\n` +
    `CALL: tool_name({"key": value})\n\n` +

    `When done:\n` +
    `FINAL_ANSWER: [what was drawn]\n\n` +

    `EXAMPLE:\n` +
    `THOUGHT: I will draw the first line of the triangle.\n` +
    `CALL: draw_line({"startX": 400, "startY": 100, "endX": 200, "endY": 400, "lineColor": "black"})`;

  const messages = [
    { role: "system", content: systemInstructions },
    { role: "user", content: userPrompt }
  ];

  console.log(`\n🚀 Starting Agent for: "${userPrompt}"`);

  let keepGoing = true;
  let loopCount = 0;
  const MAX_ITERATIONS = 100;

  while (keepGoing && loopCount < MAX_ITERATIONS) {
    loopCount++;
    console.log(`\n--- [Iteration ${loopCount}] ---`);

    const response = await callAI({ provider, messages });
    const reply = response.message.content;
    console.log(`[model] Output:\n${reply}`);

    messages.push({ role: "assistant", content: reply });

    const callMatch = reply.match(/CALL:\s*(\w+)\((\{[^}]+\})\)/);
    const finalMatch = reply.match(/FINAL_ANSWER:\s*(.+)/);

    if (callMatch) {
      const toolName = callMatch[1];
      const toolArgsString = callMatch[2];

      try {
        const toolArgs = await safelyParseToolArgs(toolArgsString, toolName, provider);
        console.log(`Running [${toolName}] with args:`, toolArgs);

        const toolResult = await registry.executeTool(toolName, toolArgs);
        console.log(`Tool Result:`, toolResult);

        messages.push({
        role: "user",
        content: toolName.startsWith('draw_')
         ? `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}. Now verify this EXACT line using check_${toolName.replace('draw_', '')} with the SAME coordinates: ${toolArgsString}`
         : `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}. Now continue to the NEXT step in your plan.`
        });

      } catch (err) {
        console.error("❌ Failed to parse tool call:", err.message);
        messages.push({
          role: "user",
          content: `RESPONSE error: Use strict JSON format. Example: CALL: draw_line({"startX": 100, "startY": 100, "endX": 200, "endY": 200, "lineColor": "black"})`
        });
      }

    } else if (finalMatch) {
      console.log(`\n🏁 Agent finished in ${loopCount} steps.`);
      console.log(`📝 Final Answer: ${finalMatch[1]}`);
      keepGoing = false;

    } else {
      // Model didn't follow format — nudge it
      messages.push({
        role: "user",
        content: `Please continue. Use CALL: or FINAL_ANSWER: format only.`
      });
    }

    await overwriteFile(JSON.stringify(messages));
  }
}

async function safelyParseToolArgs(toolArgsString, toolName, provider) {
  let currentString = toolArgsString;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const cleaned = currentString
        .replace(/:\s*NaN/g, ': 0')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"');
      const toolArgs = JSON.parse(cleaned);
      console.log(`Tool parsed [${toolName}] with args:`, toolArgs);
      return toolArgs;

    } catch (parseError) {
      console.warn(`[Attempt ${attempt}/${maxAttempts}] Parse failed: ${parseError.message}`);
      if (attempt === maxAttempts) {
        throw new Error(`Failed to parse after ${maxAttempts} attempts.`);
      }
      currentString = await askAIToFixJson(provider, currentString, parseError.message);
    }
  }
}

async function askAIToFixJson(provider, badJsonString, errorMessage) {
  const messages = [
    { role: "system", content: "You are a JSON repair utility. Return ONLY the corrected JSON. No markdown, no explanation." },
    { role: "user", content: `Fix this JSON:\nError: ${errorMessage}\nJSON: ${badJsonString}` }
  ];

  try {
    const response = await callAI({ provider, messages });
    return response.message.content.trim().replace(/^```json|```$/g, '');
  } catch (err) {
    return badJsonString;
  }
}

async function overwriteFile(content) {
  try {
    await writeFile("./messages_log.json", content, { flag: 'w', encoding: 'utf8' });
    console.log('File successfully updated.');
  } catch (error) {
    console.error('Error writing to file:', error.message);
  }
}