import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Search, 
  Copy, 
  Download,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CampaignData {
  id: number;
  name: string;
  data: {
    headers: string[];
    rows: Record<string, string>[];
    fieldMappings: Record<string, string>;
  };
  createdAt: string;
  recordCount: number;
}

export default function CampaignView() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/campaign/:id");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const campaignId = params?.id;

  const { data: campaignData, isLoading, error } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}`],
    enabled: !!campaignId,
  });



  useEffect(() => {
    if (!campaignId) {
      setLocation("/dashboard");
    }
  }, [campaignId, setLocation]);

  if (!campaignId || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h2>
          <Button onClick={() => setLocation("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const campaign = campaignData as CampaignData;
  const headers = campaign.data?.headers || [];
  const rows = campaign.data?.rows || [];

  // Filter rows based on search term
  const filteredRows = rows.filter(row => 
    Object.values(row).some(value => 
      value?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredRows.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const handleCopyToExcel = () => {
    const selectedData = selectedRows.size > 0 
      ? filteredRows.filter((_, index) => selectedRows.has(index))
      : filteredRows;

    // Create tab-separated values format for Excel
    const headerRow = headers.join('\t');
    const dataRows = selectedData.map(row => 
      headers.map(header => row[header] || '').join('\t')
    );
    
    const tsvContent = [headerRow, ...dataRows].join('\n');
    
    navigator.clipboard.writeText(tsvContent).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${selectedData.length} records copied. Paste into Excel or Google Sheets.`,
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy data to clipboard",
        variant: "destructive"
      });
    });
  };

  const handleExportCSV = () => {
    const selectedData = selectedRows.size > 0 
      ? filteredRows.filter((_, index) => selectedRows.has(index))
      : filteredRows;

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...selectedData.map(row => 
        headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${campaign.name}-${selectedData.length}-records.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `${selectedData.length} records exported as CSV`,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{campaign.name}</h1>
                <p className="text-sm text-gray-500">
                  {campaign.recordCount} records • Uploaded {formatDate(campaign.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToExcel}
                className="flex items-center space-x-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Copy to Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredRows.length} of {rows.length} records
          {selectedRows.size > 0 && (
            <span className="ml-2 text-blue-600">
              • {selectedRows.size} selected
            </span>
          )}
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {headers.map((header, index) => (
                    <TableHead key={index} className="font-medium text-gray-900 min-w-[120px]">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex} 
                    className={selectedRows.has(rowIndex) ? "bg-blue-50" : "hover:bg-gray-50"}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(rowIndex)}
                        onCheckedChange={(checked) => handleRowSelect(rowIndex, checked as boolean)}
                      />
                    </TableCell>
                    {headers.map((header, cellIndex) => (
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

        {filteredRows.length === 0 && searchTerm && (
          <div className="text-center py-12 text-gray-500">
            No records found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}