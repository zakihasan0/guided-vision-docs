# How2 Documentation Platform

An AI-powered documentation tool that converts screen recordings (with voice explanations) into structured process documentation. Useful for creating step-by-step guides for internal procedures or user-facing instructions.

## Features

- **Screen Recording**: Capture screen, webcam, and audio in one shot
- **Automated Transcription**: Transcribes audio to text using AI
- **AI-Powered Formatting**: Transforms raw text into a step-by-step guide
- **Screenshot Extraction**: Grabs relevant frames from the video to embed as illustrations
- **Simple Web UI**: Upload recordings, generate docs, and view/share them

## Technical Architecture

### Frontend

- React with TypeScript
- Shadcn UI components
- MediaRecorder API for screen/camera/audio capture
- Axios for API communication

### Backend

- Node.js with Express
- FFmpeg for audio extraction and frame capture
- Google Gemini API for AI features (transcription and document generation)
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- FFmpeg installed on your system (for backend processing)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/guided-vision-docs.git
   cd guided-vision-docs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up server configuration:
   - Copy `server/config.template.js` to `server/config.js`
   - Update `GEMINI_API_KEY` in the config file with your actual Google Gemini API key
   ```
   cp server/config.template.js server/config.js
   ```

4. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Application

1. Start the development server and backend:
   ```
   npm run dev:full
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Usage

1. Click "Record New Process" to start a new recording
2. Select which inputs to record (screen, camera, microphone)
3. Click "Start Recording" and perform the process you want to document
4. Narrate your actions clearly as you perform them
5. Click "Stop Recording" when finished
6. Preview your recording and click "Generate Documentation"
7. The system will process your recording and generate a structured document
8. View and share your documentation from the main dashboard

## Development Workflow

### Frontend

The frontend is built with React and uses the following key components:

- `RecordingModal.tsx`: Handles the recording UI and options
- `useScreenRecorder.ts`: Custom hook for managing media recording
- `processingService.ts`: Service for sending recordings to the backend
- `DocumentViewer.tsx`: Displays the generated documentation

### Backend

The backend server handles:

- Receiving video recordings
- Extracting audio using FFmpeg
- Transcribing audio with OpenAI Whisper
- Analyzing transcripts with OpenAI GPT
- Extracting key frames from the video
- Generating structured documentation
- Returning the completed document to the frontend

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI APIs
- Shadcn UI for the component library
- The MediaRecorder API for making browser recording possible
