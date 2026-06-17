import { callOllamaModel } from './ollama.service.js';
import { callDeepSeekModel } from './deepseek.service.js';

export async function callAI({ provider, messages, model }) {
    if (provider === 'ollama') {
        return await callOllamaModel({ messages, model });
    }
    if (provider === 'deepseek') {
        return await callDeepSeekModel({ messages, model });
    }
}