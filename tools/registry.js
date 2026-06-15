import { drawLineTool } from './drawLine.js'; // 1. Import the canvas tool
import { checkLineTool } from './checkLine.js'; // 1. Import the check line tool

const toolsList = [
  drawLineTool, // 2. Add it to the array
  checkLineTool // 2. Add it to the array
];

export const registry = {
  getToolDefinitions: () => toolsList.map(t => t.profile),
  
  executeTool: async (name, args) => {
    const tool = toolsList.find(t => t.profile.name === name);
    if (!tool) throw new Error(`Tool ${name} not found.`);
    return await tool.execute(args);
  }
};