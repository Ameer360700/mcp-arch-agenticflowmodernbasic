import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkTextTool = {
  profile: {
    name: "check_text",
    description: "Checks if text was drawn on the canvas at the specified position. Provide text, x, y, fontSize.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text that was drawn. REQUIRED." },
        x: { type: "number", description: "X coordinate where text was drawn. REQUIRED." },
        y: { type: "number", description: "Y coordinate where text was drawn. REQUIRED." },
        fontSize: { type: "number", description: "Font size used. REQUIRED." }
      },
      required: ["text", "x", "y", "fontSize"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_text", JSON.stringify(args));

    const text = String(args.text);
    const x = Math.round(Number(args.x));
    const y = Math.round(Number(args.y));
    const fontSize = Number(args.fontSize);

    const filePath = './canvas.png';
    const canvasWidth = 800;
    const canvasHeight = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the text is not drawn."
      };
    }

    try {
      const image = await loadImage(filePath);
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

      const isPixelNonWhite = (px, py) => {
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return false;
        const index = (py * canvasWidth + px) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const a = imgData[index + 3];
        // Check if pixel is not white and not transparent
        const isWhite = r > 240 && g > 240 && b > 240;
        return !isWhite && a > 200;
      };

      // Sample a rectangular region where text should be
      const regionWidth = Math.max(100, text.length * fontSize * 0.6);
      const regionHeight = fontSize + 10;
      let nonWhiteCount = 0;
      let totalSampled = 0;

      for (let py = y; py < y + regionHeight && py < canvasHeight; py++) {
        for (let px = x; px < x + regionWidth && px < canvasWidth; px++) {
          totalSampled++;
          if (isPixelNonWhite(px, py)) nonWhiteCount++;
        }
      }

      const exists = totalSampled > 0 && (nonWhiteCount / totalSampled) >= 0.05;

      return {
        status: "success",
        exists,
        message: exists
          ? `Text "${text}" at (${x}, ${y}) was successfully detected.`
          : `Text "${text}" at (${x}, ${y}) was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};