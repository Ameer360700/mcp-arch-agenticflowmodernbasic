import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkEllipseTool = {
  profile: {
    name: "check_ellipse",
    description: "Checks if an ellipse exists on the canvas. Provide the SAME centerX, centerY, radiusX, radiusY, rotation used to draw it.",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate. REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate. REQUIRED." },
        radiusX: { type: "number", description: "Horizontal radius. REQUIRED." },
        radiusY: { type: "number", description: "Vertical radius. REQUIRED." },
        rotation: { type: "number", description: "Rotation in degrees. Optional, default 0." }
      },
      required: ["centerX", "centerY", "radiusX", "radiusY"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_ellipse", JSON.stringify(args));

    const centerX = Number(args.centerX);
    const centerY = Number(args.centerY);
    const radiusX = Number(args.radiusX);
    const radiusY = Number(args.radiusY);
    const rotation = args.rotation !== undefined ? Number(args.rotation) : 0;

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the ellipse is not drawn."
      };
    }

    try {
      const image = await loadImage(filePath);
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height).data;

      const isPixelBlack = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const index = (y * width + x) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const threshold = 50;
        return r < threshold && g < threshold && b < threshold;
      };

      // Sample points around the ellipse circumference
      const steps = 30;
      const rotationRad = rotation * (Math.PI / 180);
      let blackCount = 0;

      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        // Parametric ellipse equation, rotated
        const x = radiusX * Math.cos(angle);
        const y = radiusY * Math.sin(angle);
        // Apply rotation
        const rotX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
        const rotY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);
        // Translate to center
        const px = Math.round(centerX + rotX);
        const py = Math.round(centerY + rotY);
        if (isPixelBlack(px, py)) blackCount++;
      }

      const exists = (blackCount / steps) >= 0.7;

      return {
        status: "success",
        exists,
        message: exists
          ? `Ellipse at center (${centerX}, ${centerY}) with radiusX=${radiusX}, radiusY=${radiusY} was successfully detected.`
          : `Ellipse at center (${centerX}, ${centerY}) with radiusX=${radiusX}, radiusY=${radiusY} was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};