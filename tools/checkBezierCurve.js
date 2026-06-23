import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkBezierCurveTool = {
  profile: {
    name: "check_bezier_curve",
    description: "Checks if a bezier curve exists on the canvas. Provide the array of points used to draw it.",
    parameters: {
      type: "object",
      properties: {
        points: { 
          type: "array", 
          description: "Array of control points that were used to draw the curve. Each point: {x, y}. REQUIRED."
        }
      },
      required: ["points"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_bezier_curve", JSON.stringify(args));

    const points = args.points;
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error("points must be an array with at least 2 points");
    }

    const filePath = './canvas.png';
    const canvasWidth = 800;
    const canvasHeight = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the curve is not drawn."
      };
    }

    try {
      const image = await loadImage(filePath);
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

      const isPixelBlack = (x, y) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        const index = (y * canvasWidth + x) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const threshold = 50;
        return r < threshold && g < threshold && b < threshold;
      };

      // Sample along the path from start to end point
      const startPoint = points[0];
      const endPoint = points[points.length - 1];
      const steps = 20;
      let blackCount = 0;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Linear interpolation from start to end
        const px = Math.round(startPoint.x + (endPoint.x - startPoint.x) * t);
        const py = Math.round(startPoint.y + (endPoint.y - startPoint.y) * t);
        if (isPixelBlack(px, py)) blackCount++;
      }

      const exists = (blackCount / (steps + 1)) >= 0.6;

      return {
        status: "success",
        exists,
        message: exists
          ? `Bezier curve with ${points.length} points was successfully detected.`
          : `Bezier curve with ${points.length} points was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};