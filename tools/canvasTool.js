import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

export const drawLineTool = {
  profile: {
    name: "draw_line",
    description: "Draws a straight line on an 800x480 canvas image named 'canvas.png'. " +
                 "To draw a line, you MUST provide startX, startY, endX, endY, and lineColor. " +
                 "Example: draw_line({startX: 100, startY: 200, endX: 300, endY: 400, lineColor: 'red'}) " +
                 "If the canvas file doesn't exist, it automatically creates it.",
    parameters: {
      type: "object",
      properties: {
        startX: { 
          type: "number", 
          description: "The starting X coordinate (0 to 800). REQUIRED. Must be a number between 0 and 800." 
        },
        startY: { 
          type: "number", 
          description: "The starting Y coordinate (0 to 480). REQUIRED. Must be a number between 0 and 480." 
        },
        endX: { 
          type: "number", 
          description: "The ending X coordinate (0 to 800). REQUIRED. Must be a number between 0 and 800." 
        },
        endY: { 
          type: "number", 
          description: "The ending Y coordinate (0 to 480). REQUIRED. Must be a number between 0 and 480." 
        },
        lineColor: { 
          type: "string", 
          enum: ["red", "black"], 
          description: "The color of the line. REQUIRED. Must be either 'red' or 'black'." 
        }
      },
      required: ["startX", "startY", "endX", "endY", "lineColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started", JSON.stringify(args));
    
    // 1. Force strict data type conversion
    const startX = Number(args.startX);
    const startY = Number(args.startY);
    const endX = Number(args.endX);
    const endY = Number(args.endY);
    const lineColor = args.lineColor;

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;
    
    // 2. Initialize the Canvas
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

    // 4. Configure drawing styles and draw the line
    // const actualColor = lineColor === 'red' ? '#FF0000' : '#000000';
    const actualColor = '#000000';
    console.log(`- draw_line(${startX}, ${startY}, ${endX}, ${endY}, ${lineColor}):`);
    
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 5. Save the updated canvas back to disk
    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      
      // Verify the file
      const stats = fs.statSync(filePath);
      
      return { 
        status: "success", 
        message: `Line recorded and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { startX, startY, endX, endY, lineColor }
      };
    } catch (err) {
      console.error("🔍 DEBUG - Save error:", err);
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};

// async function drawAllLines() {
//   // Array of all line configurations
  
//   const lineConfigs = [
//     { startX: 350, startY: 350, endX: 50, endY: 350, lineColor: "blue" },
//     { startX: 50, startY: 350, endX: 50, endY: 50, lineColor: "blue" },
//     { startX: 100, startY: 50, endX: 200, endY: 150, lineColor: "blue" },
//     { startX: 200, startY: 150, endX: 300, endY: 250, lineColor: "blue" },
//     { startX: 300, startY: 250, endX: 200, endY: 350, lineColor: "blue" },
//     { startX: 200, startY: 350, endX: 100, endY: 250, lineColor: "blue" },
//     { startX: 100, startY: 250, endX: 50, endY: 150, lineColor: "blue" },
//     { startX: 50, startY: 150, endX: 100, endY: 50, lineColor: "blue" },
//     { startX: 100, startY: 50, endX: 200, endY: 150, lineColor: "blue" },
//     { startX: 200, startY: 150, endX: 300, endY: 250, lineColor: "blue" },
//     { startX: 300, startY: 250, endX: 200, endY: 350, lineColor: "blue" },
//     { startX: 200, startY: 350, endX: 100, endY: 250, lineColor: "blue" },
//     { startX: 100, startY: 250, endX: 50, endY: 150, lineColor: "blue" },
//     { startX: 50, startY: 150, endX: 100, endY: 50, lineColor: "blue" },
//     { startX: 150, startY: 50, endX: 250, endY: 150, lineColor: "blue" },
//     { startX: 250, startY: 150, endX: 350, endY: 250, lineColor: "blue" },
//     { startX: 350, startY: 250, endX: 300, endY: 350, lineColor: "blue" },
//     { startX: 300, startY: 350, endX: 200, endY: 350, lineColor: "blue" }
//   ];

//   // Loop through each configuration and call the function
//   for (const config of lineConfigs) {
//     await drawLineTool.execute(config);
//   }
// }

// drawAllLines()