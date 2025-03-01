
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DocumentList } from '@/components/DocumentList';
import { RecordingModal } from '@/components/RecordingModal';
import { Document } from '@/lib/types';
import { toast } from 'sonner';

const Index = () => {
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulated data loading
  useEffect(() => {
    const loadDocs = async () => {
      setIsLoading(true);
      // In a real app, this would be an API call
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
            status: 'processing'
          }
        ];
        
        setDocuments(mockDocs);
        setIsLoading(false);
      }, 1500);
    };
    
    loadDocs();
  }, []);

  // Handle recording completion
  const handleRecordingComplete = (blob: Blob) => {
    console.log('Recording completed, blob size:', blob.size);
    
    // This would normally upload the recording to a server
    // For demo purposes, we'll simulate processing and adding a new document
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: `Document ${documents.length + 1}`,
      createdAt: new Date(),
      status: 'processing'
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    
    // Simulate processing completion
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === newDoc.id 
          ? {
            ...doc,
            status: 'completed',
            title: `How to Configure System Settings`,
            content: {
              introduction: 'This guide covers the system configuration process for administrators to optimize performance and security.',
              steps: [
                {
                  id: `step-${Date.now()}-1`,
                  title: 'Access System Settings',
                  description: 'Navigate to the Administration panel and select "System Settings" from the dropdown menu.',
                  imageUrl: 'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: `step-${Date.now()}-2`,
                  title: 'Update Security Parameters',
                  description: 'Locate the Security tab and review all current settings. Adjust password policies and access controls as needed for compliance.',
                  imageUrl: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=1000&auto=format&fit=crop'
                },
                {
                  id: `step-${Date.now()}-3`,
                  title: 'Configure Performance Options',
                  description: 'Navigate to the Performance section and optimize cache settings and database connection parameters based on system load.',
                  imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop'
                }
              ],
              conclusion: 'After completing these configurations, run the system diagnostics tool to verify all settings are applied correctly and monitor performance for 24 hours.'
            }
          } 
          : doc
      ));
      
      toast.success('Document processing completed');
    }, 8000);
  };

  // Open recording modal
  const handleCreateNewDocument = () => {
    setIsRecordingModalOpen(true);
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-12">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full mb-4 animate-fade-in">
            <span className="text-sm font-medium tracking-wide">Documentation Simplified</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight animate-slide-down">
            Guided Vision
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
