import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Paperclip, Download, Send, Plus, User, File, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function NotesDocuments() {
  const [noteContent, setNoteContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['/api/notes'],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Combine and sort notes and documents by date
  const allMessages = [
    ...(notes as any[]).map((note: any) => ({ ...note, type: 'note' })),
    ...(documents as any[]).map((doc: any) => ({ ...doc, type: 'document' }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/notes', { content });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Saved",
        description: "Your note has been saved securely",
      });
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save note",
        variant: "destructive"
      });
    }
  });

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Starting upload mutation with files:', Array.from(files).map(f => f.name));
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.size, 'bytes');
        formData.append('documents', file);
      });
      
      console.log('FormData created, making request...');
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File Uploaded",
        description: `${data.documents.length} file(s) uploaded successfully`,
      });
      setSelectedFiles(null);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive"
      });
      setSelectedFiles(null);
    }
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note before saving",
        variant: "destructive"
      });
      return;
    }
    saveNoteMutation.mutate(noteContent);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('File input changed:', files);
    if (files && files.length > 0) {
      console.log('Files selected:', Array.from(files).map(f => f.name));
      setSelectedFiles(files);
      // Auto-upload files immediately
      uploadDocumentsMutation.mutate(files);
      e.target.value = ''; // Reset input
    } else {
      console.log('No files selected');
    }
  };

  const handleUploadDocuments = () => {
    if (selectedFiles) {
      uploadDocumentsMutation.mutate(selectedFiles);
    }
  };

  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-purple-100 text-purple-600">
              <MessageSquare className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-slate-900">Campaign Community</h3>
            <p className="text-sm text-slate-500">
              {allMessages.length} message{allMessages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('documentFileInput')?.click()}
            disabled={uploadDocumentsMutation.isPending}
          >
            {uploadDocumentsMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 mb-2">No messages yet</h3>
            <p className="text-slate-500 text-sm">Start the conversation by adding a note or uploading a file</p>
          </div>
        ) : (
          allMessages.map((message: any) => (
            <div key={`${message.type}-${message.id}`} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {message.type === 'note' ? <User className="h-4 w-4" /> : <File className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-50 rounded-lg p-3">
                  {message.type === 'note' ? (
                    <div>
                      <p className="text-slate-900">{message.content}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{message.originalName}</p>
                          <p className="text-sm text-slate-500">{formatFileSize(message.fileSize)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(message.id, message.originalName)}
                        className="flex-shrink-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(message.createdAt).toLocaleDateString()} at {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('documentFileInput')?.click()}
            disabled={uploadDocumentsMutation.isPending}
            className="mb-2 h-10 w-10 p-0 rounded-full hover:bg-slate-100"
          >
            {uploadDocumentsMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full" />
            ) : (
              <Paperclip className="h-5 w-5 text-slate-600" />
            )}
          </Button>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              placeholder="Type a message..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="resize-none pr-12 min-h-[60px] max-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
            />
            {/* Send Button */}
            <Button
              onClick={handleSaveNote}
              disabled={!noteContent.trim() || saveNoteMutation.isPending}
              size="sm"
              className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full"
            >
              {saveNoteMutation.isPending ? (
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Hidden file input */}
        <Input 
          type="file" 
          id="documentFileInput" 
          multiple 
          className="hidden" 
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.csv"
        />
        
        <p className="text-xs text-slate-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
