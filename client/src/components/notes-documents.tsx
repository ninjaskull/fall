import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Paperclip, Download, Send, Plus, User, File, MessageSquare, PawPrint, Heart } from "lucide-react";
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
    mutationFn: async (files: File[]) => {
      console.log('Starting upload mutation with files:', files.map(f => f.name));
      
      // Upload files one by one since backend expects single file
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        console.log(`Appending file:`, file.name, file.size, 'bytes');
        formData.append('document', file);
        
        console.log('FormData created, making request...');
        const response = await apiRequest('POST', '/api/documents/upload', formData);
        const result = await response.json();
        results.push(result);
      }
      
      return { documents: results };
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
      // Convert FileList to Array to avoid reference issues
      const fileArray = Array.from(files);
      setSelectedFiles(files);
      // Auto-upload files immediately
      uploadDocumentsMutation.mutate(fileArray);
      e.target.value = ''; // Reset input
    } else {
      console.log('No files selected');
    }
  };

  const handleUploadDocuments = () => {
    if (selectedFiles) {
      uploadDocumentsMutation.mutate(Array.from(selectedFiles));
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
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white/70 rounded-lg border border-pink-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-pink-200 bg-pink-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-pink-100 text-pink-600">
              <PawPrint className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-pink-900 flex items-center gap-2">
              🐕 Pup Diary & Memory Box
              <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
            </h3>
            <p className="text-sm text-pink-600">
              🦴 {allMessages.length} memory{allMessages.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('documentFileInput')?.click()}
            disabled={uploadDocumentsMutation.isPending}
            className="text-pink-600 hover:text-pink-800 hover:bg-pink-100"
          >
            {uploadDocumentsMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            📎
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
              <PawPrint className="h-8 w-8 text-pink-400" />
            </div>
            <h3 className="font-medium text-pink-900 mb-2">🏠 No memories yet!</h3>
            <p className="text-pink-600 text-sm">🐕 Start sharing pup thoughts and photos by writing a note or uploading files!</p>
          </div>
        ) : (
          allMessages.map((message: any) => (
            <div key={`${message.type}-${message.id}`} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-pink-100 text-pink-600">
                  {message.type === 'note' ? <PawPrint className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-pink-50 rounded-lg p-3 border border-pink-100">
                  {message.type === 'note' ? (
                    <div>
                      <p className="text-pink-900">📝 {message.content}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="h-4 w-4 text-pink-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-pink-900 truncate">📄 {message.name || message.originalName}</p>
                          <p className="text-sm text-pink-600">{formatFileSize(message.size || message.fileSize)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(message.id, message.name || message.originalName)}
                        className="flex-shrink-0 text-pink-600 hover:text-pink-800 hover:bg-pink-100"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-pink-500 mt-1">
                  🕐 {new Date(message.createdAt).toLocaleDateString()} at {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-pink-200 p-4 bg-pink-50/50">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('documentFileInput')?.click()}
            disabled={uploadDocumentsMutation.isPending}
            className="mb-2 h-10 w-10 p-0 rounded-full hover:bg-pink-100 text-pink-600"
          >
            {uploadDocumentsMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              placeholder="🐕 Share what's on your pup's mind..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="resize-none pr-12 min-h-[60px] max-h-32 border-pink-200 focus:border-pink-400"
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
              className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-pink-500 hover:bg-pink-600"
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
          accept="*"
        />
        
        <p className="text-xs text-pink-600 mt-2">🦴 Press Enter to bark, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
