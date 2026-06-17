import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkCircleTool = {
  profile: {
    name: "check_circle",
    description: "Checks if a circle exists on the canvas. Provide centerX, centerY, radius.",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate (0 to 800). REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate (0 to 480). REQUIRED." },
        radius: { type: "number", description: "Radius of the circle. REQUIRED." }
      },
      required: ["centerX", "centerY", "radius"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_circle", JSON.stringify(args));

    const centerX = Math.round(Number(args.centerX));
    const centerY = Math.round(Number(args.centerY));
    const radius = Math.round(Number(args.radius));

    const filePath = './canvas.png';
    const canvasWidth = 800;
    const canvasHeight = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the circle is not drawn."
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

      // Sample points around the circumference
      const steps = 20;
      let blackCount = 0;

      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const px = Math.round(centerX + radius * Math.cos(angle));
        const py = Math.round(centerY + radius * Math.sin(angle));
        if (isPixelBlack(px, py)) blackCount++;
      }

      const exists = (blackCount / steps) >= 0.7;

      return {
        status: "success",
        exists,
        message: exists
          ? `Circle at center (${centerX}, ${centerY}) with radius ${radius} was successfully detected.`
          : `Circle at center (${centerX}, ${centerY}) with radius ${radius} was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};