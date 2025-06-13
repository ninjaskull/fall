import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CampaignTable from "./campaign-table";

export default function CsvUpload() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setSelectedFiles(null);
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

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
      setSelectedFiles(files);
    }
  };

  const handleUpload = () => {
    if (selectedFiles) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const csvFiles = Array.from(files).filter(file => file.name.endsWith('.csv'));
      if (csvFiles.length === 0) {
        toast({
          title: "Invalid File Type",
          description: "Please drop only CSV files",
          variant: "destructive"
        });
        return;
      }
      
      const dataTransfer = new DataTransfer();
      csvFiles.forEach(file => dataTransfer.items.add(file));
      setSelectedFiles(dataTransfer.files);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mr-4">
              <Upload className="text-blue-600 text-xl" />
            </div>
            Upload Campaign Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 mb-6">
            Upload CSV files with campaign data. Our system will automatically detect headers and help you map fields.
          </p>
          
          <div 
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csvFileInput')?.click()}
          >
            <CloudUpload className="text-slate-400 text-3xl mb-3 mx-auto" />
            <p className="text-slate-600 font-medium">
              {selectedFiles ? `${selectedFiles.length} file(s) selected` : "Click to upload CSV files"}
            </p>
            <p className="text-slate-400 text-sm">or drag and drop your files here</p>
            <Input 
              type="file" 
              id="csvFileInput" 
              multiple 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          
          {selectedFiles && (
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Selected Files:</p>
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Supported: CSV files only</span>
            <span>Max: 10MB per file</span>
          </div>
          
          <Button 
            onClick={handleUpload}
            disabled={!selectedFiles || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? "Processing..." : "Process Upload"}
          </Button>
        </CardContent>
      </Card>

      {/* Campaign List */}
      {campaigns && campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign: any) => (
                <CampaignTable key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
