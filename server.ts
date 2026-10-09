import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '30mb' }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Please ensure an API key is available in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. AI Study Coach Chat with optional Search Grounding
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, useSearch, context } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getAiClient();

    const systemInstruction = `You are DuePulse AI, a supportive, highly organized academic advisor and study strategist for college and high school students.
Your mission is to help students manage their deadlines, build realistic study schedules, break down complex projects and papers, explain syllabus concepts, and overcome academic procrastination.
Keep your responses well-structured (bullet points, clear steps, estimated study blocks).
${context ? `\nActive Student Deadlines Context:\n${context}` : ''}`;

    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const config: any = {
      systemInstruction,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config,
    });

    const replyText = response.text || '';
    
    // Extract web search grounding citations if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: { title: string; uri: string }[] = [];
    if (groundingChunks && Array.isArray(groundingChunks)) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk?.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
          });
        }
      });
    }

    return res.json({
      text: replyText,
      sources,
    });
  } catch (err: any) {
    console.error('AI Chat error:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred while generating the AI response',
    });
  }
});

// 2. Audio Speech-to-Text Transcription using gemini-3.5-transcribe
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const ai = getAiClient();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this student audio recording accurately into clear, clean text. Omit filler words if unintelligible.',
          },
        ],
      },
    });

    return res.json({
      transcription: response.text?.trim() || '',
    });
  } catch (err: any) {
    console.error('Audio Transcription error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to transcribe audio recording',
    });
  }
});

// 3. Smart Assignment Milestone Generator
app.post('/api/ai/breakdown', async (req, res) => {
  try {
    const { title, course, type, dueDate, notes } = req.body;
    const ai = getAiClient();

    const prompt = `As an academic study planner, generate a step-by-step milestone checklist for this student assignment:
Title: ${title}
Course: ${course || 'General'}
Type: ${type}
Due Date: ${dueDate}
${notes ? `Notes: ${notes}` : ''}

Return a concise list of 4 to 6 actionable milestone steps formatted as JSON with an array of objects:
[
  { "title": "Milestone description", "estimatedHours": 1.5 }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let milestones = [];
    try {
      milestones = JSON.parse(response.text || '[]');
    } catch {
      milestones = [];
    }

    return res.json({ milestones });
  } catch (err: any) {
    console.error('Milestone breakdown error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate milestone breakdown',
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const port = 3000;
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, port, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DuePulse server running on http://0.0.0.0:${port}`);
  });
}

startServer();
