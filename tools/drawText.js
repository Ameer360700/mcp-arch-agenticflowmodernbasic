import fs from 'fs';
import { createCanvas, loadImage, registerFont } from 'canvas';

export const drawTextTool = {
  profile: {
    name: "draw_text",
    description: "Draws text on the 800x480 canvas. Required args: text, x, y (position), fontSize, textColor. Optional: fontFamily (default 'Arial'), alignment (left/center/right, default left).",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to draw. REQUIRED." },
        x: { type: "number", description: "X coordinate of text position (0 to 800). REQUIRED." },
        y: { type: "number", description: "Y coordinate of text position (0 to 480). REQUIRED." },
        fontSize: { type: "number", description: "Size of the text in pixels. REQUIRED." },
        textColor: { type: "string", enum: ["black", "red", "blue", "green"], description: "Color of the text. REQUIRED." },
        fontFamily: { type: "string", description: "Font family (e.g., Arial, Times, Courier). Optional, default 'Arial'." },
        alignment: { type: "string", enum: ["left", "center", "right"], description: "Text alignment. Optional, default 'left'." }
      },
      required: ["text", "x", "y", "fontSize", "textColor"]
    }
  },

  execute: async (args) => {
    console.log("Tool Execution Started: draw_text", JSON.stringify(args));

    const text = String(args.text);
    const x = Number(args.x);
    const y = Number(args.y);
    const fontSize = Number(args.fontSize);
    const fontFamily = args.fontFamily || 'Arial';
    const alignment = args.alignment || 'left';

    const colorMap = {
      'black': '#000000',
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#00AA00'
    };
    const textColor = colorMap[args.textColor] || '#000000';

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

    console.log(`- draw_text("${text}", ${x}, ${y}, fontSize=${fontSize}, color=${textColor})`);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = alignment;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);

    try {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      return {
        status: "success",
        message: `Text "${text}" drawn and saved to canvas.png. File size: ${stats.size} bytes`,
        details: { text, x, y, fontSize, textColor, fontFamily, alignment }
      };
    } catch (err) {
      throw new Error(`Failed to save canvas to disk: ${err.message}`);
    }
  }
};