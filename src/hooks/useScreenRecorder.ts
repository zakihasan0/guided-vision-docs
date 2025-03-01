
import { useState, useCallback, useRef } from 'react';
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
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  
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
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (recordingPreview) {
      URL.revokeObjectURL(recordingPreview);
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
      
      // Initialize streams array to combine multiple streams if needed
      const streamsToMerge: MediaStream[] = [];
      
      // Request screen capture if enabled
      if (options.screen) {
        try {
          console.log("Requesting screen access...");
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "monitor"
            },
            // Don't request audio here, we'll handle it separately
            audio: false
          });
          
          streamsToMerge.push(displayStream);
          console.log("Screen capture successful with", displayStream.getTracks().length, "tracks");
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
            video: true,
            // Don't request audio here, we'll handle it separately
            audio: false
          });
          
          streamsToMerge.push(videoStream);
          console.log("Camera capture successful with", videoStream.getTracks().length, "tracks");
        } catch (e) {
          console.error("Failed to get video media:", e);
          toast.error("Camera access failed. Please try again.");
          
          // Don't return here - we can still record without camera
          if (streamsToMerge.length === 0 && !options.audio) {
            // Cleanup and exit if no other streams are available
            streamsToMerge.forEach(stream => {
              stream.getTracks().forEach(track => track.stop());
            });
            isProcessingRef.current = false;
            return;
          }
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
          
          streamsToMerge.push(audioStream);
          console.log("Audio capture successful with", audioStream.getTracks().length, "tracks");
        } catch (e) {
          console.error("Failed to get audio media:", e);
          toast.warning("Microphone access failed. Recording without audio.");
          
          // Don't return here - we can still record without audio
          if (streamsToMerge.length === 0) {
            // Cleanup and exit if no other streams are available
            isProcessingRef.current = false;
            return;
          }
        }
      }
      
      // Check if we have any streams to record
      if (streamsToMerge.length === 0) {
        throw new Error("No media sources were captured. Please enable at least one recording option.");
      }
      
      // Combine all tracks from different streams
      const allTracks: MediaStreamTrack[] = [];
      streamsToMerge.forEach(stream => {
        stream.getTracks().forEach(track => {
          allTracks.push(track);
        });
      });
      
      // Create a combined stream with all tracks
      const combinedStream = new MediaStream(allTracks);
      streamRef.current = combinedStream;
      
      console.log("Combined stream created with tracks:", 
        combinedStream.getTracks().map(t => `${t.kind}:${t.label}`).join(', '));
      
      // Create media recorder with explicit mime type
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
            mediaRecorder = new MediaRecorder(combinedStream, { 
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
          mediaRecorder = new MediaRecorder(combinedStream);
          console.log("MediaRecorder created with default mime type");
        } catch (e) {
          console.error("Failed to create MediaRecorder with any mime type:", e);
          toast.error("Recording not supported in this browser");
          resetState();
          isProcessingRef.current = false;
          return;
        }
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("Received data chunk of size:", event.data.size);
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, chunks collected:", chunksRef.current.length);
        if (chunksRef.current.length > 0) {
          // Use the same mime type that was used for recording
          const blob = new Blob(chunksRef.current, { type: usedMimeType || 'video/webm' });
          console.log("Created final blob of size:", blob.size, "type:", blob.type);
          setRecordedBlob(blob);
          
          // Create a URL for the recorded blob
          const blobUrl = URL.createObjectURL(blob);
          setRecordingPreview(blobUrl);
        } else {
          console.error("No data chunks collected during recording");
          toast.error("Recording failed - no data was captured");
        }
        
        setIsRecording(false);
        
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log("Stopping track:", track.kind, track.label);
            track.stop();
          });
          streamRef.current = null;
        }
        
        isProcessingRef.current = false;
      };
      
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Recording error occurred");
        stopRecording();
      };
      
      // Start recording with smaller data chunks for better reliability
      mediaRecorder.start(500); // Collect data every 500ms
      console.log("MediaRecorder started");
      setIsRecording(true);
      
      // Update timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      
      isProcessingRef.current = false;
    } catch (err) {
      console.error("Error starting recording:", err);
      resetState();
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to start recording. Please check permissions and try again.");
      isProcessingRef.current = false;
    }
  }, [resetState, isRecording]);
  
  const stopRecording = useCallback(() => {
    console.log("Stopping recording, current state:", { 
      isRecording, 
      hasMediaRecorder: !!mediaRecorderRef.current, 
      hasStream: !!streamRef.current 
    });
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        console.log("MediaRecorder stopped successfully");
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
        // Clean up even if there's an error
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        isProcessingRef.current = false;
      }
    } else {
      // If there's no media recorder or it's already inactive, clean up manually
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      isProcessingRef.current = false;
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
