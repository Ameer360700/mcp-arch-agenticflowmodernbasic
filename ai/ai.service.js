import { callOllamaModel } from './ollama.service.js';
export async function callAI({ provider, messages, model }) {
    if (provider === 'ollama') {
        return await callOllamaModel({ messages, model });
    }
}