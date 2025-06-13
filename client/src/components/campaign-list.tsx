import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  Database
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

  const filteredCampaigns = campaigns.filter((campaign: Campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewData = async (campaign: Campaign) => {
    setSelectedCampaign(campaign as CampaignData);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const handleCopyData = () => {
    if (!campaignData?.data) return;

    const { headers, rows } = campaignData.data;
    
    // Create tab-separated values format for easy pasting into spreadsheets
    const headerRow = headers.join('\t');
    const dataRows = rows.map(row => 
      headers.map(header => row[header] || '').join('\t')
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
    if (!campaignData?.data) return;

    const { headers, rows } = campaignData.data;
    
    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => 
        headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${campaignData.name}.csv`);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              My Files
            </CardTitle>
            <Badge variant="secondary">
              {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No campaigns match your search" : "No campaigns uploaded yet"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((campaign: Campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Database className="h-3 w-3 mr-1" />
                          {campaign.recordCount} records
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(campaign.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewData(campaign)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deleteCampaignMutation.isPending}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          ) : campaignData?.data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {campaignData.data.rows.length} records
                </Badge>
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
                      {campaignData.data.headers.map((header, index) => (
                        <TableHead key={index} className="font-medium">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignData.data.rows.map((row, index) => (
                      <TableRow key={index}>
                        {campaignData.data.headers.map((header, cellIndex) => (
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