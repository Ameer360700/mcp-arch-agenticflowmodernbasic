import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkRoundedRectangleTool = {
  profile: {
    name: "check_rounded_rectangle",
    description: "Checks if a rounded rectangle exists on the canvas. Provide x, y, width, height, cornerRadius.",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "Top-left X coordinate. REQUIRED." },
        y: { type: "number", description: "Top-left Y coordinate. REQUIRED." },
        width: { type: "number", description: "Width of the rectangle. REQUIRED." },
        height: { type: "number", description: "Height of the rectangle. REQUIRED." },
        cornerRadius: { type: "number", description: "Radius of rounded corners. REQUIRED." }
      },
      required: ["x", "y", "width", "height", "cornerRadius"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_rounded_rectangle", JSON.stringify(args));

    const x = Math.round(Number(args.x));
    const y = Math.round(Number(args.y));
    const width = Math.round(Number(args.width));
    const height = Math.round(Number(args.height));
    const cornerRadius = Math.round(Number(args.cornerRadius));

    const filePath = './canvas.png';
    const canvasWidth = 800;
    const canvasHeight = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the rounded rectangle is not drawn."
      };
    }

    try {
      const image = await loadImage(filePath);
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

      const isPixelBlack = (px, py) => {
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return false;
        const index = (py * canvasWidth + px) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const threshold = 50;
        return r < threshold && g < threshold && b < threshold;
      };

      // Sample points along all 4 edges
      const points = [];
      const steps = 10;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // top edge
        points.push([Math.round(x + width * t), y]);
        // bottom edge
        points.push([Math.round(x + width * t), y + height]);
        // left edge
        points.push([x, Math.round(y + height * t)]);
        // right edge
        points.push([x + width, Math.round(y + height * t)]);
      }

      let blackCount = 0;
      for (const [px, py] of points) {
        if (isPixelBlack(px, py)) blackCount++;
      }

      const exists = (blackCount / points.length) >= 0.7;

      return {
        status: "success",
        exists,
        message: exists
          ? `Rounded rectangle at (${x}, ${y}) with size ${width}x${height} was successfully detected.`
          : `Rounded rectangle at (${x}, ${y}) with size ${width}x${height} was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};