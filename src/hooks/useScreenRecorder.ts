
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface RecordingOptions {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

interface UseScreenRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => void;
  recordedBlob: Blob | null;
  error: string | null;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  
  const resetState = useCallback(() => {
    setRecordingTime(0);
    setRecordedBlob(null);
    setError(null);
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
  }, []);
  
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
      
      // Request necessary permissions
      let stream: MediaStream | null = null;
      
      if (options.screen) {
        try {
          console.log("Requesting screen access...");
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
              cursor: "always",
              displaySurface: "monitor"
            },
            audio: options.audio
          });
          
          if (options.audio && !displayStream.getAudioTracks().length) {
            // If audio wasn't captured with the screen, try to get it separately
            try {
              console.log("Screen capture successful, requesting audio separately...");
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const tracks = [...displayStream.getTracks(), ...audioStream.getTracks()];
              stream = new MediaStream(tracks);
              console.log("Combined stream created with", stream.getTracks().length, "tracks");
            } catch (e) {
              console.warn("Could not capture audio: ", e);
              stream = displayStream; // Continue without audio
              toast.warning("Audio couldn't be captured. Recording screen only.");
            }
          } else {
            stream = displayStream;
            console.log("Screen capture successful, audio tracks:", displayStream.getAudioTracks().length);
          }
        } catch (e) {
          console.error("Failed to get display media:", e);
          toast.error("Screen capture failed. Please try again.");
          isProcessingRef.current = false;
          return;
        }
      } else if (options.video) {
        try {
          console.log("Requesting camera access...");
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          
          if (options.audio) {
            try {
              console.log("Camera capture successful, requesting audio...");
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const tracks = [...videoStream.getTracks(), ...audioStream.getTracks()];
              stream = new MediaStream(tracks);
              console.log("Combined video+audio stream created with", stream.getTracks().length, "tracks");
            } catch (e) {
              console.warn("Could not capture audio: ", e);
              stream = videoStream;
              toast.warning("Audio couldn't be captured. Recording video only.");
            }
          } else {
            stream = videoStream;
            console.log("Camera capture successful");
          }
        } catch (e) {
          console.error("Failed to get video media:", e);
          toast.error("Camera access failed. Please try again.");
          isProcessingRef.current = false;
          return;
        }
      } else if (options.audio) {
        try {
          console.log("Requesting audio only...");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("Audio capture successful");
        } catch (e) {
          console.error("Failed to get audio media:", e);
          toast.error("Microphone access failed. Please try again.");
          isProcessingRef.current = false;
          return;
        }
      } else {
        throw new Error("At least one recording option must be enabled");
      }
      
      if (!stream) {
        throw new Error("Failed to create media stream");
      }
      
      streamRef.current = stream;
      
      // Create media recorder with explicit mime type
      const mimeType = 'video/webm;codecs=vp9';
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        console.log("MediaRecorder created with mime type:", mimeType);
      } catch (e) {
        console.warn("Failed to create MediaRecorder with specified mime type, falling back to default");
        mediaRecorder = new MediaRecorder(stream);
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
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          console.log("Created final blob of size:", blob.size);
          setRecordedBlob(blob);
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
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
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
  }, [resetState]);
  
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
    error
  };
}
