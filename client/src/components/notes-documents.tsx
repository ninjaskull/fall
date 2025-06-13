import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Paperclip, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function NotesDocuments() {
  const [noteContent, setNoteContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes } = useQuery({
    queryKey: ['/api/notes'],
  });

  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

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
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('documents', file);
      });
      
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${data.documents.length} document(s) uploaded successfully`,
      });
      setSelectedFiles(null);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive"
      });
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
    if (files && files.length > 0) {
      setSelectedFiles(files);
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
    <div className="space-y-8">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mr-4">
              <FileText className="text-purple-600 text-xl" />
            </div>
            Notes & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 mb-6">
            Add text notes and upload documents related to your campaigns. All data is encrypted and secure.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Add a note</label>
            <Textarea 
              placeholder="Write your note here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          
          <div 
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-purple-300 transition-colors cursor-pointer"
            onClick={() => document.getElementById('documentFileInput')?.click()}
          >
            <Paperclip className="text-slate-400 text-xl mb-2 mx-auto" />
            <p className="text-slate-600 text-sm">
              {selectedFiles ? `${selectedFiles.length} file(s) selected` : "Upload documents (PDF, DOCX, PPT, etc.)"}
            </p>
            <Input 
              type="file" 
              id="documentFileInput" 
              multiple 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          
          {selectedFiles && (
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Selected Files:</p>
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                  {file.name} ({formatFileSize(file.size)})
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleSaveNote}
              disabled={saveNoteMutation.isPending}
              className="flex-1"
            >
              {saveNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
            <Button 
              onClick={handleUploadDocuments}
              disabled={!selectedFiles || uploadDocumentsMutation.isPending}
              variant="outline"
            >
              {uploadDocumentsMutation.isPending ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {notes && notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.slice(0, 5).map((note: any) => (
                <div key={note.id} className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-slate-900 mb-2">{note.content}</p>
                  <p className="text-slate-500 text-sm">
                    {new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {documents && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((document: any) => (
                <div key={document.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <FileText className="text-slate-400 h-5 w-5" />
                    <div>
                      <p className="font-medium text-slate-900">{document.originalName}</p>
                      <p className="text-slate-500 text-sm">
                        {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(document.id, document.originalName)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
