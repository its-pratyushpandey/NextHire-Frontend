export const AI_CONFIG = {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    baseURL: 'https://nexthire-backend-ereo.onrender.com',
    model: import.meta.env.VITE_AI_MODEL || 'gpt-4'
};