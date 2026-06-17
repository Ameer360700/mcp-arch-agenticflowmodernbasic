import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawRectangleTool = {
  profile: {
    name: "draw_rectangle",
    description: "Draws a rectangle outline on the 800x480 canvas. Required args: x, y (top-left corner), width, height, lineColor.",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "Top-left X coordinate (0 to 800). REQUIRED." },
        y: { type: "number", description: "Top-left Y coordinate (0 to 480). REQUIRED." },
        width: { type: "number", description: "Width of the rectangle. REQUIRED." },
        height: { type: "number", description: "Height of the rectangle. REQUIRED." },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the rectangle outline. REQUIRED." }
      },
      required: ["x", "y", "width", "height", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_rectangle", JSON.stringify(args));

    const x = Number(args.x);
    const y = Number(args.y);
    const width = Number(args.width);
    const height = Number(args.height);

    const filePath = './canvas.png';
    const canvasWidth = 800;
    const canvasHeight = 480;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    if (fs.existsSync(filePath)) {
      try {
        const existingImage = await loadImage(filePath);
        ctx.drawImage(existingImage, 0, 0, canvasWidth, canvasHeight);
      } catch (err) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    console.log(`- draw_rectangle(${x}, ${y}, ${width}, ${height}, black)`);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Rectangle drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { x, y, width, height, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};