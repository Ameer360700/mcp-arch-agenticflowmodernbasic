// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { unlink, access } from 'node:fs/promises';
import { runAgent } from './orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANVAS_PATH = path.join(__dirname, 'canvas.png');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend')));

async function removeFile() {
  try {
    await access(CANVAS_PATH);
    await unlink(CANVAS_PATH);
    console.log('Previous canvas deleted.');
  } catch (error) {
    // file didn't exist, that's fine
  }
}

// ─── POST /draw ───────────────────────────────────────────────────────────
// Receives { prompt, provider } → runs the agent → returns success + canvas URL
app.post('/draw', async (req, res) => {
  const { prompt, provider } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const aiProvider = provider || 'deepseek';

  try {
    console.log(`\n🎨 New draw request: "${prompt}" (provider: ${aiProvider})`);

    await removeFile();
    await runAgent(prompt, aiProvider);

    // Cache-bust the canvas URL so frontend always gets the fresh image
    const canvasUrl = `/canvas?t=${Date.now()}`;

    res.json({
      status: 'success',
      message: 'Drawing complete.',
      canvasUrl
    });

  } catch (err) {
    console.error('❌ Error in /draw:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /canvas ──────────────────────────────────────────────────────────
// Serves the current canvas.png directly
app.get('/canvas', async (req, res) => {
  try {
    await access(CANVAS_PATH);
    res.sendFile(CANVAS_PATH);
  } catch (err) {
    res.status(404).json({ error: 'Canvas not found. Draw something first.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Lumea server running at http://localhost:${PORT}`);
});