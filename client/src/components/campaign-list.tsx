import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Eye, 
  Trash2, 
  Search, 
  File,
  Upload,
  CloudUpload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Campaign {
  id: number;
  name: string;
  recordCount: number;
  fieldMappings: Record<string, string>;
  createdAt: string;
}

export default function CampaignList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/campaigns/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete campaign",
        variant: "destructive"
      });
    }
  });

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

  const filteredCampaigns = (campaigns as Campaign[]).filter((campaign: Campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewData = (campaign: Campaign) => {
    setLocation(`/campaign/${campaign.id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

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



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Uploaded 1 day ago";
    if (diffDays < 7) return `Uploaded ${diffDays} days ago`;
    
    return `Uploaded ${date.toLocaleDateString()}`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors = [
      'bg-purple-100 text-purple-600',
      'bg-blue-100 text-blue-600', 
      'bg-orange-100 text-orange-600',
      'bg-green-100 text-green-600',
      'bg-pink-100 text-pink-600',
      'bg-teal-100 text-teal-600'
    ];
    
    // Use filename to determine consistent color
    const colorIndex = filename.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My files</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 border-gray-200"
              />
            </div>
            <span className="text-sm text-gray-500">
              {filteredCampaigns.length} campaigns
            </span>
          </div>
        </div>

        {/* CSV Upload Section */}
        <Card className="mb-6 border-2 border-dashed border-blue-200 bg-blue-50/30 hover:border-blue-300 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Upload className="text-blue-600 h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload CSV Files</h3>
                  <p className="text-sm text-gray-600">
                    {selectedFiles ? `${selectedFiles.length} file(s) selected` : "Drop CSV files here or click to browse"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('csvFileInput')?.click()}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <CloudUpload className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                {selectedFiles && (
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadMutation.isPending ? "Processing..." : "Upload"}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Drop Zone */}
            <div 
              className="mt-4 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              <CloudUpload className="text-blue-400 h-8 w-8 mb-2 mx-auto" />
              <p className="text-blue-700 font-medium">
                {selectedFiles ? `Ready to upload ${selectedFiles.length} file(s)` : "Drag and drop CSV files here"}
              </p>
              <p className="text-blue-500 text-sm mt-1">
                Supported: CSV files • Max: 10MB per file
              </p>
            </div>

            {selectedFiles && (
              <div className="mt-4 space-y-2">
                <p className="font-medium text-gray-900 text-sm">Selected Files:</p>
                <div className="space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-white p-2 rounded border flex justify-between items-center">
                      <span>{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Input 
              type="file" 
              id="csvFileInput" 
              multiple 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* Campaign List */}
        <div className="space-y-1">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? "No campaigns match your search" : "No campaigns uploaded yet"}
            </div>
          ) : (
            filteredCampaigns.map((campaign: Campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg group transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getFileIcon(campaign.name)}`}>
                    <File className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                    <div className="text-sm text-gray-500">
                      {campaign.recordCount} records • {formatDate(campaign.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewData(campaign)}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(campaign.id)}
                    disabled={deleteCampaignMutation.isPending}
                    className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}