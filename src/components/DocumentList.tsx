
import { useState } from 'react';
import { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, ExternalLink, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onCreateNew: () => void;
}

export function DocumentList({ documents, isLoading = false, onCreateNew }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  // Filter documents by search query
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Navigate to document details
  const handleViewDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: Document['status'] }) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            <span>Processing</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Your Documents</h2>
          <p className="text-muted-foreground mt-1">
            Create, manage and share your process documentation
          </p>
        </div>
        <Button onClick={onCreateNew} size="lg" className="shrink-0">
          Create New Document
        </Button>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={40} className="text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-muted/30">
          {searchQuery ? (
            <>
              <p className="text-xl font-medium mb-2">No matching documents found</p>
              <p className="text-muted-foreground text-center mb-6">
                Try adjusting your search term or create a new document
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <FileText size={48} className="text-muted-foreground mb-4 opacity-50" />
              <p className="text-xl font-medium mb-2">No documents yet</p>
              <p className="text-muted-foreground text-center mb-6">
                Record your first screen walkthrough to create a document
              </p>
              <Button onClick={onCreateNew}>Create Your First Document</Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover-scale">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1 text-left mr-2">{doc.title}</CardTitle>
                  <StatusBadge status={doc.status} />
                </div>
                <CardDescription className="text-left">
                  Created {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-left">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {doc.content?.introduction || "This document is being processed..."}
                </p>
              </CardContent>
              <CardFooter className="justify-between border-t pt-4 pb-2">
                <Button
                  variant="outline" 
                  onClick={() => handleViewDocument(doc.id)}
                  disabled={doc.status === 'processing'}
                  className="gap-1.5"
                >
                  <FileText size={16} />
                  View
                </Button>
                <Button
                  variant="ghost" 
                  size="icon"
                  disabled={doc.status !== 'completed'}
                >
                  <ExternalLink size={16} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
