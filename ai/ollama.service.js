import ollama from 'ollama';
export async function callOllamaModel({ model = 'qwen3.5:4b', messages }) {
    const response = await ollama.chat({
        model: model,
        messages: messages
    });

    return response
}