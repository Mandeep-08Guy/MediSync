import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzePrescription = async (imageBase64: string) => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Extract medication details from this prescription image. Return JSON with fields: drugName, dosage, frequency, duration. Be precise." },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
        ]
      }
    ]
  });
  const response = await model;
  return response.text;
};

export const checkDrugInteractions = async (drugs: string[]) => {
  const prompt = `Check for drug interactions between these medications: ${drugs.join(", ")}. 
  Identify severe interactions, food-drug interactions, and alcohol-drug interactions. 
  Return a structured JSON report.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
};
