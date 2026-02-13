import { GoogleGenAI, Type } from "@google/genai";
import { Trend, GeneratedDesign } from "../types";
import { TREND_ANALYSIS_PROMPT, DESIGN_PROMPT_PREFIX } from "../constants";

// Initialize Gemini
// Note: In a real production app, this would be proxied through a backend to hide the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchTrends = async (customPrompt?: string): Promise<Trend[]> => {
  const promptToUse = customPrompt || TREND_ANALYSIS_PROMPT;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptToUse,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              platform: { type: Type.STRING },
              context: { type: Type.STRING, description: "Short description of the meme/trend" },
              visualStyle: { type: Type.STRING, description: "Visual keywords for the image generator" },
              score: { type: Type.NUMBER, description: "Virality score 0-100" }
            },
            required: ["topic", "platform", "context", "visualStyle", "score"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    const parsedData = JSON.parse(jsonStr);

    return parsedData.map((item: any, index: number) => ({
      id: `trend-${Date.now()}-${index}`,
      ...item
    }));

  } catch (error) {
    console.error("Trend Fetch Error:", error);
    return []; 
  }
};

export const generateMerchDesign = async (trend: Trend, stylePrefix?: string): Promise<GeneratedDesign | null> => {
  const prefix = stylePrefix || DESIGN_PROMPT_PREFIX;
  
  try {
    // We add "ensure white background" explicitly to help the multiply blend mode
    const prompt = `${prefix} ${trend.visualStyle}. Text elements should be minimal. Theme: ${trend.topic}. IMPORTANT: High contrast, white background.`;
    
    // Using gemini-2.5-flash-image for speed and efficiency
    // Added retry logic for 429 errors
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }]
          }
        });

        let imageUrl = '';
        
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (imageUrl) {
          return {
            imageUrl,
            promptUsed: prompt
          };
        } else {
            console.warn("No image data found in response");
            return null;
        }
      } catch (e: any) {
        if (e.status === 429 || e.code === 429) {
          retries++;
          console.warn(`Rate limit hit. Retrying in ${retries * 2}s...`);
          await delay(retries * 2000);
        } else {
          throw e;
        }
      }
    }
    return null;

  } catch (error) {
    console.error("Design Generation Error:", error);
    return null;
  }
};