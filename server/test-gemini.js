import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// First, let's list available models to find the correct ones
async function listModels() {
  try {
    console.log('Listing available Gemini models...');
    
    // Make a direct API call to list models since the SDK doesn't expose this method
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models',
      {
        headers: {
          'x-goog-api-key': config.GEMINI_API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('Available models:');
    data.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName}): ${model.description}`);
    });
    
    return data.models;
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API with key:', config.GEMINI_API_KEY);
    
    // List available models first
    const models = await listModels();
    
    // The correct model name based on the API version
    // The model names should be something like 'models/gemini-1.0-pro' or 'models/gemini-pro'
    // We'll try both newer and older naming conventions
    const possibleModelNames = [
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-pro'
    ];
    
    let textModel;
    let workingModelName;
    
    // Try each model name until one works
    for (const modelName of possibleModelNames) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        textModel = genAI.getGenerativeModel({ model: modelName });
        const testResult = await textModel.generateContent('Test');
        workingModelName = modelName;
        console.log(`Success with model: ${modelName}`);
        break;
      } catch (e) {
        console.log(`Failed with model: ${modelName} - ${e.message}`);
      }
    }
    
    if (!textModel) {
      throw new Error('Could not find a working Gemini model');
    }
    
    // Test text model with the working model
    console.log(`\nTesting text model (${workingModelName})...`);
    const textResult = await textModel.generateContent('Hello, can you tell me what API you are?');
    const textResponse = await textResult.response;
    console.log('Text model response:', textResponse.text());
    
    // Test key moments extraction
    console.log('\nTesting key moments extraction...');
    const transcript = `
      Hello everyone, today I'm going to show you how to configure system settings.
      First, let's navigate to the Administration panel and select System Settings from the dropdown menu.
      Now, we need to locate the Security tab and review all current settings. 
      It's important to adjust password policies and access controls as needed for compliance.
      Next, let's navigate to the Performance section and optimize cache settings and database connection parameters based on system load.
      After completing these configurations, run the system diagnostics tool to verify all settings are applied correctly and monitor performance for 24 hours.
    `;
    
    const prompt = `
      Analyze the following transcript of a screen recording tutorial and extract the key moments.
      For each key moment, provide a timestamp (in seconds) and a brief description of what's happening.
      Focus on important actions, steps, or transitions in the tutorial.
      
      Return the result as a JSON array of objects with 'time' (number in seconds) and 'text' (string) properties.
      Example format:
      [
        { "time": 5, "text": "Opening the settings menu" },
        { "time": 15, "text": "Configuring network options" }
      ]
      
      Transcript:
      ${transcript}
    `;
    
    const keyMomentsResult = await textModel.generateContent(prompt);
    const keyMomentsResponse = await keyMomentsResult.response;
    console.log('Key moments extraction response:', keyMomentsResponse.text());
    
    console.log('\nGemini API test completed successfully!');
    
    // Return the working model name so we can update the main service
    return workingModelName;
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    return null;
  }
}

// Run the test
(async () => {
  const workingModel = await testGeminiAPI();
  if (workingModel) {
    console.log(`\nRecommendation: Update your geminiService.js to use model: "${workingModel}"`);
  } else {
    console.log('\nFailed to find a working Gemini model. Check your API key and try again.');
  }
})(); 