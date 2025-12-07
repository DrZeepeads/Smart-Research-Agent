import { GoogleGenAI, Type } from "@google/genai";
import { ResearchPlan, ResearchStep, FinalReport } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for Models
const FAST_MODEL = 'gemini-2.5-flash';
const REASONING_MODEL = 'gemini-2.5-flash'; // Using flash for speed in this demo, usually pro is better for deep reasoning

/**
 * Generates a structured research plan based on the user's topic.
 */
export const generateResearchPlan = async (topic: string): Promise<ResearchPlan> => {
  const prompt = `
    You are an expert research lead. Create a comprehensive research plan for the topic: "${topic}".
    Break this down into 3-5 distinct, investigative steps (sub-questions) that need to be answered to form a complete report.
    For each step, provide a search query and a brief rationale.
  `;

  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "The specific question to investigate" },
                rationale: { type: Type.STRING, description: "Why this step is important" }
              },
              required: ["query", "rationale"]
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate plan");
  
  const parsed = JSON.parse(text);
  
  return {
    topic,
    steps: parsed.steps.map((s: any, index: number) => ({
      ...s,
      id: `step-${index}-${Date.now()}`,
      status: 'pending'
    }))
  };
};

/**
 * Executes a single research step.
 * Simulates tool usage by asking the model to use its internal knowledge + reasoning.
 * In a full backend, this would call 'googleSearch' tool or external APIs.
 */
export const executeResearchStep = async (step: ResearchStep, topic: string): Promise<string> => {
  const prompt = `
    Context: Researching "${topic}".
    Task: Investigate the following question: "${step.query}".
    Rationale: ${step.rationale}
    
    Provide a detailed, factual summary of the answer to this specific question based on your knowledge. 
    Focus on concrete details, numbers, and verifiable facts. Limit to 300 words.
  `;

  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: prompt,
    config: {
      // Using thinking budget to ensure better quality extraction
      thinkingConfig: { thinkingBudget: 1024 } 
    }
  });

  return response.text || "No information found.";
};

/**
 * Synthesizes all gathered data into a final structured report.
 */
export const synthesizeReport = async (plan: ResearchPlan): Promise<FinalReport> => {
  const context = plan.steps
    .filter(s => s.status === 'completed' && s.result)
    .map(s => `Q: ${s.query}\nFindings: ${s.result}`)
    .join("\n\n---\n\n");

  const prompt = `
    You are a senior analyst. Write a comprehensive report on "${plan.topic}" based strictly on the following research findings.
    
    Research Findings:
    ${context}

    Format the output as a JSON object with a title, executive summary, sections (title + content), and a conclusion.
  `;

  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          },
          conclusion: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate report");
  return JSON.parse(text);
};
