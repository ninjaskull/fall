import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, LogOut, FolderOpen, MessageSquare, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import NotesDocuments from "@/components/notes-documents";
import CampaignList from "@/components/campaign-list";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('dashboard_token');
    if (!token) {
      toast({
        title: "Access Denied",
        description: "Please authenticate to access the dashboard",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [setLocation, toast]);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('csv', file);
      });
      
      const response = await apiRequest('POST', '/api/campaigns/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${data.campaigns.length} campaign(s) processed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload campaign data",
        variant: "destructive"
      });
    }
  });

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Validate file types
        const invalidFiles = Array.from(files).filter(file => !file.name.endsWith('.csv'));
        if (invalidFiles.length > 0) {
          toast({
            title: "Invalid File Type",
            description: "Please select only CSV files",
            variant: "destructive"
          });
          return;
        }
        uploadMutation.mutate(files);
      }
    };
    input.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_token');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Code className="text-white text-sm" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Campaign Dashboard</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="w-full">
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="ml-6 grid w-fit grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes & Documents
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-0">
            <CampaignList />
          </TabsContent>

          {/* Notes & Documents Tab */}
          <TabsContent value="notes" className="mt-6 max-w-7xl mx-auto px-6">
            <NotesDocuments />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
