import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawRoundedRectangleTool = {
  profile: {
    name: "draw_rounded_rectangle",
    description: "Draws a rectangle with rounded corners on the 800x480 canvas. Required args: x, y (top-left), width, height, cornerRadius, lineColor.",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "Top-left X coordinate (0 to 800). REQUIRED." },
        y: { type: "number", description: "Top-left Y coordinate (0 to 480). REQUIRED." },
        width: { type: "number", description: "Width of the rectangle. REQUIRED." },
        height: { type: "number", description: "Height of the rectangle. REQUIRED." },
        cornerRadius: { type: "number", description: "Radius of the rounded corners. REQUIRED." },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the outline. REQUIRED." }
      },
      required: ["x", "y", "width", "height", "cornerRadius", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_rounded_rectangle", JSON.stringify(args));

    const x = Number(args.x);
    const y = Number(args.y);
    const width = Number(args.width);
    const height = Number(args.height);
    const cornerRadius = Number(args.cornerRadius);

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

    console.log(`- draw_rounded_rectangle(${x}, ${y}, ${width}x${height}, radius=${cornerRadius}, black)`);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + width - cornerRadius, y);
    ctx.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
    ctx.closePath();
    ctx.stroke();

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Rounded rectangle drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { x, y, width, height, cornerRadius, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};