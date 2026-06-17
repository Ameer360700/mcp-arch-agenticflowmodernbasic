// orchestrator.js
import { registry } from './tools/registry.js';
import { writeFile } from 'node:fs/promises';
import { callAI } from './ai/ai.service.js';
 
const MAX_HISTORY = 12;
 
function getTrimmedHistory(messages) {
  const system = messages[0]; // always keep system prompt
  const rest = messages.slice(1);
  const trimmed = rest.slice(-MAX_HISTORY);
  return [system, ...trimmed];
}
 
// ─── PHASE 1: PLAN ───────────────────────────────────────────────────────────
async function planDrawing(userPrompt, provider) {
  const planPrompt =
    `The user wants: "${userPrompt}"\n\n` +
    `Output a JSON array of drawing commands for an 800x480 canvas.\n` +
    `Origin (0,0) is TOP-LEFT. Center of canvas is approximately (400, 240).\n\n` +
    `IMPORTANT: If drawing a face, you MUST include ALL standard features: head outline, eyes, AND a mouth/smile. A face is incomplete without a mouth.\n\n` +
    `Each item must follow this exact format:\n` +
    `Each item must follow this exact format:\n` +
    `{ "tool": "draw_line", "args": { "startX": 100, "startY": 100, "endX": 200, "endY": 200, "lineColor": "black" } }\n\n` +
    `Available tools and their required args:\n` +
    `- draw_line: startX, startY, endX, endY, lineColor\n` +
    `- draw_rectangle: x, y, width, height, lineColor (x,y is top-left corner)\n` +
    `- draw_circle: centerX, centerY, radius, lineColor\n` +
    `- draw_arc: centerX, centerY, radius, startAngle, endAngle (degrees), lineColor\n\n` +
    `RULES:\n` +
    `- Output ONLY a valid JSON array. No explanation, no markdown, no backticks.\n` +
    `- ALL coordinates must stay within X: 0-800, Y: 0-480.\n` +
    `- Plan every shape needed to fully complete the drawing.\n` +
    `- Calculate coordinates precisely so shapes connect and align correctly.\n` +
    `- lineColor must be "black".`;
 
  const messages = [
    { role: "system", content: "You are a precise drawing coordinate planner. Output only a valid JSON array. No explanation, no markdown." },
    { role: "user", content: planPrompt }
  ];
 
  console.log(`\n📐 Phase 1: Planning drawing for "${userPrompt}"...`);
 
  const response = await callAI({ provider, messages });
  const raw = response.message.content.trim().replace(/^```json|^```|```$/g, '').trim();
 
  console.log(`[planner] Raw plan:\n${raw}`);
 
  try {
    const plan = JSON.parse(raw);
    console.log(`✅ Plan created with ${plan.length} drawing commands.`);
    return plan;
  } catch (err) {
    console.error('❌ Failed to parse plan JSON:', err.message);
    throw new Error('Phase 1 planning failed — model did not return valid JSON.');
  }
}
 
// ─── PHASE 2: ACT/VERIFY LOOP ────────────────────────────────────────────────
export async function runAgent(userPrompt, provider = 'ollama') {
  const toolSpecs = registry.getToolDefinitions().map(tool => {
    return `- Name: ${tool.name}\n  Description: ${tool.description}`;
  }).join('\n\n');
 
  // Phase 1 — Get the plan
  const drawingPlan = await planDrawing(userPrompt, provider);
 
  const systemInstructions =
    `You are an agentic drawing executor. You will be given a pre-planned list of drawing commands.\n\n` +
 
    `CANVAS RULES:\n` +
    `- Canvas is 800x480 pixels. Origin (0,0) is TOP-LEFT.\n` +
    `- ALL coordinates must stay within X: 0-800, Y: 0-480.\n\n` +
 
    `AVAILABLE TOOLS:\n${toolSpecs}\n\n` +
 
    `CRITICAL RULES:\n` +
    `1. After drawing any shape, you MUST use the matching check tool to confirm it was drawn, using the EXACT SAME coordinates you just used to draw it.\n` +
    `2. If a check returns exists: false, redraw it once with the same coordinates. If it still fails, move on — do not loop forever.\n` +
    `3. You MUST output exactly ONE CALL per turn. Outputting multiple CALL blocks in one response is a critical error.\n` +
    `4. Never output a CALL and FINAL_ANSWER in the same response.\n` +
    `5. Do NOT give FINAL_ANSWER until every shape in the plan has been drawn and checked.\n\n` +
 
    `FORMAT:\n` +
    `THOUGHT: [Your reasoning here]\n` +
    `CALL: tool_name({"key": value})\n\n` +
 
    `When all drawing and verification is complete, respond exactly like this:\n` +
    `FINAL_ANSWER: [Description of what was drawn]\n\n` +
 
    `CORRECT example:\n` +
    `THOUGHT: I will draw the rectangle as planned.\n` +
    `CALL: draw_rectangle({"x": 300, "y": 200, "width": 200, "height": 180, "lineColor": "black"})\n\n` +
 
    `INCORRECT example (never do this):\n` +
    `THOUGHT: Draw line 1.\n` +
    `CALL: draw_line(...)\n` +
    `THOUGHT: Draw line 2.\n` +
    `CALL: draw_line(...)`;
 
  const messages = [
    { role: "system", content: systemInstructions },
    {
      role: "user",
      content: `Execute this drawing plan step by step:\n${JSON.stringify(drawingPlan, null, 2)}\n\nDraw and verify each shape one at a time, in order.`
    }
  ];
 
  console.log(`\n🚀 Phase 2: Executing drawing plan for: "${userPrompt}"`);
 
  let keepGoing = true;
  let loopCount = 0;
  const MAX_ITERATIONS = 200;
 
  while (keepGoing && loopCount < MAX_ITERATIONS) {
    loopCount++;
    console.log(`\n--- [Iteration ${loopCount}] ---`);
 
    const response = await callAI({ provider, messages: getTrimmedHistory(messages) });
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
 
        const isDrawTool = toolName.startsWith('draw_');
        const checkToolName = `check_${toolName.replace('draw_', '')}`;
 
        messages.push({
          role: "user",
          content: isDrawTool
            ? `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}. Now verify this EXACT shape using ${checkToolName} with the SAME coordinates: ${toolArgsString}`
            : `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}. Now continue to the NEXT shape in your plan.`
        });
 
      } catch (err) {
        console.error("❌ Failed to execute or parse tool call:", err.message);
        messages.push({
          role: "user",
          content: `RESPONSE error: Could not parse arguments. Please retry with strict JSON format, e.g. CALL: draw_line({"startX": 100, "startY": 100, "endX": 200, "endY": 200, "lineColor": "black"})`
        });
      }
 
    } else if (finalMatch) {
      console.log(`\n🏁 Agent finished in ${loopCount} steps.`);
      console.log(`📝 Final Response: ${finalMatch[1]}`);
      keepGoing = false;
 
    } else {
      // Prevent consecutive assistant messages / nudge back to format
      messages.push({
        role: "user",
        content: `Please continue. Use CALL: or FINAL_ANSWER: format only.`
      });
    }
 
    await overwriteFile(JSON.stringify(messages));
  }
}
 
// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function safelyParseToolArgs(toolArgsString, toolName, provider) {
  let currentString = toolArgsString;
  const maxAttempts = 3;
 
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Tool parse attempt ${attempt} for tool [${toolName}]`);
      const cleaned = currentString
        .replace(/:\s*NaN/g, ': 0')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"');
      const toolArgs = JSON.parse(cleaned);
      console.log(`Tool parsed [${toolName}] with args:`, toolArgs);
      return toolArgs;
    } catch (parseError) {
      console.warn(`[Attempt ${attempt}/${maxAttempts}] JSON parse failed for ${toolName}: ${parseError.message}`);
      if (attempt === maxAttempts) {
        throw new Error(`Failed to parse toolArgs after ${maxAttempts} attempts. Original string: ${toolArgsString}`);
      }
      currentString = await askAIToFixJson(provider, currentString, parseError.message);
    }
  }
}
 
async function askAIToFixJson(provider, badJsonString, errorMessage) {
  const messages = [
    { role: "system", content: "You are a strict JSON repair utility. Fix the syntax errors so it becomes valid, parseable JSON. Return ONLY the raw, corrected JSON string. Do NOT include markdown code blocks, backticks, or explanations." },
    { role: "user", content: `Error: ${errorMessage}\nMalformed JSON:\n${badJsonString}` }
  ];
 
  try {
    const response = await callAI({ provider, messages });
    return response.message.content.trim().replace(/^```json|```$/g, '');
  } catch (err) {
    console.error('AI JSON fix error:', err.message);
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