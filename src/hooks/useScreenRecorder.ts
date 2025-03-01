import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { RecordingOptions } from '@/lib/types';

interface UseScreenRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => void;
  recordedBlob: Blob | null;
  error: string | null;
  recordingPreview: string | null;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  
  // Store individual streams for cleanup
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  
  // Canvas elements for compositing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoScreenRef = useRef<HTMLVideoElement | null>(null);
  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize canvas and video elements for compositing
  useEffect(() => {
    // Create elements if they don't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      videoScreenRef.current = document.createElement('video');
      videoCameraRef.current = document.createElement('video');
      
      // Set video properties
      videoScreenRef.current.autoplay = true;
      videoScreenRef.current.muted = true;
      videoCameraRef.current.autoplay = true;
      videoCameraRef.current.muted = true;
      
      // Get canvas context
      canvasCtxRef.current = canvasRef.current.getContext('2d');
    }
    
    // Clean up on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);
  
  // Function to draw the picture-in-picture effect
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !canvasCtxRef.current || !videoScreenRef.current) {
      return;
    }
    
    const ctx = canvasCtxRef.current;
    const canvas = canvasRef.current;
    const screenVideo = videoScreenRef.current;
    const cameraVideo = videoCameraRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw screen video as background (only if video is playing)
    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw camera video as circular overlay in bottom left corner
    if (cameraVideo && cameraVideo.readyState >= 2) {
      const size = Math.min(canvas.width, canvas.height) * 0.2; // 20% of the smallest dimension
      const x = 20; // Left padding
      const y = canvas.height - size - 20; // Bottom padding
      
      // Save context state
      ctx.save();
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      
      // Calculate aspect ratio to prevent stretching
      const videoAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;
      
      // Calculate dimensions to maintain aspect ratio
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;
      
      if (videoAspect > 1) {
        // Landscape: limit by height, center horizontally
        drawWidth = size * videoAspect;
        offsetX = (size - drawWidth) / 2;
      } else {
        // Portrait: limit by width, center vertically
        drawHeight = size / videoAspect;
        offsetY = (size - drawHeight) / 2;
      }
      
      // Draw camera feed (centered in the circle to maintain aspect ratio)
      ctx.drawImage(
        cameraVideo, 
        x + offsetX, 
        y + offsetY, 
        drawWidth, 
        drawHeight
      );
      
      // Add border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Restore context state
      ctx.restore();
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
  }, []);
  
  // Start the composition process
  const startComposition = useCallback((screenStream: MediaStream, cameraStream: MediaStream | null) => {
    if (!canvasRef.current || !videoScreenRef.current) {
      console.error("Canvas or video elements not initialized");
      return null;
    }
    
    const canvas = canvasRef.current;
    const screenVideo = videoScreenRef.current;
    const cameraVideo = videoCameraRef.current;
    
    // Set canvas size to match screen resolution
    const screenTrack = screenStream.getVideoTracks()[0];
    const settings = screenTrack.getSettings();
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;
    
    // Set up screen video source
    screenVideo.srcObject = screenStream;
    screenVideo.play().catch(err => console.error("Error playing screen video:", err));
    
    // Set up camera video source if available
    if (cameraStream && cameraVideo) {
      cameraVideo.srcObject = cameraStream;
      cameraVideo.play().catch(err => console.error("Error playing camera video:", err));
    }
    
    // Start drawing immediately while videos load
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
    
    // Get stream from canvas
    const canvasStream = canvas.captureStream(30); // 30 FPS
    canvasStreamRef.current = canvasStream;
    
    console.log("Composition started, created canvas stream with resolution:", canvas.width, "x", canvas.height);
    
    return Promise.resolve(canvasStream);
  }, [drawCanvas]);
  
  const resetState = useCallback(() => {
    setRecordingTime(0);
    setRecordedBlob(null);
    setError(null);
    setRecordingPreview(null);
    chunksRef.current = [];
    isProcessingRef.current = false;
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Cancel animation frame if active
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clean up all streams
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach(track => track.stop());
      canvasStreamRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (recordingPreview) {
      URL.revokeObjectURL(recordingPreview);
    }
    
    // Reset video sources
    if (videoScreenRef.current) {
      videoScreenRef.current.srcObject = null;
    }
    
    if (videoCameraRef.current) {
      videoCameraRef.current.srcObject = null;
    }
  }, [recordingPreview]);
  
  const startRecording = useCallback(async (options: RecordingOptions) => {
    try {
      // If already recording or processing, prevent starting a new recording
      if (isRecording || isProcessingRef.current) {
        console.log("Already recording or processing, ignoring start request");
        return;
      }
      
      // Set processing flag to prevent multiple simultaneous recordings
      isProcessingRef.current = true;
      
      resetState();
      console.log("Starting recording with options:", options);
      
      // Request screen capture if enabled
      if (options.screen) {
        try {
          console.log("Requesting screen access...");
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "monitor",
              frameRate: 30
            },
            audio: options.audio // Include system audio if needed
          });
          
          screenStreamRef.current = displayStream;
          console.log("Screen capture successful with", displayStream.getTracks().length, "tracks");
          
          // Add track ended event listener to stop recording if user stops sharing
          displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log("Screen sharing stopped by user");
            if (isRecording) {
              stopRecording();
            }
          });
        } catch (e) {
          console.error("Failed to get display media:", e);
          toast.error("Screen capture failed. Please try again.");
          isProcessingRef.current = false;
          return;
        }
      }
      
      // Request camera if enabled
      if (options.video) {
        try {
          console.log("Requesting camera access...");
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user" // Front camera
            },
            audio: false
          });
          
          cameraStreamRef.current = videoStream;
          console.log("Camera capture successful with", videoStream.getTracks().length, "tracks");
        } catch (e) {
          console.error("Failed to get video media:", e);
          toast.warning("Camera access failed. Recording without camera.");
        }
      }
      
      // Request audio if enabled - do this separately to ensure it works
      if (options.audio) {
        try {
          console.log("Requesting audio access...");
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          
          audioStreamRef.current = audioStream;
          console.log("Audio capture successful with", audioStream.getTracks().length, "tracks");
        } catch (e) {
          console.error("Failed to get audio media:", e);
          toast.warning("Microphone access failed. Recording without audio.");
        }
      }
      
      // Check if we have screen stream (required)
      if (!screenStreamRef.current) {
        throw new Error("Screen capture is required for recording.");
      }
      
      // Create composite stream with picture-in-picture if camera is available
      console.log("Creating composite stream...");
      let compositeStream: MediaStream | null = null;
      
      try {
        if (cameraStreamRef.current) {
          // Create picture-in-picture effect with canvas
          console.log("Creating composite stream with camera overlay...");
          compositeStream = await startComposition(screenStreamRef.current, cameraStreamRef.current);
        } else {
          // Just use screen stream directly
          compositeStream = screenStreamRef.current;
        }
        
        if (!compositeStream) {
          throw new Error("Failed to create composite stream.");
        }
        
        // Add audio tracks if available
        if (audioStreamRef.current) {
          audioStreamRef.current.getAudioTracks().forEach(track => {
            compositeStream?.addTrack(track);
          });
        }
        
        // Store the final stream
        streamRef.current = compositeStream;
        
        console.log("Final stream created with tracks:", 
          compositeStream.getTracks().map(t => `${t.kind}:${t.label}`).join(', '));
      } catch (e) {
        console.error("Error creating composite stream:", e);
        toast.error("Failed to create recording stream");
        resetState();
        isProcessingRef.current = false;
        return;
      }
      
      // Create media recorder with explicit mime type
      try {
        // Try different mime types for better compatibility
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ];
        
        let mediaRecorder: MediaRecorder | null = null;
        let usedMimeType = '';
        
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            try {
              mediaRecorder = new MediaRecorder(compositeStream, { 
                mimeType,
                audioBitsPerSecond: 128000,
                videoBitsPerSecond: 2500000
              });
              usedMimeType = mimeType;
              console.log("MediaRecorder created with mime type:", mimeType);
              break;
            } catch (e) {
              console.warn(`Failed to create MediaRecorder with mime type ${mimeType}:`, e);
            }
          }
        }
        
        if (!mediaRecorder) {
          // Last resort - try without specifying mime type
          try {
            mediaRecorder = new MediaRecorder(compositeStream);
            console.log("MediaRecorder created with default mime type");
          } catch (e) {
            console.error("Failed to create MediaRecorder with any mime type:", e);
            throw new Error("Recording not supported in this browser");
          }
        }
        
        mediaRecorderRef.current = mediaRecorder;
        
        // Set up event handlers
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          try {
            console.log("MediaRecorder stopped, processing chunks...");
            const chunks = chunksRef.current;
            
            if (chunks.length === 0) {
              setError("No data was recorded");
              isProcessingRef.current = false;
              return;
            }
            
            console.log(`Processing ${chunks.length} chunks with total size ${chunks.reduce((acc, chunk) => acc + chunk.size, 0)} bytes`);
            
            // Create blob from chunks
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/webm' });
            console.log(`Created blob with size ${blob.size} bytes and type ${blob.type}`);
            
            // Create URL for preview
            const url = URL.createObjectURL(blob);
            
            // Update state
            setRecordingPreview(url);
            setRecordedBlob(blob);
            console.log("Recording completed successfully");
            
            // Reset processing flag
            isProcessingRef.current = false;
          } catch (e) {
            console.error("Error processing recording:", e);
            setError("Failed to process recording");
            isProcessingRef.current = false;
          }
        };
        
        // Start recording with 100ms timeslice for frequent ondataavailable events
        mediaRecorder.start(100);
        console.log("MediaRecorder started");
        
        // Start timer
        timerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
        // Update state
        setIsRecording(true);
        isProcessingRef.current = false;
      } catch (error) {
        console.error("Error starting recording:", error);
        setError(error instanceof Error ? error.message : "Failed to start recording");
        resetState();
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(error instanceof Error ? error.message : "Failed to start recording");
      resetState();
      isProcessingRef.current = false;
    }
  }, [isRecording, resetState, startComposition]);
  
  const stopRecording = useCallback(() => {
    try {
      console.log("Stopping recording...");
      
      // Stop the timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop the animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop media recorder if it exists
      if (mediaRecorderRef.current && isRecording) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          console.log("MediaRecorder stopped");
        }
      }
      
      // Update state
      setIsRecording(false);
    } catch (error) {
      console.error("Error stopping recording:", error);
      setError(error instanceof Error ? error.message : "Failed to stop recording");
      setIsRecording(false);
    }
  }, [isRecording]);
  
  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordedBlob,
    error,
    recordingPreview
  };
}
