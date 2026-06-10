// tools/registry.js
import { addNumbersTool } from './mathTool.js';

// Add new tools to this array to make them plug-and-play
const toolsList = [
  addNumbersTool
];

export const registry = {
  // Returns the schemas so the LLM knows what tools exist
  getToolDefinitions: () => toolsList.map(t => t.profile),
  
  // Executes a tool by name when the LLM requests it
  executeTool: async (name, args) => {
    const tool = toolsList.find(t => t.profile.name === name);
    if (!tool) throw new Error(`Tool ${name} not found.`);
    return await tool.execute(args);
  }
};