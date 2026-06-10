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
    console.log("🔍 DEBUG - Received args:", JSON.stringify(args));
    
    // 1. Force strict data type conversion
    const startX = Number(args.startX);
    const startY = Number(args.startY);
    const endX = Number(args.endX);
    const endY = Number(args.endY);
    const lineColor = args.lineColor;
    
    console.log("🔍 DEBUG - Converted coordinates:", { startX, startY, endX, endY, lineColor });

    const filePath = './canvas.png';
    const width = 800;
    const height = 480;
    
    // 2. Initialize the Canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. Load existing canvas if it exists, otherwise initialize white background
    console.log("🔍 DEBUG - Checking if file exists:", filePath);
    console.log("🔍 DEBUG - File exists:", fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
      try {
        console.log("🔍 DEBUG - Loading existing image...");
        const existingImage = await loadImage(filePath);
        console.log("🔍 DEBUG - Image loaded, dimensions:", existingImage.width, "x", existingImage.height);
        ctx.drawImage(existingImage, 0, 0, width, height);
        console.log("🔍 DEBUG - Image drawn on canvas");
      } catch (err) {
        console.log("⚠️ Existing canvas.png was unreadable. Starting fresh.", err.message);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      console.log("🎨 canvas.png not found. Creating a fresh 800x480 canvas.");
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Configure drawing styles and draw the line
    const actualColor = lineColor === 'red' ? '#FF0000' : '#000000';
    console.log("🔍 DEBUG - Drawing line with color:", actualColor);
    
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    console.log(`\n🖌️ [Canvas Tool] Line drawn: (${startX}, ${startY}) -> (${endX}, ${endY}) [${lineColor}]`);

    // 5. Save the updated canvas back to disk
    try {
      console.log("🔍 DEBUG - Saving canvas to:", filePath);
      const buffer = canvas.toBuffer('image/png');
      console.log("🔍 DEBUG - Buffer size:", buffer.length);
      fs.writeFileSync(filePath, buffer);
      console.log("🔍 DEBUG - File saved successfully");
      
      // Verify the file
      const stats = fs.statSync(filePath);
      console.log("🔍 DEBUG - Saved file size:", stats.size, "bytes");
      
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