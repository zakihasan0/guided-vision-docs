
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
  
  const resetState = useCallback(() => {
    setRecordingTime(0);
    setRecordedBlob(null);
    setError(null);
    chunksRef.current = [];
    
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
      resetState();
      
      // Request necessary permissions
      let stream: MediaStream;
      
      if (options.screen) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: options.audio
        });
        
        if (options.audio && !displayStream.getAudioTracks().length) {
          // If audio wasn't captured with the screen, try to get it separately
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const tracks = [...displayStream.getTracks(), ...audioStream.getTracks()];
            stream = new MediaStream(tracks);
          } catch (e) {
            console.warn("Could not capture audio: ", e);
            stream = displayStream; // Continue without audio
            toast.warning("Audio couldn't be captured. Recording screen only.");
          }
        } else {
          stream = displayStream;
        }
      } else if (options.video) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: options.audio
        });
      } else if (options.audio) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        throw new Error("At least one recording option must be enabled");
      }
      
      streamRef.current = stream;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Update timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      resetState();
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to start recording. Please check permissions and try again.");
    }
  }, [resetState]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
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
