import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const checkRegularPolygonTool = {
  profile: {
    name: "check_regular_polygon",
    description: "Checks if a polygon exists on the canvas. Provide the SAME centerX, centerY, radius, sides, rotation, isStar used to draw it.",
    parameters: {
      type: "object",
      properties: {
        centerX: { type: "number", description: "Center X coordinate. REQUIRED." },
        centerY: { type: "number", description: "Center Y coordinate. REQUIRED." },
        radius: { type: "number", description: "Radius used when drawing. REQUIRED." },
        sides: { type: "number", description: "Number of sides/points used when drawing. REQUIRED." },
        rotation: { type: "number", description: "Rotation in degrees used when drawing. Optional, default 0." },
        isStar: { type: "boolean", description: "Whether it was drawn as a star. Optional, default false." }
      },
      required: ["centerX", "centerY", "radius", "sides"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: check_regular_polygon", JSON.stringify(args));

    const centerX = Number(args.centerX);
    const centerY = Number(args.centerY);
    const radius = Number(args.radius);
    const sides = Math.round(Number(args.sides));
    const rotation = args.rotation !== undefined ? Number(args.rotation) : 0;
    const isStar = args.isStar === true;

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;

    if (!fs.existsSync(filePath)) {
      return {
        status: "success",
        exists: false,
        message: "The canvas file does not exist yet, so the polygon is not drawn."
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

      // Recalculate the same points used during drawing
      const rotationRad = rotation * (Math.PI / 180);
      const points = [];

      if (isStar) {
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
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 + rotationRad - Math.PI / 2;
          points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          });
        }
      }

      // Sample along each edge between consecutive points
      const stepsPerEdge = 8;
      let sampled = 0;
      let blackCount = 0;

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        for (let s = 0; s <= stepsPerEdge; s++) {
          const t = s / stepsPerEdge;
          const px = Math.round(p1.x + (p2.x - p1.x) * t);
          const py = Math.round(p1.y + (p2.y - p1.y) * t);
          sampled++;
          if (isPixelBlack(px, py)) blackCount++;
        }
      }

      const exists = (blackCount / sampled) >= 0.7;

      return {
        status: "success",
        exists,
        message: exists
          ? `Polygon at center (${centerX}, ${centerY}) with radius ${radius} and ${sides} sides was successfully detected.`
          : `Polygon at center (${centerX}, ${centerY}) with radius ${radius} and ${sides} sides was not found.`
      };

    } catch (err) {
      throw new Error(`Failed to read and analyze canvas: ${err.message}`);
    }
  }
};