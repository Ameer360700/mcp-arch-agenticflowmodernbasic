import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawRegularPolygonTool = {
  profile: {
    name: "draw_regular_polygon",
    description: "Draws a regular polygon (triangle, square, pentagon, hexagon, star, etc.) on the 800x480 canvas. " +
                 "You provide the center, radius, and number of sides — the tool calculates exact point positions for you. " +
                 "For a star shape, set isStar to true. " +
                 "Required args: centerX, centerY, radius, sides, lineColor. Optional: rotation (degrees, default 0), isStar (default false).",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate (0 to 800). REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate (0 to 480). REQUIRED." },
        radius: { type: "number", description: "Distance from center to each outer point. REQUIRED." },
        sides: { type: "number", description: "Number of sides/points. 3=triangle, 4=square, 5=pentagon, 6=hexagon, 5 with isStar=true gives a 5-point star. REQUIRED." },
        lineColor: { type: "string", enum: ["red", "black"], description: "Color of the outline. REQUIRED." },
        rotation: { type: "number", description: "Rotation in degrees. Optional, default 0. Use -90 to point a triangle straight up." },
        isStar: { type: "boolean", description: "If true, draws a star shape instead of a regular polygon. Optional, default false." }
      },
      required: ["centerX", "centerY", "radius", "sides", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_regular_polygon", JSON.stringify(args));

    const centerX = Number(args.centerX);
    const centerY = Number(args.centerY);
    const radius = Number(args.radius);
    const sides = Math.round(Number(args.sides));
    const rotation = args.rotation !== undefined ? Number(args.rotation) : 0;
    const isStar = args.isStar === true;

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

    console.log(`- draw_regular_polygon(${centerX}, ${centerY}, r=${radius}, sides=${sides}, rotation=${rotation}, star=${isStar})`);

    // Calculate points
    const rotationRad = rotation * (Math.PI / 180);
    const points = [];

    if (isStar) {
      // Star: alternate between outer radius and inner radius (40% of outer)
      const innerRadius = radius * 0.4;
      const numPoints = sides * 2;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 + rotationRad - Math.PI / 2;
        const r = i % 2 === 0 ? radius : innerRadius;
        points.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle)
        });
      }
    } else {
      // Regular polygon
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotationRad - Math.PI / 2;
        points.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
      }
    }

    // Draw the polygon
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Polygon drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { centerX, centerY, radius, sides, rotation, isStar, lineColor: args.lineColor }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};