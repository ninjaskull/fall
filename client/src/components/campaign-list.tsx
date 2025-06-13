import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Trash2, 
  FileText, 
  Search, 
  Download, 
  Copy,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Campaign {
  id: number;
  name: string;
  recordCount: number;
  fieldMappings: Record<string, string>;
  createdAt: string;
}

interface CampaignData {
  id: number;
  name: string;
  data: {
    headers: string[];
    rows: Record<string, string>[];
    fieldMappings: Record<string, string>;
  };
  createdAt: string;
}

export default function CampaignList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const { data: campaignData, isLoading: isLoadingData } = useQuery({
    queryKey: ['/api/campaigns', selectedCampaign?.id],
    enabled: !!selectedCampaign?.id,
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

  const filteredCampaigns = (campaigns as Campaign[]).filter((campaign: Campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewData = async (campaign: Campaign) => {
    setSelectedCampaign(campaign as any);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const handleCopyData = () => {
    if (!(campaignData as any)?.data) return;

    const { headers, rows } = (campaignData as any).data;
    
    // Create tab-separated values format for easy pasting into spreadsheets
    const headerRow = headers.join('\t');
    const dataRows = rows.map((row: any) => 
      headers.map((header: string) => row[header] || '').join('\t')
    );
    
    const tsvContent = [headerRow, ...dataRows].join('\n');
    
    navigator.clipboard.writeText(tsvContent).then(() => {
      toast({
        title: "Data Copied",
        description: "Campaign data copied to clipboard. You can now paste it into Excel or Google Sheets.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy data to clipboard",
        variant: "destructive"
      });
    });
  };

  const handleExportCSV = () => {
    if (!(campaignData as any)?.data) return;

    const { headers, rows } = (campaignData as any).data;
    
    // Create CSV content
    const csvContent = [
      headers.map((h: string) => `"${h}"`).join(','),
      ...rows.map((row: any) => 
        headers.map((header: string) => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${(campaignData as any).name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Campaign data exported as CSV file",
    });
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

      {/* Data View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              {selectedCampaign?.name}
            </DialogTitle>
            <DialogDescription>
              View and export campaign data
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (campaignData as any)?.data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {(campaignData as any).data.rows.length} records
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyData}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(campaignData as any).data.headers.map((header: string, index: number) => (
                        <TableHead key={index} className="font-medium">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(campaignData as any).data.rows.map((row: any, index: number) => (
                      <TableRow key={index}>
                        {(campaignData as any).data.headers.map((header: string, cellIndex: number) => (
                          <TableCell key={cellIndex} className="text-sm">
                            {row[header] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Failed to load campaign data
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}