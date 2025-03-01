
import { useState, useEffect, useCallback } from 'react';
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
    error 
  } = useScreenRecorder();
  
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    audio: true,
    video: false,
    screen: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  
  // Format recording time as MM:SS
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingTime]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasStartedRecording(false);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen, isRecording, stopRecording]);
  
  // Handle completed recording
  useEffect(() => {
    if (recordedBlob && !isRecording && hasStartedRecording) {
      console.log("Recording completed with blob size:", recordedBlob.size);
      setHasStartedRecording(false);
    }
  }, [recordedBlob, isRecording, hasStartedRecording]);
  
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
  
  // Simulate processing after completing recording
  const handleSaveRecording = useCallback(() => {
    if (recordedBlob) {
      setIsProcessing(true);
      // Simulate processing delay
      setTimeout(() => {
        try {
          console.log("Processing recording, sending to parent component");
          onRecordingComplete(recordedBlob);
          setIsProcessing(false);
          onClose();
        } catch (e) {
          console.error("Error processing recording:", e);
          setIsProcessing(false);
          toast.error("Failed to process recording. Please try again.");
        }
      }, 2000);
    }
  }, [recordedBlob, onRecordingComplete, onClose]);
  
  // Handle recording options change
  const toggleOption = useCallback((option: keyof RecordingOptions) => {
    setRecordingOptions(prev => {
      // If turning off screen capture, enable video
      if (option === 'screen' && prev.screen) {
        return { ...prev, [option]: !prev[option], video: true };
      }
      
      // If turning off video and screen is off, enable screen
      if (option === 'video' && prev.video && !prev.screen) {
        return { ...prev, [option]: !prev[option], screen: true };
      }
      
      // Otherwise just toggle the option
      return { ...prev, [option]: !prev[option] };
    });
  }, []);
  
  // Start the recording
  const handleStartRecording = useCallback(async () => {
    console.log("Starting recording with options:", recordingOptions);
    setHasStartedRecording(true);
    await startRecording(recordingOptions);
  }, [startRecording, recordingOptions]);

  // Reset recording state to record again
  const handleRecordAgain = useCallback(() => {
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
              "Record your screen"
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
                src={URL.createObjectURL(recordedBlob)} 
                controls 
                className="w-full h-auto"
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between items-center">
          {!isRecording && !recordedBlob ? (
            <>
              <Button variant="outline" onClick={handleClose} className="sm:mr-auto">
                Cancel
              </Button>
              <Button 
                onClick={handleStartRecording} 
                disabled={!recordingOptions.audio && !recordingOptions.video && !recordingOptions.screen}
                className="gap-2"
              >
                Start Recording
              </Button>
            </>
          ) : isRecording ? (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
              className="ml-auto gap-2"
            >
              <Clock size={16} />
              Stop Recording
            </Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleRecordAgain} disabled={isProcessing}>
                  Record Again
                </Button>
              </div>
              <Button onClick={handleSaveRecording} disabled={isProcessing} className="gap-2">
                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                {isProcessing ? "Processing..." : "Generate Documentation"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
