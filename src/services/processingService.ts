import { toast } from 'sonner';
import { Document, DocumentContent, DocumentStep } from '@/lib/types';
import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:3001';

// Main processing function that sends the recording to the backend
export async function processRecording(recordingBlob: Blob): Promise<Document> {
  try {
    // Step 1: Generate a unique document ID
    const docId = `doc-${Date.now()}`;
    
    // Step 2: Create initial processing document
    const initialDoc: Document = {
      id: docId,
      title: "Processing System Configuration Guide",
      createdAt: new Date(),
      status: 'processing'
    };
    
    // Step 3: Create a FormData object to send the recording
    const formData = new FormData();
    formData.append('recording', recordingBlob, 'recording.webm');
    
    // Step 4: Send the recording to the backend for processing
    toast.info("Uploading recording...");
    
    const response = await axios.post(`${API_BASE_URL}/api/process-recording`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
          
          if (percentCompleted === 100) {
            toast.info("Processing recording...");
          }
        }
      }
    });
    
    // Step 5: Return the completed document
    const completedDoc: Document = {
      ...initialDoc,
      ...response.data,
      createdAt: new Date(response.data.createdAt) // Convert date string back to Date object
    };
    
    return completedDoc;
  } catch (error) {
    console.error("Error processing recording:", error);
    throw new Error("Failed to process recording. Please try again.");
  }
}

// Client-side fallback functions for development or if backend is unavailable

// Function to extract audio from video blob
async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  console.log("Extracting audio from video blob:", videoBlob.size);
  
  // In a production environment, this would be done server-side
  // For this implementation, we'll simulate the extraction
  // In a real implementation, you would use ffmpeg.wasm or a server-side API
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For now, we'll just return the original blob
  // In a real implementation, this would be an audio-only blob
  return videoBlob;
}

// Function to transcribe audio using Whisper API
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log("Transcribing audio from blob:", audioBlob.size);
  
  // In a production environment, this would call the OpenAI Whisper API
  // For this implementation, we'll simulate the API call
  
  // Create a FormData object to send to the API
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock transcription
    return `
      Hello everyone, today I'm going to show you how to configure system settings.
      First, let's navigate to the Administration panel and select System Settings from the dropdown menu.
      Now, we need to locate the Security tab and review all current settings. 
      It's important to adjust password policies and access controls as needed for compliance.
      Next, let's navigate to the Performance section and optimize cache settings and database connection parameters based on system load.
      After completing these configurations, run the system diagnostics tool to verify all settings are applied correctly and monitor performance for 24 hours.
    `;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio. Please try again.");
  }
}

// Function to analyze transcript and extract key moments using AI
async function extractKeyMoments(transcription: string): Promise<Array<{time: number, text: string}>> {
  console.log("Extracting key moments from transcription");
  
  // In a production environment, this would call an LLM API (like GPT-4)
  // For this implementation, we'll simulate the API call
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock key moments
    return [
      { time: 5, text: "Navigate to the Administration panel and select System Settings" },
      { time: 15, text: "Locate the Security tab and review all current settings" },
      { time: 25, text: "Navigate to the Performance section and optimize cache settings" },
      { time: 35, text: "Run the system diagnostics tool to verify all settings" }
    ];
  } catch (error) {
    console.error("Error extracting key moments:", error);
    throw new Error("Failed to analyze transcript. Please try again.");
  }
}

// Function to extract frames from video at specific timestamps
async function extractFramesFromVideo(videoBlob: Blob, timestamps: number[]): Promise<string[]> {
  console.log("Extracting frames from video at timestamps:", timestamps);
  
  // In a production environment, this would use OpenCV or ffmpeg
  // For this implementation, we'll simulate the extraction
  
  try {
    // Create a video element to extract frames
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoBlob);
    
    // Wait for video metadata to load
    await new Promise<void>((resolve, reject) => {
      videoElement.onloadedmetadata = () => resolve();
      videoElement.onerror = () => reject(new Error("Failed to load video"));
      videoElement.load();
    });
    
    // Extract frames at each timestamp
    const frames: string[] = [];
    
    for (const timestamp of timestamps) {
      // Seek to the timestamp
      videoElement.currentTime = timestamp;
      
      // Wait for the video to seek
      await new Promise<void>(resolve => {
        videoElement.onseeked = () => resolve();
      });
      
      // Create a canvas to draw the frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw the frame to the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        frames.push(dataUrl);
      }
    }
    
    // Clean up
    URL.revokeObjectURL(videoElement.src);
    
    // If we couldn't extract frames, use mock images
    if (frames.length === 0) {
      return [
        'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?q=80&w=1000&auto=format&fit=crop'
      ];
    }
    
    return frames;
  } catch (error) {
    console.error("Error extracting frames:", error);
    
    // Return mock images as fallback
    return [
      'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?q=80&w=1000&auto=format&fit=crop'
    ];
  }
}

// Function to generate final documentation from transcription and frames
async function generateDocumentation(
  transcription: string, 
  keyMoments: Array<{time: number, text: string}>, 
  frames: string[]
): Promise<DocumentContent> {
  console.log("Generating documentation from transcription and frames");
  
  // In a production environment, this would call an LLM API (like GPT-4)
  // For this implementation, we'll simulate the API call
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create steps from key moments and frames
    const steps: DocumentStep[] = keyMoments.map((moment, index) => ({
      id: `step-${Date.now()}-${index + 1}`,
      title: moment.text,
      description: `At timestamp ${moment.time} seconds, the user demonstrated how to ${moment.text.toLowerCase()}. This is an important step in the configuration process.`,
      imageUrl: frames[index] || undefined
    }));
    
    // Return document content
    return {
      introduction: "This guide covers the system configuration process for administrators to optimize performance and security. Follow these steps carefully to ensure proper system setup.",
      steps,
      conclusion: "After completing these configurations, run the system diagnostics tool to verify all settings are applied correctly and monitor performance for 24 hours."
    };
  } catch (error) {
    console.error("Error generating documentation:", error);
    throw new Error("Failed to generate documentation. Please try again.");
  }
}

// Fallback processing function for client-side processing
export async function processRecordingClientSide(recordingBlob: Blob): Promise<Document> {
  try {
    // Step 1: Generate a unique document ID
    const docId = `doc-${Date.now()}`;
    
    // Step 2: Create initial processing document
    const initialDoc: Document = {
      id: docId,
      title: "Processing System Configuration Guide",
      createdAt: new Date(),
      status: 'processing'
    };
    
    // Step 3: Extract audio from video
    toast.info("Extracting audio...");
    const audioBlob = await extractAudioFromVideo(recordingBlob);
    
    // Step 4: Transcribe audio
    toast.info("Transcribing audio...");
    const transcription = await transcribeAudio(audioBlob);
    
    // Step 5: Extract key moments from transcription
    toast.info("Analyzing content...");
    const keyMoments = await extractKeyMoments(transcription);
    
    // Step 6: Extract frames from video at key moments
    toast.info("Extracting key frames...");
    const timestamps = keyMoments.map(moment => moment.time);
    const frames = await extractFramesFromVideo(recordingBlob, timestamps);
    
    // Step 7: Generate final documentation
    toast.info("Generating documentation...");
    const content = await generateDocumentation(transcription, keyMoments, frames);
    
    // Step 8: Return the completed document
    const completedDoc: Document = {
      ...initialDoc,
      status: 'completed',
      title: "How to Configure System Settings",
      content
    };
    
    return completedDoc;
  } catch (error) {
    console.error("Error processing recording:", error);
    throw new Error("Failed to process recording. Please try again.");
  }
}
