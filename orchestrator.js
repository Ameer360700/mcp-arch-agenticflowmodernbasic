// orchestrator.js
import { registry } from './tools/registry.js';
import ollama from 'ollama';

export async function runAgent(userPrompt) {
  // 1. Convert our plug-and-play tools into a clear text instruction manual for Gemma
  const toolSpecs = registry.getToolDefinitions().map(tool => {
    return `- Name: ${tool.name}\n  Description: ${tool.description}\n  Arguments Format: {"a": number, "b": number}`;
  }).join('\n\n');

  const systemInstructions = 
    `You are an agentic math planner. You must solve the user's request step-by-step using tools.\n\n` +
    `AVAILABLE TOOLS:\n${toolSpecs}\n\n` +
    `CRITICAL FORMAT RULE:\n` +
    `You must think about your next step, then write a tool call exactly like this format:\n` +
    `THOUGHT: [Your reasoning here]\n` +
    `CALL: tool_name({"a": value, "b": value})\n\n` +
    `If you have the final answer and no more tools are needed, respond exactly in this format:\n` +
    `FINAL_ANSWER: [Your final calculated result here]`;

  const messages = [
    { role: "system", content: systemInstructions },
    { role: "user", content: userPrompt }
  ];

  console.log(`\n🚀 Starting Text-Based Agentic Flow for: "${userPrompt}"`);
  
  let keepGoing = true;
  let loopCount = 0;
  const MAX_ITERATIONS = 6;

  while (keepGoing && loopCount < MAX_ITERATIONS) {
    loopCount++;
    console.log(`\n--- [Iteration ${loopCount}] ---`);

    // Call Ollama WITHOUT the native tools array parameter
    const response = await ollama.chat({
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
        const toolArgs = JSON.parse(toolArgsString);
        console.log(`🔧 Parsed Request: Running [${toolName}] with args:`, toolArgs);

        // Execute via our plug-and-play registry
        const toolResult = await registry.executeTool(toolName, toolArgs);
        console.log(`🔌 Tool Result:`, toolResult);

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
    } else {
      console.log("⚠️ Model did not follow formatting rules. Forcing exit.");
      keepGoing = false;
    }
  }
}