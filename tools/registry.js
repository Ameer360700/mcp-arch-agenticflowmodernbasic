import { drawLineTool } from './drawLine.js';
import { checkLineTool } from './checkLine.js';
import { drawRectangleTool } from './drawRectangle.js';
import { checkRectangleTool } from './checkRectangle.js';
import { drawCircleTool } from './drawCircle.js';
import { checkCircleTool } from './checkCircle.js';
import { drawArcTool } from './drawArc.js';
import { checkArcTool } from './checkArc.js';
import { drawRegularPolygonTool } from './drawRegularPolygon.js';
import { checkRegularPolygonTool } from './checkRegularPolygon.js';
import { drawEllipseTool } from './drawEllipse.js';
import { checkEllipseTool } from './checkEllipse.js';

const toolsList = [
  drawLineTool,
  checkLineTool,
  drawRectangleTool,
  checkRectangleTool,
  drawCircleTool,
  checkCircleTool,
  drawArcTool,
  checkArcTool,
  drawRegularPolygonTool,
  checkRegularPolygonTool,
  drawEllipseTool,
  checkEllipseTool,
];

export const registry = {
  getToolDefinitions: () => toolsList.map(t => t.profile),

  executeTool: async (name, args) => {
    const tool = toolsList.find(t => t.profile.name === name);
    if (!tool) throw new Error(`Tool ${name} not found.`);
    return await tool.execute(args);
  }
};