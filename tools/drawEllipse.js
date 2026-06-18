import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawEllipseTool = {
  profile: {
    name: "draw_ellipse",
    description: "Draws an ellipse (oval) on the 800x480 canvas. You provide center, radiusX (horizontal), radiusY (vertical), and color. " +
                 "If radiusX == radiusY, it becomes a perfect circle. Use for stretched shapes like eggs, eyes, headlights, face outlines. " +
                 "Required args: centerX, centerY, radiusX, radiusY, lineColor. Optional: rotation (degrees, default 0).",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate (0 to 800). REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate (0 to 480). REQUIRED." },
        radiusX: { type: "number", description: "Horizontal radius (half-width). REQUIRED." },
        radiusY: { type: "number", description: "Vertical radius (half-height). REQUIRED." },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the ellipse outline. REQUIRED." },
        rotation: { type: "number", description: "Rotation in degrees. Optional, default 0." }
      },
      required: ["centerX", "centerY", "radiusX", "radiusY", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_ellipse", JSON.stringify(args));

    const centerX = Number(args.centerX);
    const centerY = Number(args.centerY);
    const radiusX = Number(args.radiusX);
    const radiusY = Number(args.radiusY);
    const rotation = args.rotation !== undefined ? Number(args.rotation) : 0;

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (fs.existsSync(filePath)) {
      try {
        const existingImage = await loadImage(filePath);
        ctx.drawImage(existingImage, 0, 0, width, height);
      } catch (err) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    console.log(`- draw_ellipse(${centerX}, ${centerY}, rx=${radiusX}, ry=${radiusY}, rotation=${rotation}°, black)`);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation * (Math.PI / 180));
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Ellipse drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { centerX, centerY, radiusX, radiusY, rotation, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};