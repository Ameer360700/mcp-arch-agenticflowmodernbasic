import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawBezierCurveTool = {
  profile: {
    name: "draw_bezier_curve",
    description: "Draws a smooth bezier curve on the 800x480 canvas. Provide an array of control points (at least 2). Points format: [{x, y}, {x, y}, ...]. For smooth curves, use 3-4 points (start, control1, control2, end).",
    parameters: {
      type: "object",
      properties: {
        points: { 
          type: "array", 
          description: "Array of control points. Each point: {x: number, y: number}. REQUIRED. Minimum 2 points (straight line), 3-4 for smooth curves."
        },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the curve. REQUIRED." }
      },
      required: ["points", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_bezier_curve", JSON.stringify(args));

    const points = args.points;
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error("points must be an array with at least 2 points");
    }

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

    console.log(`- draw_bezier_curve(${points.length} points, black)`);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      // Straight line
      ctx.lineTo(points[1].x, points[1].y);
    } else if (points.length === 3) {
      // Quadratic bezier
      ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    } else if (points.length >= 4) {
      // Cubic bezier (use first 4 points)
      ctx.bezierCurveTo(
        points[1].x, points[1].y,
        points[2].x, points[2].y,
        points[3].x, points[3].y
      );
    }

    ctx.stroke();

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Bezier curve with ${points.length} points drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { numPoints: points.length, points, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};