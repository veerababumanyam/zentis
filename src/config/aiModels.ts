export const AI_MODELS = {
    FLASH: import.meta.env.GOOGLE_Gemini_flash_model || 'gemini-3-flash-preview',
    PRO: import.meta.env.GOOGLE_Gemini_pro_model || 'gemini-3-pro-preview',
    IMAGE: import.meta.env.GOOGLE_Gemini_image_model || 'gemini-3-pro-image-preview',
    TTS: 'gemini-2.5-flash-preview-tts', // TTS model availability might differ
};
