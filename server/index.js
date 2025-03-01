import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from './config.js';
import { 
  extractKeyMomentsWithGemini, 
  generateDocumentationWithGemini,
  enhanceStepsWithImageAnalysis,
  transcribeAudioWithGemini
} from './services/geminiService.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const execAsync = promisify(exec);

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, 'uploads');
const framesDir = join(uploadsDir, 'frames');
const audioDir = join(uploadsDir, 'audio');
const mockFramesDir = join(uploadsDir, 'mock-frames');

// Create necessary directories if they don't exist
[uploadsDir, framesDir, audioDir, mockFramesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create mock frame images if they don't exist
const createMockFrames = () => {
  const mockFrames = [
    'mock-frame-1.jpg',
    'mock-frame-2.jpg',
    'mock-frame-3.jpg',
    'mock-frame-4.jpg'
  ];
  
  mockFrames.forEach((frame, index) => {
    const framePath = join(mockFramesDir, frame);
    if (!fs.existsSync(framePath)) {
      // Create a simple HTML file with text
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 640px;
              height: 480px;
              background-color: ${['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc'][index]};
              color: #0c4a6e;
              font-family: Arial, sans-serif;
              font-size: 24px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div>Mock Frame ${index + 1}<br>Step ${index + 1}</div>
        </body>
        </html>
      `;
      
      fs.writeFileSync(framePath, html);
    }
  });
};

// Call the function to create mock frames
createMockFrames();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Initialize Express app
const app = express();
const port = config.PORT;

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
app.get('/', (req, res) => {
  res.send('Guided Vision API is running');
});

// Upload and process recording
app.post('/api/process-recording', upload.single('recording'), async (req, res) => {
  console.log('=== Received recording processing request ===');
  
  try {
    if (!req.file) {
      console.error('Error: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes, path: ${req.file.path}`);
    console.log(`MIME type: ${req.file.mimetype}`);
    
    // Validate the uploaded file
    if (req.file.size === 0) {
      console.error('Error: Uploaded file is empty');
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }
    
    // Check if the file is a valid video
    let videoDuration = 0;
    try {
      console.log('Validating video file...');
      // Use FFmpeg to probe the file and check if it's a valid video
      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(req.file.path, (err, metadata) => {
          if (err) {
            console.error('Error probing video file:', err);
            reject(new Error('Invalid video file'));
            return;
          }
          
          // Check if the file has video streams
          const videoStreams = metadata.streams.filter(stream => stream.codec_type === 'video');
          if (videoStreams.length === 0) {
            console.error('No video streams found in the file');
            reject(new Error('No video content found in the uploaded file'));
            return;
          }
          
          console.log('Video file is valid. Duration:', metadata.format.duration, 'seconds');
          console.log('Video resolution:', videoStreams[0].width, 'x', videoStreams[0].height);
          console.log('Video codec:', videoStreams[0].codec_name);
          
          resolve(metadata);
        });
      });
      
      // Store video duration for later use
      videoDuration = metadata.format.duration;
    } catch (error) {
      console.error('Video validation failed:', error);
      return res.status(400).json({ error: 'Invalid video file', details: error.message });
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate a unique ID for this processing job
    const jobId = uuidv4();
    console.log(`Generated job ID: ${jobId}`);
    
    // Create job directory
    const jobDir = path.join(outputDir, jobId);
    console.log(`Creating job directory: ${jobDir}`);
    fs.mkdirSync(jobDir, { recursive: true });
    
    // Create frames directory
    const jobFramesDir = path.join(jobDir, 'frames');
    console.log(`Creating frames directory: ${jobFramesDir}`);
    fs.mkdirSync(jobFramesDir, { recursive: true });
    
    // Process the video file
    console.log('Starting video processing...');
    
    // 1. Extract audio from video
    console.log('1. Extracting audio from video...');
    const audioPath = path.join(jobDir, 'audio.wav');
    let audioExtracted = false;
    
    try {
      await extractAudio(req.file.path, audioPath);
      console.log(`Audio extracted to: ${audioPath}`);
      audioExtracted = true;
    } catch (error) {
      console.error('Error extracting audio:', error);
      return res.status(500).json({ error: 'Failed to extract audio from video', details: error.message });
    }
    
    // 2. Transcribe audio using Gemini
    console.log('2. Transcribing audio with Gemini...');
    let transcript;
    
    try {
      if (audioExtracted && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
        transcript = await transcribeAudioWithGemini(audioPath);
        console.log('Transcription completed successfully with Gemini');
      } else {
        throw new Error('Audio file not available or empty');
      }
    } catch (error) {
      console.error('Error transcribing audio with Gemini:', error);
      return res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
    }
    
    // Save transcript to file
    fs.writeFileSync(path.join(jobDir, 'transcript.txt'), transcript);
    console.log('Transcript saved to file');
    
    // 3. Extract key moments using Gemini
    console.log('3. Extracting key moments with Gemini...');
    let keyMoments;
    
    try {
      keyMoments = await extractKeyMomentsWithGemini(transcript, videoDuration);
      console.log(`Extracted ${keyMoments.length} key moments`);
      // Save key moments to file
      fs.writeFileSync(path.join(jobDir, 'key_moments.json'), JSON.stringify(keyMoments, null, 2));
    } catch (error) {
      console.error('Error extracting key moments:', error);
      return res.status(500).json({ error: 'Failed to extract key moments', details: error.message });
    }
    
    // 4. Extract frames at key moments
    console.log('4. Extracting frames at key moments...');
    let frameUrls = [];
    let realFramesExtracted = false;
    
    try {
      // Extract frames
      console.log(`Calling extractFramesAtKeyMoments with video path: ${req.file.path}`);
      console.log(`Job frames directory: ${jobFramesDir}`);
      
      frameUrls = await extractFramesAtKeyMoments(req.file.path, jobFramesDir, keyMoments);
      console.log(`Extracted ${frameUrls.length} frames`);
      
      // Check if frames were actually extracted
      if (frameUrls.length > 0) {
        realFramesExtracted = true;
        console.log('Real frames were successfully extracted');
      } else {
        throw new Error('No frames were extracted');
      }
      
      // Save frame URLs to file
      fs.writeFileSync(path.join(jobDir, 'frame_urls.json'), JSON.stringify(frameUrls, null, 2));
    } catch (error) {
      console.error('Error extracting frames:', error);
      return res.status(500).json({ error: 'Failed to extract frames', details: error.message });
    }
    
    // 5. Generate documentation with Gemini
    console.log('5. Generating documentation with Gemini...');
    let documentation;
    
    try {
      documentation = await generateDocumentationWithGemini(transcript, keyMoments);
      console.log('Documentation generated successfully');
    } catch (error) {
      console.error('Error generating documentation:', error);
      return res.status(500).json({ error: 'Failed to generate documentation', details: error.message });
    }
    
    // 6. Enhance steps with image analysis if we have real frames
    console.log('6. Enhancing steps with image analysis...');
    try {
      if (realFramesExtracted) {
        // Convert relative URLs to absolute paths for image analysis
        const absoluteImagePaths = frameUrls.map(url => {
          if (url.startsWith('/')) {
            // Remove leading / and join with the server directory
            return path.join(process.cwd(), url.substring(1));
          }
          return url;
        });
        
        console.log('Image paths for analysis:', absoluteImagePaths);
        
        // Ensure all paths exist
        const validPaths = absoluteImagePaths.filter(path => fs.existsSync(path));
        console.log(`Found ${validPaths.length} valid image paths out of ${absoluteImagePaths.length}`);
        
        if (validPaths.length > 0) {
          // Enhance steps with image analysis
          documentation.steps = await enhanceStepsWithImageAnalysis(validPaths, documentation.steps);
          console.log('Steps enhanced with image analysis');
        } else {
          console.warn('No valid image paths found, skipping image analysis');
        }
      } else {
        console.log('Skipping image analysis because no real frames were extracted');
      }
      
      // Save final documentation to file
      fs.writeFileSync(path.join(jobDir, 'documentation.json'), JSON.stringify(documentation, null, 2));
    } catch (error) {
      console.error('Error enhancing steps with image analysis:', error);
      // Continue without image enhancement if it fails
      console.log('Continuing without image enhancement');
    }
    
    // 7. Format the response
    console.log('7. Formatting the response...');
    const document = {
      id: jobId,
      title: documentation.title || "How to Configure System Settings",
      createdAt: new Date(),
      status: 'completed',
      content: {
        introduction: documentation.introduction,
        steps: documentation.steps.map((step, index) => ({
          id: `step-${Date.now()}-${index + 1}`,
          title: step.title,
          description: step.description,
          imageUrl: index < frameUrls.length ? frameUrls[index] : undefined
        })),
        conclusion: documentation.conclusion
      }
    };
    
    // 8. Return the results
    console.log('=== Processing completed successfully ===');
    res.json(document);
    
  } catch (error) {
    console.error('!!! Unhandled error in process-recording endpoint !!!', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process recording', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper functions

// Extract audio from video
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting audio from ${videoPath} to ${audioPath}`);
    
    // Check if the video file exists
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Video file not found: ${videoPath}`));
    }
    
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le') // Use WAV format for better compatibility
      .audioChannels(1) // Mono audio for better transcription
      .audioFrequency(16000) // 16kHz sample rate for better transcription
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Audio extraction progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`Audio extraction completed: ${audioPath}`);
        // Verify the output file exists
        if (fs.existsSync(audioPath)) {
          resolve();
        } else {
          reject(new Error(`Audio extraction completed but file not found: ${audioPath}`));
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg audio extraction error:', err);
        reject(err);
      })
      .run();
  });
}

// Extract a single frame at a specific timestamp
function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting frame at ${timestamp}s from ${videoPath} to ${outputPath}`);
    
    // Check if the video file exists
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Video file not found: ${videoPath}`));
    }
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720' // Higher resolution for better image analysis
      })
      .on('start', (commandLine) => {
        console.log('FFmpeg frame extraction command:', commandLine);
      })
      .on('end', () => {
        console.log(`Frame extraction completed: ${outputPath}`);
        // Verify the output file exists
        if (fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error(`Frame extraction completed but file not found: ${outputPath}`));
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg frame extraction error:', err);
        reject(err);
      });
  });
}

// Extract frames at specific timestamps using FFmpeg
async function extractFramesAtKeyMoments(videoPath, outputDir, keyMoments) {
  console.log('=== Starting Frame Extraction ===');
  console.log(`Video path: ${videoPath}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Number of key moments: ${keyMoments.length}`);
  
  // Ensure the full path is resolved
  videoPath = path.resolve(videoPath);
  outputDir = path.resolve(outputDir);
  
  console.log(`Resolved video path: ${videoPath}`);
  console.log(`Resolved output directory: ${outputDir}`);
  
  // Verify that the video file exists
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    throw new Error(`Video file not found: ${videoPath}`);
  }
  
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  
  // Verify the video file is valid
  try {
    const metadataPromise = new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('FFprobe error:', err);
          reject(new Error(`FFprobe error: ${err.message}`));
          return;
        }
        resolve(metadata);
      });
    });
    
    const metadata = await metadataPromise;
    const videoDuration = metadata.format.duration;
    const videoStreams = metadata.streams.filter(stream => stream.codec_type === 'video');
    
    if (videoStreams.length === 0) {
      throw new Error('No video streams found in the file');
    }
    
    console.log(`Video validation successful. Duration: ${videoDuration}s, Resolution: ${videoStreams[0].width}x${videoStreams[0].height}`);
    
    // Prepare frame paths
    const frameUrls = [];
    
    // Extract a preview frame to verify video can be processed
    const previewFramePath = path.join(outputDir, 'preview.jpg');
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [0], // Extract first frame
          filename: 'preview.jpg',
          folder: outputDir,
          size: '640x?'
        })
        .on('start', (commandLine) => {
          console.log('FFmpeg preview frame command:', commandLine);
        })
        .on('end', () => {
          console.log(`Preview frame extracted to: ${previewFramePath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error extracting preview frame:', err);
          reject(err);
        });
    });
    
    // Verify preview frame was created
    if (!fs.existsSync(previewFramePath)) {
      throw new Error('Failed to extract preview frame, FFmpeg may not be working correctly');
    }
    
    console.log(`Preview frame exists: ${fs.existsSync(previewFramePath)}, size: ${fs.statSync(previewFramePath).size} bytes`);
    
    // Extract frames at key moments
    console.log(`Extracting frames at ${keyMoments.length} key moments`);
    
    for (let i = 0; i < keyMoments.length; i++) {
      const moment = keyMoments[i];
      const timestamp = moment.time;
      
      // Create a unique filename
      const frameFileName = `keyframe-${i + 1}.jpg`;
      const framePath = path.join(outputDir, frameFileName);
      
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: [timestamp],
              filename: frameFileName,
              folder: outputDir,
              size: '1280x720' // Higher resolution for better image analysis
            })
            .on('start', (commandLine) => {
              console.log(`FFmpeg frame extraction command for moment ${i + 1}:`, commandLine);
            })
            .on('end', () => {
              console.log(`Extracted frame at ${timestamp}s to: ${framePath}`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`Error extracting frame at ${timestamp}s:`, err);
              reject(err);
            });
        });
        
        // Check if the frame was successfully extracted
        if (fs.existsSync(framePath) && fs.statSync(framePath).size > 0) {
          console.log(`Frame file exists: ${framePath}, size: ${fs.statSync(framePath).size} bytes`);
          
          // Create URL path for the client
          const frameUrl = `/output/${path.basename(path.dirname(framePath))}/frames/${frameFileName}`;
          console.log(`Created URL for frame: ${frameUrl}`);
          
          frameUrls.push(frameUrl);
        } else {
          console.warn(`Frame file not found or empty: ${framePath}`);
          throw new Error(`Failed to extract frame at ${timestamp}s`);
        }
      } catch (error) {
        console.error(`Error extracting frame at ${timestamp}s:`, error);
        throw new Error(`Failed to extract frame at ${timestamp}s: ${error.message}`);
      }
    }
    
    // Make output directory accessible via static route
    app.use('/output', express.static(path.join(process.cwd(), 'output')));
    
    console.log(`Successfully extracted ${frameUrls.length} frames`);
    return frameUrls;
    
  } catch (error) {
    console.error('Error in extractFramesAtKeyMoments:', error);
    throw new Error(`Frame extraction failed: ${error.message}`);
  }
}

// Transcribe audio using Gemini
async function transcribeAudio(audioPath) {
  // Check if the audio file exists
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  
  // Check file size
  const stats = fs.statSync(audioPath);
  console.log(`Audio file size: ${stats.size} bytes`);
  
  if (stats.size === 0) {
    throw new Error('Audio file is empty');
  }
  
  // Use Gemini for transcription
  console.log('Using Gemini for audio transcription');
  return transcribeAudioWithGemini(audioPath);
}

// Start the server
app.listen(port, () => {
  console.log(`Guided Vision API server running on port ${port}`);
}); 