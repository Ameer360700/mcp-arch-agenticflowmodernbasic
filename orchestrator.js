// orchestrator.js
import { registry } from './tools/registry.js';
import { writeFile } from 'node:fs/promises';
import { callAI } from './ai/ai.service.js';

const MAX_HISTORY = 20;
const MAX_ITERATIONS = 200;

function getTrimmedHistory(messages) {
  const system = messages[0];
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
    `Each item must follow this exact format:\n` +
    `{ "tool": "draw_line", "args": { "startX": 100, "startY": 100, "endX": 200, "endY": 200, "lineColor": "black" } }\n\n` +
    `Available tools and their required args:\n` +
    `- draw_line: startX, startY, endX, endY, lineColor\n` +
    `- draw_rectangle: x, y, width, height, lineColor\n` +
    `- draw_circle: centerX, centerY, radius, lineColor\n` +
    `- draw_arc: centerX, centerY, radius, startAngle, endAngle (degrees), lineColor\n` +
    `- draw_regular_polygon: centerX, centerY, radius, sides (3-8), lineColor, rotation (optional), isStar (optional)\n` +
    `- draw_ellipse: centerX, centerY, radiusX, radiusY, lineColor, rotation (optional)\n` +
    `- draw_rounded_rectangle: x, y, width, height, cornerRadius, lineColor\n` +
    `- draw_text: text, x, y, fontSize, textColor (black/red/blue/green), alignment (optional)\n\n` +
    `PLANNING RULES:\n` +
    `- Output ONLY a valid JSON array. No explanation, no markdown, no backticks.\n` +
    `- ALL coordinates must stay within X: 0-800, Y: 0-480.\n` +
    `- Before finalizing the plan, mentally list EVERY visual element the request implies. Include ALL of them.\n` +
    `- For regular shapes (triangle, square, pentagon, hexagon, octagon etc.), ALWAYS use draw_regular_polygon with the correct sides count instead of drawing individual lines.\n` +
    `- For text labels or numbers, use draw_text.\n` +
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
  const totalItems = drawingPlan.length;

  const systemInstructions =
    `You are an agentic drawing executor. You execute a pre-planned list of drawing commands one by one.\n\n` +

    `CANVAS RULES:\n` +
    `- Canvas is 800x480 pixels. Origin (0,0) is TOP-LEFT.\n` +
    `- ALL coordinates must stay within X: 0-800, Y: 0-480.\n\n` +

    `AVAILABLE TOOLS:\n${toolSpecs}\n\n` +

    `EXECUTION RULES:\n` +
    `1. Execute plan items IN ORDER, one at a time.\n` +
    `2. After every draw_ tool, immediately verify using the matching check_ tool with IDENTICAL coordinates.\n` +
    `3. If check returns exists: false, redraw ONCE with same coordinates. If still fails, move on.\n` +
    `4. Output exactly ONE CALL per response. Never combine multiple CALL blocks.\n` +
    `5. Never output CALL and FINAL_ANSWER in the same response.\n` +
    `6. After each check_ response, you will be told exactly which plan item comes next. Follow it.\n` +
    `7. Only give FINAL_ANSWER when explicitly told all items are complete.\n\n` +

    `FORMAT (strict):\n` +
    `THOUGHT: [brief reasoning]\n` +
    `CALL: tool_name({"key": value})\n\n` +

    `When done:\n` +
    `FINAL_ANSWER: [brief description of what was drawn]`;

  const messages = [
    { role: "system", content: systemInstructions },
    {
      role: "user",
      content:
        `Execute this drawing plan. Total items: ${totalItems}.\n\n` +
        `${JSON.stringify(drawingPlan, null, 2)}\n\n` +
        `Start with item 1: ${JSON.stringify(drawingPlan[0])}`
    }
  ];

  console.log(`\n🚀 Phase 2: Executing drawing plan for: "${userPrompt}"`);

  let keepGoing = true;
  let loopCount = 0;
  let planIndex = 0; // tracks completed plan items

  while (keepGoing && loopCount < MAX_ITERATIONS) {
    loopCount++;
    console.log(`\n--- [Iteration ${loopCount}] ---`);

    const response = await callAI({ provider, messages: getTrimmedHistory(messages) });
    const reply = response.message.content;
    console.log(`[model] Output:\n${reply}`);

    messages.push({ role: "assistant", content: reply });

    const callMatch = reply.match(/CALL:\s*(\w+)\((\{[\s\S]*?\})\s*\)/);
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

        if (isDrawTool) {
          // After draw: ask to verify
          messages.push({
            role: "user",
            content:
              `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}.\n` +
              `Now verify using ${checkToolName} with EXACT same coordinates: ${toolArgsString}`
          });
        } else {
          // After check: increment index and tell model what's next
          planIndex++;
          const remaining = drawingPlan.slice(planIndex);

          if (remaining.length > 0) {
            messages.push({
              role: "user",
              content:
                `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}.\n` +
                `Completed ${planIndex}/${totalItems} plan items.\n` +
                `Next item (${planIndex + 1}/${totalItems}): ${JSON.stringify(remaining[0])}`
            });
          } else {
            messages.push({
              role: "user",
              content:
                `RESPONSE from ${toolName}: ${JSON.stringify(toolResult)}.\n` +
                `All ${totalItems} plan items have been drawn and verified. Now give FINAL_ANSWER.`
            });
          }
        }

      } catch (err) {
        console.error("❌ Failed to execute or parse tool call:", err.message);
        messages.push({
          role: "user",
          content:
            `RESPONSE error: Could not parse arguments for ${toolName}. ` +
            `Retry with strict JSON format. Current plan item (${planIndex + 1}/${totalItems}): ` +
            `${JSON.stringify(drawingPlan[planIndex])}`
        });
      }

    } else if (finalMatch) {
      console.log(`\n🏁 Agent finished in ${loopCount} steps.`);
      console.log(`📝 Final Response: ${finalMatch[1]}`);
      keepGoing = false;

    } else {
      // Empty or unrecognised response — nudge back
      const remaining = drawingPlan.slice(planIndex);
      messages.push({
        role: "user",
        content:
          `Please continue. Use CALL: or FINAL_ANSWER: format only.\n` +
          `${remaining.length > 0
            ? `Next plan item (${planIndex + 1}/${totalItems}): ${JSON.stringify(remaining[0])}`
            : `All items done. Give FINAL_ANSWER.`}`
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
    { role: "system", content: "You are a strict JSON repair utility. Fix syntax errors so it becomes valid parseable JSON. Return ONLY the raw corrected JSON string. No markdown, no backticks, no explanations." },
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