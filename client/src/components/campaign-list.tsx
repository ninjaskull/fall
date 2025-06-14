import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Eye, 
  Trash2, 
  Search, 
  File,
  Upload,
  PawPrint
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CsvUpload from "./csv-upload";

interface Campaign {
  id: number;
  name: string;
  recordCount: number;
  fieldMappings: Record<string, string>;
  createdAt: string;
}

export default function CampaignList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpload, setShowUpload] = useState(false);
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

  const filteredCampaigns = (campaigns as Campaign[])
    .filter((campaign: Campaign) =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleViewData = (campaign: Campaign) => {
    setLocation(`/campaign/${campaign.id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `Uploaded ${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })}`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors = [
      'bg-pink-100 text-pink-600',
      'bg-orange-100 text-orange-600', 
      'bg-yellow-100 text-yellow-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-blue-100 text-blue-600'
    ];
    
    // Use filename to determine consistent color
    const colorIndex = filename.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PawPrint className="animate-bounce h-8 w-8 text-pink-500 mb-2" />
        <div className="text-pink-600">🐕 Fetching good pups...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-pink-800 flex items-center gap-2">
            🎾 My Doggy Treats
            <PawPrint className="h-6 w-6 text-pink-600" />
          </h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 h-4 w-4" />
              <Input
                placeholder="🔍 Sniff for campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 border-pink-200 focus:border-pink-400"
              />
            </div>
            <span className="text-sm text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
              🐕 {filteredCampaigns.length} good pups
            </span>
            <Button 
              onClick={() => setShowUpload(!showUpload)}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              🍖 Feed New Treats
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-8">
            <CsvUpload />
          </div>
        )}



        {/* Campaign List */}
        <div className="space-y-2">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-pink-500 bg-pink-50 rounded-lg border-2 border-dashed border-pink-200">
              <PawPrint className="h-12 w-12 mx-auto mb-4 text-pink-300" />
              {searchTerm ? "🐕 No pups match your sniff!" : "🏠 No furry friends here yet! Upload some treats to get started."}
            </div>
          ) : (
            filteredCampaigns.map((campaign: Campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between px-4 py-4 hover:bg-pink-50 rounded-lg group transition-colors border border-pink-100 bg-white/50"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getFileIcon(campaign.name)}`}>
                    <PawPrint className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-pink-900 flex items-center gap-2">
                      🐕 {campaign.name}
                    </h3>
                    <div className="text-sm text-pink-600 flex items-center gap-1">
                      🦴 {campaign.recordCount} good pups • {formatDate(campaign.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewData(campaign)}
                    className="text-pink-600 hover:text-pink-800 hover:bg-pink-100"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    👀 Peek
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(campaign.id)}
                    disabled={deleteCampaignMutation.isPending}
                    className="text-orange-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    🗑️ Bye
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