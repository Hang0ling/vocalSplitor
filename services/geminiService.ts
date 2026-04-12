import { GoogleGenAI, Type } from "@google/genai";
import { SongAnalysis } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise as string,
      mimeType: file.type,
    },
  };
};

export const analyzeSong = async (file: File): Promise<SongAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // We'll analyze a snippet to save bandwidth if possible, but sending the whole file is supported 
  // for reasonable sizes. For this demo, we assume the user uploads a reasonably sized clip 
  // or we just send it.
  
  const audioPart = await fileToGenerativePart(file);

  const prompt = `Analyze this audio file. Provide the Genre, likely BPM, Key, Mood, and a list of prominent instruments. Also provide a 1-sentence poetic description.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [audioPart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            bpm: { type: Type.STRING },
            key: { type: Type.STRING },
            mood: { type: Type.STRING },
            instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
          },
          required: ["genre", "bpm", "key", "mood", "instruments", "description"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SongAnalysis;
    }
    return {};
  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    return {
      description: "Analysis failed. Please try a shorter audio clip.",
      genre: "Unknown"
    };
  }
};