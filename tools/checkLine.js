import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkLineTool = {
  profile: {
    name: "check_line",
    description: "Checks whether a specific black straight line exists on the 800x480 canvas image named 'canvas.png'. " +
                 "you must Provide startX, startY, endX, and endY to verify if that line has been drawn." + 
                 "Example: check_line({startX: 100, startY: 200, endX: 300, endY: 400})",
    parameters: {
      type: "object",
      properties: {
        startX: { 
          type: "number", 
          description: "The starting X coordinate (0 to 800). REQUIRED." 
        },
        startY: { 
          type: "number", 
          description: "The starting Y coordinate (0 to 480). REQUIRED." 
        },
        endX: { 
          type: "number", 
          description: "The ending X coordinate (0 to 800). REQUIRED." 
        },
        endY: { 
          type: "number", 
          description: "The ending Y coordinate (0 to 480). REQUIRED." 
        }
      },
      required: ["startX", "startY", "endX", "endY"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_line", JSON.stringify(args));
    
    const startX = Math.round(Number(args.startX));
    const startY = Math.round(Number(args.startY));
    const endX = Math.round(Number(args.endX));
    const endY = Math.round(Number(args.endY));

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;

    // If the file doesn't exist, the line definitely hasn't been drawn
    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the line is not drawn."
      };
    }

    try {
      // Load the existing canvas image to inspect pixels
      const image = await loadImage(filePath);
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      
      // Get the image pixel data
      const imgData = ctx.getImageData(0, 0, width, height).data;

      // Helper function to check if a specific pixel is close to black
      const isPixelBlack = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        
        const index = (y * width + x) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        
        // Pure black is (0,0,0). Allowing a small tolerance threshold (e.g., < 50) for anti-aliasing.
        const threshold = 50;
        return r < threshold && g < threshold && b < threshold;
      };

      // Sample points along the line using a simple interpolation step
      // This checks the start, middle, and end points to verify the line exists.
      const steps = 10; 
      let blackPixelCount = 0;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const sampleX = Math.round(startX + (endX - startX) * t);
        const sampleY = Math.round(startY + (endY - startY) * t);

        if (isPixelBlack(sampleX, sampleY)) {
          blackPixelCount++;
        }
      }

      // If more than 70% of the sampled path contains black pixels, we consider the line drawn
      const lineExists = (blackPixelCount / (steps + 1)) >= 0.7;

      return {
        status: "success",
        exists: lineExists,
        message: lineExists 
          ? `Line from (${startX}, ${startY}) to (${endX}, ${endY}) was successfully detected.` 
          : `Line from (${startX}, ${startY}) to (${endX}, ${endY}) was not found.`
      };

    } catch (err) {
      console.error("🔍 DEBUG - Check error:", err);
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};