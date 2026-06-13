import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.CHATGPT_TOKEN,
});

export async function callChatGptModel({model = 'gpt-4o', messages}) {
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            thinking: { "type": "enabled" },
            reasoning_effort: "high",
            stream: false,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching data from OpenAI:', error);
        throw error;
    }
}