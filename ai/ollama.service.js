import ollama from 'ollama';
export async function callOllamaModel({ model = 'mistral:7b', messages }) {
    const response = await ollama.chat({
        model: model,
        messages: messages
    });

    return response
}
