
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { PDFDocument } from 'pdf-lib';
import { ExamConfig, MCQ, VoiceName } from "../types";

// senior-engineer: initialize with key from env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

const MODEL_NAME = "gemini-3-pro-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/**
 * DECODING HELPERS FOR RAW PCM
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * HELPER: Exponential Backoff Retry
 * Handles 503 (Overloaded) and 429 (Rate Limit) errors gracefully.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isOverloaded = error?.message?.includes("503") || error?.message?.includes("overloaded");
    const isRateLimited = error?.message?.includes("429") || error?.message?.includes("Resource has been exhausted");
    
    if ((isOverloaded || isRateLimited) && retries > 0) {
      console.warn(`Model busy or rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateAudio(text: string, voiceName: VoiceName = 'Kore'): Promise<void> {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });
    const response: GenerateContentResponse = await withRetry(() => genAI.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const decodedBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (error) {
    console.error("TTS generation failed:", error);
  }
}

export async function extractTextFromPdf(file: File): Promise<{text: string, pageCount: number}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  return { text: "PDF Binary Data", pageCount };
}

async function getPdfChunks(file: File, pagesPerChunk: number = 4): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const originalPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = originalPdf.getPageCount();
  const chunks: string[] = [];
  for (let i = 0; i < totalPages; i += pagesPerChunk) {
    const subPdf = await PDFDocument.create();
    const pageIndices = [];
    for (let j = 0; j < pagesPerChunk && (i + j) < totalPages; j++) pageIndices.push(i + j);
    const copiedPages = await subPdf.copyPages(originalPdf, pageIndices);
    copiedPages.forEach(page => subPdf.addPage(page));
    chunks.push(await subPdf.saveAsBase64());
  }
  return chunks;
}

export const generateGeminiStyleQuiz = async (config: ExamConfig): Promise<any> => {
  const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

  const isFCPS = config.adminPrompt?.toUpperCase().includes("FCPS STYLE");

  const systemPrompt = `
    You are a Senior Medical Education Expert and Content Designer.
    OUTPUT JSON ONLY. NO MARKDOWN.

    ${isFCPS ? `
    SPECIAL INSTRUCTION: ADMIN SELECTED "FCPS STYLE". 
    Strictly follow CPSP/FCPS Single Best Answer (SBA) style:
    1. Stem: Clinical vignette (age/sex + 1-3 clues), 2-5 lines.
    2. Lead-in: Action-oriented (e.g., "What is the most likely diagnosis?"). Upper-case EXCEPT/NOT/INCORRECT if used.
    3. Options: EXACTLY 5 (A-E), plausible, same category, one best answer.
    4. Explanation: 2-5 sentences rationale + 1 sentence rejecting top distractor.
    5. Key Notes: 3-6 bullet points summarizing related high-yield pearls.
    6. Difficulty: Label as "easy" (C1), "medium" (C2), or "hard" (C3).
    ` : `
    General Style: Create high-quality clinical MCQs (USMLE/PLAB style).
    - Stem: Detailed clinical scenario focused on diagnostic reasoning.
    - Options: 5 options (A-E).
    - Explanation: High-yield reasoning.
    - Key Notes: Key learning points.
    `}

    JSON Schema:
    {
      "title": "Short descriptive quiz title",
      "description": "1-3 lines describing context",
      "questions": [
        {
          "stem": "The clinical vignette part of the question.",
          "leadIn": "The specific question being asked (e.g. Next best step?).",
          "options": [
            {"id":"A","text":"Choice 1"},
            {"id":"B","text":"Choice 2"},
            {"id":"C","text":"Choice 3"},
            {"id":"D","text":"Choice 4"},
            {"id":"E","text":"Choice 5"}
          ],
          "correctOptionId": "A",
          "explanation": "Rationale for best answer and rejection of tempting distractor.",
          "keyNotes": ["Pearl 1", "Pearl 2"],
          "hint": "Subtle nudge or null",
          "difficulty": "easy|medium|hard"
        }
      ]
    }
  `;

  const userPrompt = config.adminPrompt || "Generate high-yield medical clinical scenarios.";
  let questions: any[] = [];
  let title = "Generated Quiz";
  let description = "";

  try {
    const handleResponse = (text: string) => {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const batch = JSON.parse(cleaned || '{"questions":[]}');
      
      // Map to standardized format if AI uses "leadIn" vs "stem"
      const mappedQuestions = (batch.questions || []).map((q: any) => ({
        ...q,
        // Ensure 'question' field is constructed from stem + leadIn if leadIn exists
        question: q.leadIn ? `${q.stem}\n\n${q.leadIn}` : q.stem,
        difficulty: q.cognitiveLevel ? (q.cognitiveLevel === 'C1' ? 'easy' : q.cognitiveLevel === 'C2' ? 'medium' : 'hard') : (q.difficulty || 'medium')
      }));

      questions.push(...mappedQuestions);
      if (batch.title || batch.quizTitle) title = batch.title || batch.quizTitle;
      if (batch.description || batch.quizDescription) description = batch.description || batch.quizDescription;
    };

    if (config.sourceFile && config.sourceMimeType === 'application/pdf') {
      const chunks = await getPdfChunks(config.sourceFile, 5);
      for (const chunk of chunks.slice(0, 4)) {
        const response: GenerateContentResponse = await withRetry(() => aiClient.models.generateContent({
          model: MODEL_NAME,
          contents: { parts: [
            { inlineData: { data: chunk, mimeType: 'application/pdf' } },
            { text: userPrompt }
          ]},
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.7
          }
        }));
        handleResponse(response.text || '{}');
      }
    } else {
      const response: GenerateContentResponse = await withRetry(() => aiClient.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: `Content: ${config.sourceText}\n\nInstruction: ${userPrompt}` }]},
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      }));
      handleResponse(response.text || '{}');
    }

    return { 
      title, 
      description,
      questions: questions.map((q, i) => ({ 
        ...q, 
        id: q.id || `q-${Date.now()}-${i}`,
        correctAnswerIndex: q.options.findIndex((o: any) => o.id === q.correctOptionId)
      })),
      timeLimitMinutes: 60,
      attemptLimit: 1
    };
  } catch (err) {
    console.error("Generation failed after retries:", err);
    throw err;
  }
};

export const generateExamMCQs = async (config: ExamConfig): Promise<MCQ[]> => {
  const quiz = await generateGeminiStyleQuiz(config);
  return quiz.questions;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
};
