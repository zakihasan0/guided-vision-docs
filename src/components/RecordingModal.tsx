import { useState, useEffect, useCallback, useRef } from 'react';
import { useScreenRecorder } from '@/hooks/useScreenRecorder';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RecordingOptions } from '@/lib/types';
import { Clock, Mic, Video, Monitor, Loader2, X } from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob) => void;
}

export function RecordingModal({ isOpen, onClose, onRecordingComplete }: RecordingModalProps) {
  const { 
    isRecording, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    recordedBlob, 
    error,
    recordingPreview 
  } = useScreenRecorder();
  
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    audio: true,
    video: false,
    screen: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  
  // Camera preview elements
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  
  // Format recording time as MM:SS
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingTime]);
  
  // Initialize camera preview when video option is enabled
  useEffect(() => {
    const setupCameraPreview = async () => {
      // Clean up any existing camera stream
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      
      // If video is enabled and we're not recording, set up camera preview
      if (recordingOptions.video && !isRecording && !recordedBlob && cameraPreviewRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: "user" // Front camera
            },
            audio: false
          });
          
          cameraPreviewRef.current.srcObject = stream;
          cameraStreamRef.current = stream;
        } catch (e) {
          console.error("Failed to initialize camera preview:", e);
          toast.error("Could not access camera. Please check permissions.");
        }
      }
    };
    
    if (isOpen) {
      setupCameraPreview();
    }
    
    // Clean up camera stream when component unmounts or options change
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [recordingOptions.video, isRecording, recordedBlob, isOpen]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasStartedRecording(false);
      if (isRecording) {
        stopRecording();
      }
      
      // Clean up any blob URLs when the modal closes
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      
      // Clean up camera preview
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
    }
  }, [isOpen, isRecording, stopRecording]);
  
  // Handle recorded blob changes
  useEffect(() => {
    if (recordingPreview && !isRecording && videoRef.current) {
      console.log("Setting video src to", recordingPreview);
      videoRef.current.src = recordingPreview;
    }
  }, [recordingPreview, isRecording]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Recording error:", error);
      toast.error(error);
    }
  }, [error]);
  
  // Handle modal closing
  const handleClose = useCallback(() => {
    if (isRecording) {
      if (window.confirm("Are you sure you want to cancel your recording?")) {
        stopRecording();
        onClose();
      }
    } else {
      onClose();
    }
  }, [isRecording, stopRecording, onClose]);
  
  // Save recording and send to parent component
  const handleSaveRecording = useCallback(() => {
    if (recordedBlob) {
      setIsProcessing(true);
      
      // Log the blob details for debugging
      console.log("Processing recording, mime type:", recordedBlob.type);
      console.log("Blob size:", recordedBlob.size);
      
      // Process the recording
      try {
        console.log("Processing recording, sending to parent component");
        onRecordingComplete(recordedBlob);
        setIsProcessing(false);
        onClose();
        toast.success("Recording processed successfully. Processing for AI analysis...");
      } catch (e) {
        console.error("Error processing recording:", e);
        setIsProcessing(false);
        toast.error("Failed to process recording. Please try again.");
      }
    }
  }, [recordedBlob, onRecordingComplete, onClose]);
  
  // Handle recording options change
  const toggleOption = useCallback((option: keyof RecordingOptions) => {
    setRecordingOptions(prev => {
      const newOptions = { ...prev, [option]: !prev[option] };
      
      // Make sure at least one option is enabled
      if (!newOptions.audio && !newOptions.video && !newOptions.screen) {
        return prev; // Don't allow all options to be disabled
      }
      
      return newOptions;
    });
  }, []);
  
  // Start the recording
  const handleStartRecording = useCallback(async () => {
    console.log("Starting recording with options:", recordingOptions);
    setHasStartedRecording(true);
    
    // Clean up camera preview before starting recording
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    
    await startRecording(recordingOptions);
  }, [startRecording, recordingOptions]);

  // Reset recording state to record again
  const handleRecordAgain = useCallback(() => {
    // Clean up any blob URLs
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
    setRecordingOptions({
      audio: true,
      video: false,
      screen: true
    });
    setHasStartedRecording(false);
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isRecording ? (
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 bg-red-500 rounded-full recording-pulse"></span>
                <span>Recording in progress</span>
              </div>
            ) : recordedBlob ? (
              "Recording completed"
            ) : (
              "Record your process"
            )}
          </DialogTitle>
          <DialogDescription>
            {isRecording 
              ? `Capture and narrate your process - ${formattedTime()}` 
              : recordedBlob 
                ? "Preview your recording before generating documentation" 
                : "Select your recording options and click Start Recording"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          {!isRecording && !recordedBlob && (
            <div className="flex flex-col space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={recordingOptions.screen ? "default" : "outline"} 
                  size="sm"
                  onClick={() => toggleOption('screen')}
                  disabled={isRecording}
                  className="flex items-center gap-2"
                >
                  <Monitor size={16} />
                  <span>Screen</span>
                </Button>
                
                <Button 
                  variant={recordingOptions.video ? "default" : "outline"} 
                  size="sm"
                  onClick={() => toggleOption('video')}
                  disabled={isRecording}
                  className="flex items-center gap-2"
                >
                  <Video size={16} />
                  <span>Camera</span>
                </Button>
                
                <Button 
                  variant={recordingOptions.audio ? "default" : "outline"} 
                  size="sm"
                  onClick={() => toggleOption('audio')}
                  disabled={isRecording}
                  className="flex items-center gap-2"
                >
                  <Mic size={16} />
                  <span>Microphone</span>
                </Button>
              </div>
              
              {/* Camera preview */}
              {recordingOptions.video && (
                <div className="relative overflow-hidden rounded-lg border bg-muted/30 aspect-video">
                  <video 
                    ref={cameraPreviewRef}
                    autoPlay 
                    muted 
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                    Camera Preview
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-secondary rounded-md text-sm text-muted-foreground">
                <p className="font-medium mb-2">Tips for better documentation:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Speak clearly and describe what you're doing</li>
                  <li>Move your cursor to highlight important areas</li>
                  <li>Pause between major steps for clarity</li>
                  <li>Keep recordings under 10 minutes for best results</li>
                </ul>
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg animate-pulse-subtle">
              <div className="text-5xl font-medium mb-4">{formattedTime()}</div>
              <p className="text-muted-foreground text-center max-w-md">
                Narrate each step as you perform it. Speak clearly and take your time.
              </p>
            </div>
          )}
          
          {recordedBlob && !isRecording && (
            <div className="relative overflow-hidden rounded-lg border bg-muted/30">
              <video 
                ref={videoRef}
                controls 
                className="w-full h-auto"
                autoPlay={false}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between items-center">
          {!isRecording && !recordedBlob ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStartRecording} className="gap-2">
                Start Recording
              </Button>
            </>
          ) : isRecording ? (
            <Button 
              variant="destructive" 
              onClick={stopRecording} 
              className="w-full gap-2"
            >
              <X size={16} />
              Stop Recording
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleRecordAgain}>
                Record Again
              </Button>
              <Button 
                onClick={handleSaveRecording} 
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Generate Documentation"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
