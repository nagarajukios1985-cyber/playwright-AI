import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

function loadPrompt(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT = loadPrompt("./prompts/systemPrompt.md");
const GIT_PROMPT = loadPrompt("./prompts/git.md");

const FULL_PROMPT = `
${SYSTEM_PROMPT}


${GIT_PROMPT}

`;

const tools = {
  create_plan: async ({ input, observations = [] }) => {
    const messages = [
      {
        role: "system",
        content: FULL_PROMPT,
      }
    ];

    if (observations.length > 0) {
      messages.push({
        role: "user",
        content: `
Previous execution results:

${JSON.stringify(observations, null, 2)}
        `,
      });
    }

    messages.push({
      role: "user",
      content: input,
    });

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:free",
      messages,
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    });

    const raw = response.choices[0].message.content;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Failed to parse JSON:");
      console.error(raw);

      return {
        goal: "Invalid model response",
        steps: [
          {
            action: "chat",
            message: "Model returned invalid JSON",
            description: "Fallback"
          }
        ]
      };
    }
  }
};

export async function callTool(name, args) {
  if (!tools[name]) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return await tools[name](args);
}