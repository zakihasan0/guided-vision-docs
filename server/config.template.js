export const config = {
  // Google Gemini API key - Replace with your actual API key
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  
  // Server configuration
  PORT: process.env.PORT || 3001,
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8080'
}; 