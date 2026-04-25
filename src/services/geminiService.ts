
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MeetingData {
  summary: string;
  tasks: TaskItem[];
}

export async function processMeetingAudio(audioBase64: string, mimeType: string): Promise<MeetingData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `You are an elite executive assistant and meeting analyst. 
              Analyze this meeting audio and perform the following:
              
              1. SUMMARY: Provide a concise, professional summary of the meeting's main discussion points and key decisions.
              2. TASK EXTRACTION: Identify every actionable task. For each:
                 - Description: Clear, concise action item.
                 - Owner: Name of the responsible person.
                 - OwnerEmail: If an email address is mentioned or can be reasonably inferred for this person, include it. If not, guess a professional format like 'name@company.com' if the company name is known, otherwise use 'pending@office.com'.
                 - Priority: Low, Medium, or High.
                 - Deadline: Specific time/date mentioned (use 'TBD' if not stated).
                 - Files: Specific documents/files mentioned. Use 'None' if none.
              
              Return a structured JSON object with keys 'summary' and 'tasks'.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A professional summary of the meeting" },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  owner: { type: Type.STRING },
                  ownerEmail: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  deadline: { type: Type.STRING },
                  files: { type: Type.STRING },
                },
                required: ["task", "owner", "ownerEmail", "priority", "deadline", "files"]
              }
            }
          },
          required: ["summary", "tasks"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return { summary: "No content detected.", tasks: [] };
    
    const data = JSON.parse(jsonStr);
    return {
      summary: data.summary,
      tasks: data.tasks.map((t: any, index: number) => ({
        ...t,
        id: `task-${Date.now()}-${index}`
      }))
    };
  } catch (error) {
    console.error("Error processing meeting:", error);
    throw error;
  }
}

export interface TaskItem {
  id: string;
  task: string;
  owner: string;
  ownerEmail: string;
  priority: "Low" | "Medium" | "High";
  deadline: string;
  files: string;
}

// Deprecated - use processMeetingAudio
export async function extractTasksFromAudio(audioBase64: string, mimeType: string): Promise<TaskItem[]> {
  const data = await processMeetingAudio(audioBase64, mimeType);
  return data.tasks;
}
