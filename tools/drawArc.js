import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawArcTool = {
  profile: {
    name: "draw_arc",
    description: "Draws an arc (partial circle curve) on the 800x480 canvas. Required args: centerX, centerY, radius, startAngle, endAngle (in degrees), lineColor.",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate (0 to 800). REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate (0 to 480). REQUIRED." },
        radius: { type: "number", description: "Radius of the arc. REQUIRED." },
        startAngle: { type: "number", description: "Start angle in degrees (0-360). REQUIRED." },
        endAngle: { type: "number", description: "End angle in degrees (0-360). REQUIRED." },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the arc. REQUIRED." }
      },
      required: ["centerX", "centerY", "radius", "startAngle", "endAngle", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_arc", JSON.stringify(args));

    const centerX = Number(args.centerX);
    const centerY = Number(args.centerY);
    const radius = Number(args.radius);
    const startAngle = Number(args.startAngle) * (Math.PI / 180);
    const endAngle = Number(args.endAngle) * (Math.PI / 180);

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

    console.log(`- draw_arc(${args.centerX}, ${args.centerY}, ${radius}, ${args.startAngle}°, ${args.endAngle}°, black)`);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Arc drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { centerX, centerY, radius, startAngle: args.startAngle, endAngle: args.endAngle, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};