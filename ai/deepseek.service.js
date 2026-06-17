import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_TOKEN,
});

export async function callDeepSeekModel({ model = 'deepseek-v4-pro', messages }) {
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            thinking: { "type": "enabled" },
            reasoning_effort: "high",
            stream: false,
        });

        return response.choices[0]
    } catch (error) {
        console.error('Error fetching data from OpenAI:', error);
        throw error;
    }
}