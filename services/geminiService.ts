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

export const generateMerchDesign = async (trend: Trend, productType: string, stylePrefix?: string): Promise<GeneratedDesign | null> => {
  const prefix = stylePrefix || DESIGN_PROMPT_PREFIX;
  
  try {
    // 1. Generate Product Details using Gemini 3 Flash
    const detailsPrompt = `You are an avant-garde product designer. Based on the viral trend "${trend.topic}" (Context: ${trend.context}) and the product type "${productType}", generate a detailed product concept.
    Return a JSON object with the following keys:
    - coreConcept: The core philosophy and idea behind this product (产品核心理念).
    - designAppearance: Detailed description of its physical appearance, materials, and aesthetics (设计与外观).
    - coreInnovation: What makes this product functionally or visually innovative? (核心创新的点).
    - usageScenarios: Where and how would a user use this product? (使用场景与细节).`;

    let details: any = {
      coreConcept: "A unique take on modern trends.",
      designAppearance: "Sleek, avant-garde design.",
      coreInnovation: "Fuses digital culture with physical form.",
      usageScenarios: "Everyday use for the culturally aware."
    };

    try {
      const detailsResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: detailsPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreConcept: { type: Type.STRING },
              designAppearance: { type: Type.STRING },
              coreInnovation: { type: Type.STRING },
              usageScenarios: { type: Type.STRING }
            },
            required: ["coreConcept", "designAppearance", "coreInnovation", "usageScenarios"]
          }
        }
      });
      const parsedDetails = JSON.parse(detailsResponse.text || "{}");
      if (parsedDetails.coreConcept) {
        details = parsedDetails;
      }
    } catch (e) {
      console.error("Failed to generate product details, using fallback.", e);
    }

    // 2. Generate an actual photo of the product, not just a flat design.
    const prompt = `${prefix} CRITICAL INSTRUCTION: DO NOT generate a flat graphic, logo, or watermark. You must generate a photorealistic studio photograph of a UNIQUE PHYSICAL ${productType}. The actual physical shape, materials, structure, and 3D form of the ${productType} must be creatively designed to embody the trend: "${trend.topic}". (Context: ${trend.context}). Visual style: ${trend.visualStyle}. 
    Design Details: ${details.designAppearance}. 
    This is an industrial/fashion design task, not a 2D graphic design task. The product must look like a real, tangible, high-end manufactured item with depth, texture, and creative physical features. Clean, minimalist studio lighting, highly detailed, photorealistic product photography.`;
    
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
          },
          config: {
            imageConfig: {
              aspectRatio: "3:4"
            }
          }
        });

        let imageUrl = '';
        
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (imageUrl) {
          return {
            imageUrl,
            promptUsed: prompt,
            details
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