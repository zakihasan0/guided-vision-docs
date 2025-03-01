
export interface Document {
  id: string;
  title: string;
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed';
  content?: DocumentContent;
}

export interface DocumentContent {
  introduction: string;
  steps: DocumentStep[];
  conclusion?: string;
}

export interface DocumentStep {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface RecordingOptions {
  audio: boolean;
  video: boolean;
  screen: boolean;
}
