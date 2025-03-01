
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { DocumentViewer } from '@/components/DocumentViewer';

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // In a real app, fetch the document from an API
    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const mockDocs: Record<string, Document> = {
          '1': {
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
          '2': {
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
          '3': {
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
        };
        
        // Add dynamic documents - this will make newly created docs accessible too
        const storedDocsString = localStorage.getItem('documents');
        if (storedDocsString) {
          try {
            const storedDocs = JSON.parse(storedDocsString);
            if (Array.isArray(storedDocs)) {
              storedDocs.forEach(doc => {
                if (doc && doc.id) {
                  mockDocs[doc.id] = doc;
                }
              });
            }
          } catch (e) {
            console.error("Failed to parse stored documents:", e);
          }
        }
        
        if (id && mockDocs[id]) {
          setDocument(mockDocs[id]);
        } else {
          setError('Document not found');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocument();
  }, [id]);
  
  // Handle go back
  const handleGoBack = () => {
    navigate('/');
  };
  
  if (isLoading) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    );
  }
  
  if (error || !document) {
    return (
      <div className="container py-10">
        <div className="max-w-md mx-auto text-center py-12 px-4">
          <h2 className="text-2xl font-semibold mb-4">
            {error || 'Document not found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the document you're looking for.
          </p>
          <Button onClick={handleGoBack} className="gap-2">
            <ArrowLeft size={16} />
            Return to Documents
          </Button>
        </div>
      </div>
    );
  }
  
  if (document.status === 'processing') {
    return (
      <div className="container py-10">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="mb-8 gap-2"
        >
          <ArrowLeft size={16} />
          Back to documents
        </Button>
        
        <div className="max-w-md mx-auto text-center py-12 px-4">
          <div className="mb-6">
            <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">{document.title}</h2>
            <p className="text-muted-foreground">
              We're processing your recording and generating documentation.
              <span className="loading-dots"></span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            This usually takes 1-2 minutes to complete. You can safely navigate away and come back later.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <DocumentViewer document={document} />
    </div>
  );
};

export default DocumentDetail;
