import { callOllamaModel } from './ollama.service.js';
import { callDeepSeekModel } from './deep-seek.service.js';
import { callChatGptModel } from './chat-gpt.service.js';

export async function callAI({ provider, messages, model }) {
    if (provider === 'ollama') {
        return await callOllamaModel({ messages, model });
    } else if (provider === 'deepseek') {
        return await callDeepSeekModel({ messages, model });
    } else if (provider === 'chatgpt') {
        return await callChatGptModel({ messages, model });
    } 
}