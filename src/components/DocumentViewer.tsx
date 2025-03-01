
import { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Share2, ArrowLeft, Download, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

interface DocumentViewerProps {
  document: Document;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Handle go back
  const handleGoBack = () => {
    navigate('/');
  };
  
  // Handle document sharing
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: `Check out this document: ${document.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast.error("Couldn't share the document");
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };
  
  // Simulate document download
  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      toast.success('Document downloaded successfully');
    }, 1500);
  };
  
  // Handle document printing
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto mb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="gap-2"
        >
          <ArrowLeft size={16} />
          Back to documents
        </Button>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 size={16} />
            Share
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>
      
      <div className="print:mt-0">
        <div className="text-left mb-8">
          <h1 className="text-4xl font-semibold tracking-tight mb-4">{document.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">
            {document.content?.introduction || "No introduction available"}
          </p>
          <Separator className="mb-8" />
        </div>
        
        {document.content?.steps.map((step, index) => (
          <Card key={step.id} className="mb-8 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium">
                  {index + 1}
                </div>
                <h3 className="text-xl font-medium">{step.title}</h3>
              </div>
              
              <p className="mb-4 text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              
              {step.imageUrl && (
                <div className="mt-4 rounded-md overflow-hidden border">
                  <img 
                    src={step.imageUrl} 
                    alt={`Screenshot for ${step.title}`} 
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}
        
        {document.content?.conclusion && (
          <div className="mt-8 p-6 border rounded-lg bg-muted/30">
            <h3 className="text-xl font-medium mb-3">Summary</h3>
            <p className="text-muted-foreground">{document.content.conclusion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
