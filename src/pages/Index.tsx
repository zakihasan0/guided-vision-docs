import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { DocumentList } from '@/components/DocumentList';
import { RecordingModal } from '@/components/RecordingModal';
import { Document } from '@/lib/types';
import { toast } from 'sonner';
import { processRecording } from '@/services/processingService';

const Index = () => {
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isProcessingRecording = useRef(false);

  // Load documents from localStorage or use mock data
  useEffect(() => {
    const loadDocs = async () => {
      setIsLoading(true);
      
      // Try to load documents from localStorage first
      const storedDocsString = localStorage.getItem('documents');
      if (storedDocsString) {
        try {
          const storedDocs = JSON.parse(storedDocsString);
          if (Array.isArray(storedDocs) && storedDocs.length > 0) {
            // Convert date strings back to Date objects
            const parsedDocs = storedDocs.map(doc => ({
              ...doc,
              createdAt: new Date(doc.createdAt)
            }));
            
            setDocuments(parsedDocs);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse stored documents:", e);
        }
      }
      
      // If no localStorage data or parsing failed, use mock data
      setTimeout(() => {
        const mockDocs: Document[] = [
          {
            id: '1',
            title: 'How to Process Employee Onboarding',
            createdAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
            status: 'completed',
            content: {
              introduction: 'This guide covers the step-by-step process for onboarding new employees to our systems and workflows.',
              steps: [
                {
                  id: 's1',
                  title: 'Create account in HR system',
                  description: 'Navigate to the HR portal and select "Add New Employee". Complete all required fields including personal information, position, department, and start date.',
                  imageUrl: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's2',
                  title: 'Set up email and accounts',
                  description: 'Access the IT admin panel and provision a new email account. Then use the account creation wizard to generate logins for all required systems based on the employee\'s role.',
                  imageUrl: 'https://images.unsplash.com/photo-1603791239531-1dda55e194a6?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's3',
                  title: 'Schedule orientation meeting',
                  description: 'Open the calendar app and create a new meeting invitation. Add the new employee, their manager, and HR representative. Select the standard 2-hour block and attach onboarding materials.',
                  imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop'
                }
              ],
              conclusion: 'Once these steps are completed, send a welcome email to the new employee with links to all relevant systems and schedule a follow-up check-in for one week after their start date.'
            }
          },
          {
            id: '2',
            title: 'Quarterly Sales Report Generation',
            createdAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
            status: 'completed',
            content: {
              introduction: 'This guide demonstrates how to generate the quarterly sales reports from our CRM system.',
              steps: [
                {
                  id: 's1',
                  title: 'Access reports dashboard',
                  description: 'Log into the CRM system and navigate to the Reports section from the main dashboard.',
                  imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's2',
                  title: 'Configure report parameters',
                  description: 'Select "Quarterly Sales" from the report templates. Set the date range for the desired quarter and choose relevant sales territories.',
                  imageUrl: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's3',
                  title: 'Generate and export report',
                  description: 'Click "Generate Report" and wait for the system to process the data. Once complete, use the export options to download in PDF and Excel formats.',
                  imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1000&auto=format&fit=crop'
                }
              ],
              conclusion: 'Remember to save the report in the shared drive and notify the management team via email that the new quarterly reports are available for review.'
            }
          },
          {
            id: '3',
            title: 'Customer Support Ticket Resolution',
            createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
            status: 'completed',
            content: {
              introduction: 'This guide explains the process for resolving customer support tickets efficiently.',
              steps: [
                {
                  id: 's1',
                  title: 'Triage the ticket',
                  description: 'Review the ticket details and categorize its priority based on urgency and impact.',
                  imageUrl: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's2',
                  title: 'Research the issue',
                  description: 'Check the knowledge base and previous similar tickets for potential solutions.',
                  imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: 's3',
                  title: 'Implement solution',
                  description: 'Contact the customer and guide them through the resolution process.',
                  imageUrl: 'https://images.unsplash.com/photo-1560264280-88b68371db39?q=80&w=1000&auto=format&fit=crop'
                }
              ],
              conclusion: 'Always follow up with customers to ensure their problem was resolved completely and to their satisfaction.'
            }
          }
        ];
        
        setDocuments(mockDocs);
        // Save mock docs to localStorage too
        localStorage.setItem('documents', JSON.stringify(mockDocs));
        setIsLoading(false);
      }, 1500);
    };
    
    loadDocs();
  }, []);
  
  // Save documents to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && documents.length > 0) {
      localStorage.setItem('documents', JSON.stringify(documents));
    }
  }, [documents, isLoading]);

  // Handle recording completion
  const handleRecordingComplete = async (blob: Blob) => {
    console.log('Recording completed, blob size:', blob.size);
    
    // Prevent multiple document creations
    if (isProcessingRecording.current) {
      console.log("Already processing a recording, ignoring duplicate call");
      return;
    }
    
    isProcessingRecording.current = true;
    
    try {
      // Create a placeholder document while processing
      const placeholderDoc: Document = {
        id: `doc-${Date.now()}`,
        title: `Processing Document...`,
        createdAt: new Date(),
        status: 'processing'
      };
      
      // Add the placeholder document to the list
      setDocuments(prev => [placeholderDoc, ...prev]);
      
      // Process the recording with our AI workflow
      const processedDoc = await processRecording(blob);
      
      // Update the document with the processed result
      setDocuments(prev => prev.map(doc => 
        doc.id === placeholderDoc.id ? processedDoc : doc
      ));
      
      toast.success('Documentation generated successfully!');
      isProcessingRecording.current = false;
    } catch (error) {
      console.error("Error processing recording:", error);
      toast.error("Failed to process recording. Please try again.");
      isProcessingRecording.current = false;
    }
  };

  // Open recording modal
  const handleCreateNewDocument = () => {
    setIsRecordingModalOpen(true);
  };

  // Handle document deletion
  const handleDeleteDocument = (documentId: string) => {
    // Remove the document from state
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    
    // Show success toast
    toast.success('Document deleted successfully');
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-12">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full mb-4 animate-fade-in">
            <span className="text-sm font-medium tracking-wide">Documentation Simplified</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight animate-slide-down">
            How2
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            Transform your screen recordings into detailed step-by-step documentation, 
            powered by AI. Simply record your process and let us do the rest.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-slide-up">
            <Button 
              size="lg" 
              onClick={handleCreateNewDocument}
              className="px-8"
            >
              Record New Process
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8"
            >
              How It Works
            </Button>
          </div>
        </section>
        
        <section>
          <DocumentList 
            documents={documents} 
            isLoading={isLoading} 
            onCreateNew={handleCreateNewDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        </section>
      </div>
      
      <RecordingModal 
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        onRecordingComplete={handleRecordingComplete}
      />
    </div>
  );
};

export default Index;
