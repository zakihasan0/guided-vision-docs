import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config.js';
import fs from 'fs';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Configure safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Available Gemini models
const MODELS = {
  TEXT: "gemini-1.5-pro",
  VISION: "gemini-1.5-pro"
};

/**
 * Transcribe audio using Gemini
 * @param {string} audioPath - Path to the audio file
 * @returns {string} Transcribed text
 */
export async function transcribeAudioWithGemini(audioPath) {
  try {
    console.log('Initializing Gemini model for audio transcription...');
    const model = genAI.getGenerativeModel({ 
      model: MODELS.VISION,
      safetySettings
    });

    // Read the audio file
    console.log(`Reading audio file: ${audioPath}`);
    const audioData = fs.readFileSync(audioPath);
    const audioBase64 = audioData.toString('base64');

    // Create the prompt for audio transcription
    const prompt = `
      Please transcribe the following audio file. 
      This is a recording of a tutorial or instructional content.
      Provide a detailed and accurate transcription of all spoken content.
      Focus on capturing all instructions, steps, and explanations clearly.
    `;

    console.log('Sending audio to Gemini for transcription...');
    // Generate content with audio
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/wav',
          data: audioBase64
        }
      }
    ]);
    
    const response = await result.response;
    const transcription = response.text();
    console.log('Received transcription from Gemini');
    
    return transcription.trim();
  } catch (error) {
    console.error("Error transcribing audio with Gemini:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Extract key moments from a transcript using Gemini Pro
 * @param {string} transcript - The transcript text
 * @param {number} videoDuration - The duration of the video in seconds
 * @returns {Array} Array of key moments with time and text
 */
export async function extractKeyMomentsWithGemini(transcript, videoDuration = 60) {
  try {
    console.log('Initializing Gemini model for key moments extraction...');
    const model = genAI.getGenerativeModel({ 
      model: MODELS.TEXT,
      safetySettings
    });

    // Create the prompt for extracting key moments
    const prompt = `
      Analyze the following transcript of a screen recording tutorial and extract the key moments.
      The video has a total duration of ${videoDuration} seconds.
      
      For each key moment, provide:
      1. A timestamp (in seconds) that best represents when this moment occurs in the video
      2. A brief description of what's happening at that moment
      
      Important guidelines:
      - Identify 4-8 distinct key moments that represent the main steps or actions in the tutorial
      - Ensure timestamps are evenly distributed throughout the video duration (0 to ${videoDuration} seconds)
      - Focus on important actions, transitions, or explanations in the tutorial
      - Make sure each timestamp is a number between 0 and ${videoDuration}
      
      Return the result as a JSON array of objects with 'time' (number in seconds) and 'text' (string) properties.
      Example format:
      [
        { "time": 5, "text": "Opening the settings menu" },
        { "time": 15, "text": "Configuring network options" }
      ]
      
      Transcript:
      ${transcript}
    `;

    console.log('Sending prompt to Gemini for key moments extraction...');
    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Received response from Gemini for key moments extraction');
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      try {
        const keyMoments = JSON.parse(jsonStr);
        console.log(`Successfully parsed ${keyMoments.length} key moments from Gemini response`);
        
        // Validate and normalize timestamps
        const normalizedKeyMoments = keyMoments.map(moment => {
          // Ensure time is a number
          let time = parseFloat(moment.time);
          if (isNaN(time)) {
            // If time is not a number, generate a random time
            time = Math.random() * videoDuration;
          }
          
          // Clamp time to video duration
          time = Math.min(Math.max(time, 0), videoDuration - 0.1);
          
          return {
            time: time,
            text: moment.text
          };
        });
        
        // Sort by timestamp
        normalizedKeyMoments.sort((a, b) => a.time - b.time);
        
        // Ensure we have at least 4 key moments
        if (normalizedKeyMoments.length < 4) {
          console.log(`Only ${normalizedKeyMoments.length} key moments found, adding moments to reach 4`);
          
          // Calculate how many moments to add
          const momentsToAdd = 4 - normalizedKeyMoments.length;
          
          // Calculate evenly spaced timestamps
          for (let i = 0; i < momentsToAdd; i++) {
            const time = (i + 1) * (videoDuration / (momentsToAdd + 1));
            normalizedKeyMoments.push({
              time: time,
              text: `Key moment at ${Math.round(time)} seconds`
            });
          }
          
          // Sort again after adding new moments
          normalizedKeyMoments.sort((a, b) => a.time - b.time);
        }
        
        return normalizedKeyMoments;
      } catch (parseError) {
        console.error("Error parsing JSON from Gemini response:", parseError);
        console.log("Raw response text:", text);
        throw new Error("Failed to parse key moments from Gemini response");
      }
    } else {
      console.error("Failed to extract JSON from Gemini response");
      console.log("Raw response text:", text);
      throw new Error("Failed to extract key moments from Gemini response");
    }
  } catch (error) {
    console.error("Error extracting key moments with Gemini:", error);
    throw new Error(`Failed to extract key moments: ${error.message}`);
  }
}

/**
 * Generate documentation based on transcript and key moments using Gemini Pro
 * @param {string} transcript - The transcript text
 * @param {Array} keyMoments - Array of key moments with time and text
 * @returns {Object} Documentation object with introduction, steps, and conclusion
 */
export async function generateDocumentationWithGemini(transcript, keyMoments) {
  try {
    console.log('Initializing Gemini model for documentation generation...');
    const model = genAI.getGenerativeModel({ 
      model: MODELS.TEXT,
      safetySettings
    });

    // Format key moments for the prompt
    const formattedKeyMoments = keyMoments.map(moment => 
      `- At ${moment.time} seconds: ${moment.text}`
    ).join('\n');

    // Create the prompt for generating documentation
    const prompt = `
      Create comprehensive documentation based on the following transcript and key moments from a tutorial.
      
      Transcript:
      ${transcript}
      
      Key Moments:
      ${formattedKeyMoments}
      
      Generate documentation with the following structure:
      1. Introduction: A brief overview of what the tutorial covers and why it's important
      2. Steps: Detailed instructions for each key moment, with clear titles and descriptions
      3. Conclusion: A summary of what was accomplished and any next steps or best practices
      
      Return the result as a JSON object with the following structure:
      {
        "title": "How to [Main Topic of Tutorial]",
        "introduction": "string",
        "steps": [
          {
            "title": "string",
            "description": "string"
          }
        ],
        "conclusion": "string"
      }
      
      Make the documentation clear, professional, and easy to follow.
    `;

    console.log('Sending prompt to Gemini for documentation generation...');
    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Received response from Gemini for documentation generation');
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      try {
        const documentation = JSON.parse(jsonStr);
        console.log('Successfully parsed documentation from Gemini response');
        return documentation;
      } catch (parseError) {
        console.error("Error parsing JSON from Gemini response:", parseError);
        console.log("Raw response text:", text);
        // Return default documentation as fallback
        return createDefaultDocumentation(keyMoments);
      }
    } else {
      console.error("Failed to extract JSON from Gemini response");
      console.log("Raw response text:", text);
      // Return default documentation as fallback
      return createDefaultDocumentation(keyMoments);
    }
  } catch (error) {
    console.error("Error generating documentation with Gemini:", error);
    // Return default documentation as fallback
    return createDefaultDocumentation(keyMoments);
  }
}

/**
 * Enhance documentation steps with image analysis using Gemini Vision
 * @param {Array} imagePaths - Array of paths to images
 * @param {Array} steps - Array of documentation steps
 * @returns {Array} Enhanced steps with image analysis
 */
export async function enhanceStepsWithImageAnalysis(imagePaths, steps) {
  try {
    console.log('Initializing Gemini Vision model for image analysis...');
    const model = genAI.getGenerativeModel({ 
      model: MODELS.VISION,
      safetySettings
    });

    // Create a mapping between steps and images
    const enhancedSteps = [...steps];
    
    // Process each image and enhance the corresponding step
    for (let i = 0; i < Math.min(imagePaths.length, steps.length); i++) {
      const imagePath = imagePaths[i];
      const step = enhancedSteps[i];
      
      try {
        // Read the image file
        console.log(`Reading image file: ${imagePath}`);
        let imageData;
        try {
          imageData = fs.readFileSync(imagePath);
        } catch (fileError) {
          console.error(`Error reading image file ${imagePath}:`, fileError);
          continue; // Skip this image if we can't read it
        }
        
        // Convert image to base64
        const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const imageBase64 = imageData.toString('base64');
        
        // Create the prompt for image analysis
        const prompt = `
          Analyze this screenshot from a tutorial. The image corresponds to the step: "${step.title}".
          
          Describe what you see in the image that's relevant to this step. Focus on:
          1. UI elements visible (buttons, menus, dialogs)
          2. Any text content that's legible and important
          3. The state of the application or system shown
          
          Then, enhance the existing step description with these details.
          
          Current step description: "${step.description}"
          
          Return ONLY the enhanced description text, nothing else.
        `;
        
        console.log(`Analyzing image for step ${i+1}: ${step.title}`);
        // Generate content with image
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          }
        ]);
        
        const response = await result.response;
        const enhancedDescription = response.text();
        console.log(`Successfully analyzed image for step ${i+1}`);
        
        // Update the step description with the enhanced version
        if (enhancedDescription && enhancedDescription.trim().length > 0) {
          enhancedSteps[i].description = enhancedDescription.trim();
        }
      } catch (imageError) {
        console.error(`Error analyzing image ${i+1}:`, imageError);
        // Continue with the next image if there's an error
      }
    }
    
    return enhancedSteps;
  } catch (error) {
    console.error("Error enhancing steps with image analysis:", error);
    // Return the original steps if there's an error
    return steps;
  }
}

/**
 * Create default documentation as a fallback
 * @param {Array} keyMoments - Array of key moments
 * @returns {Object} Default documentation
 */
function createDefaultDocumentation(keyMoments) {
  return {
    title: "How to Configure System Settings",
    introduction: "This tutorial guides you through the process of configuring system settings, focusing on security and performance optimizations. Proper configuration ensures your system operates securely and efficiently.",
    steps: keyMoments.map(moment => ({
      title: moment.text,
      description: `${moment.text}. This step is essential for ensuring proper system configuration.`
    })),
    conclusion: "By following these steps, you've successfully configured the system settings. Remember to regularly review and update these configurations to maintain optimal security and performance."
  };
} 