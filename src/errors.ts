/**
 * Custom error for missing Gemini API key.
 * Thrown by AI services when no user-provided API key is available.
 * The UI layer catches this to show a friendly "add your key" prompt.
 */
export class MissingApiKeyError extends Error {
    constructor() {
        super(
            'No Gemini API Key found. Please add your API key in Settings to use AI features.'
        );
        this.name = 'MissingApiKeyError';
    }
}
