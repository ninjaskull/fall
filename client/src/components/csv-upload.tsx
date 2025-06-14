import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CloudUpload, PawPrint, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CampaignTable from "./campaign-table";
import CsvFieldMapper from "./csv-field-mapper";

export default function CsvUpload() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [currentFileName, setCurrentFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await apiRequest('POST', '/api/campaigns/preview', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCsvHeaders(data.headers);
      setCurrentFileName(data.fileName);
      setShowFieldMapper(true);
    },
    onError: (error) => {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to preview CSV file",
        variant: "destructive"
      });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, mappings }: { file: File, mappings: Record<string, string> }) => {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('fieldMappings', JSON.stringify(mappings));
      
      const response = await apiRequest('POST', '/api/campaigns/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Campaign "${data.campaign.name}" processed successfully with ${data.campaign.recordCount} records`,
      });
      setSelectedFiles(null);
      setPendingFile(null);
      setShowFieldMapper(false);
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

  const { data: campaigns, isLoading } = useQuery<any[]>({
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
    console.log('handleUpload called');
    console.log('selectedFiles:', selectedFiles);
    if (selectedFiles && selectedFiles[0]) {
      const file = selectedFiles[0];
      console.log('Starting preview for file:', file.name);
      setPendingFile(file);
      previewMutation.mutate(file);
    } else {
      console.log('No files selected');
    }
  };

  const handleFieldMappingSave = (mappings: Record<string, string>) => {
    if (pendingFile) {
      uploadMutation.mutate({ file: pendingFile, mappings });
    }
  };

  const handleFieldMapperClose = () => {
    setShowFieldMapper(false);
    setPendingFile(null);
    setCsvHeaders([]);
    setCurrentFileName("");
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
      <Card className="hover:shadow-lg transition-shadow border-pink-200 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mr-4">
              <PawPrint className="text-pink-600 text-xl" />
            </div>
            🍖 Feed Your Pup Some Data Treats!
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500 ml-2" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-pink-700 mb-6">
            🐕 Upload CSV files with your furry friend campaign data! Our smart pup will sniff out the headers and help you organize everything perfectly.
          </p>
          
          <div 
            className="border-2 border-dashed border-pink-300 rounded-xl p-8 text-center hover:border-pink-400 transition-colors cursor-pointer bg-pink-50/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csvFileInput')?.click()}
          >
            <div className="flex items-center justify-center mb-3">
              <PawPrint className="text-pink-400 text-3xl mr-2" />
              <CloudUpload className="text-pink-400 text-3xl" />
            </div>
            <p className="text-pink-700 font-medium">
              {selectedFiles ? `🎾 ${selectedFiles.length} treat(s) ready to share!` : "🐕 Click to bring treats (CSV files)"}
            </p>
            <p className="text-pink-500 text-sm">or drag and drop your doggy data here! 🦴</p>
            <Input 
              type="file" 
              id="csvFileInput" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          
          {selectedFiles && (
            <div className="space-y-2">
              <p className="font-medium text-pink-800 flex items-center gap-2">
                🎾 Ready Treats:
              </p>
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="text-sm text-pink-700 bg-pink-100 p-3 rounded-lg border border-pink-200">
                  🍖 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-pink-600 bg-pink-50 p-3 rounded-lg">
            <span>🐕 Only CSV treats allowed!</span>
            <span>📏 Max: 10MB per treat</span>
          </div>
          
          <Button 
            onClick={handleUpload}
            disabled={!selectedFiles || previewMutation.isPending}
            className="w-full bg-pink-500 hover:bg-pink-600"
          >
            {previewMutation.isPending ? "🐕 Sniffing treats..." : "🦴 Share Treats & Map Fields"}
          </Button>
        </CardContent>
      </Card>

      {/* Field Mapper Modal */}
      {showFieldMapper && (
        <CsvFieldMapper
          isOpen={showFieldMapper}
          onClose={handleFieldMapperClose}
          onSave={handleFieldMappingSave}
          csvHeaders={csvHeaders}
          fileName={currentFileName}
        />
      )}

      {/* Campaign List */}
      {campaigns && Array.isArray(campaigns) && campaigns.length > 0 && (
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
