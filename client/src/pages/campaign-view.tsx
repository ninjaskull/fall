import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Search, 
  Copy, 
  Download,
  FileSpreadsheet,
  Users,
  Calendar,
  Database,
  Filter,
  BarChart3,
  Eye,
  Settings
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
  const [activeTab, setActiveTab] = useState("data");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-slate-900">Campaign Not Found</CardTitle>
            <CardDescription>The requested campaign could not be found</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/dashboard")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

    const headerRow = headers.join('\t');
    const dataRows = selectedData.map(row => 
      headers.map(header => row[header] || '').join('\t')
    );
    
    const tsvContent = [headerRow, ...dataRows].join('\n');
    
    navigator.clipboard.writeText(tsvContent).then(() => {
      toast({
        title: "Copied Successfully",
        description: `${selectedData.length} records copied. Ready to paste into Excel or Google Sheets.`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Unable to copy data to clipboard",
        variant: "destructive"
      });
    });
  };

  const handleExportCSV = () => {
    const selectedData = selectedRows.size > 0 
      ? filteredRows.filter((_, index) => selectedRows.has(index))
      : filteredRows;

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...selectedData.map(row => 
        headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${campaign.name}-export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `${selectedData.length} records exported successfully`,
    });
  };

  // Calculate analytics
  const totalFields = headers.length;
  const completenessScore = Math.round(
    (rows.reduce((sum, row) => sum + Object.values(row).filter(v => v && v.trim()).length, 0) / 
    (rows.length * headers.length)) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Database className="text-white h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {campaign.recordCount.toLocaleString()} records
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(campaign.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {totalFields} Fields
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {completenessScore}% Complete
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Data View</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{campaign.recordCount.toLocaleString()}</div>
                  <p className="text-xs text-slate-500">Data points in campaign</p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Data Fields</CardTitle>
                  <Database className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{totalFields}</div>
                  <p className="text-xs text-slate-500">Available data columns</p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Data Quality</CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{completenessScore}%</div>
                  <p className="text-xs text-slate-500">Fields completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Field Mappings */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Field Mappings</CardTitle>
                <CardDescription>How your CSV columns were mapped to standard fields</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(campaign.data.fieldMappings || {}).map(([standardField, csvField]) => (
                    <div key={standardField} className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-slate-200/50">
                      <div>
                        <div className="font-medium text-slate-900">{standardField}</div>
                        <div className="text-sm text-slate-500">{csvField}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Export and manage your campaign data</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setActiveTab("data")}
                  className="h-auto p-4 bg-blue-600 hover:bg-blue-700 text-left justify-start"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5" />
                    <div>
                      <div className="font-medium">View Data</div>
                      <div className="text-xs opacity-90">Browse and filter records</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  onClick={handleExportCSV}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-slate-600" />
                    <div>
                      <div className="font-medium">Export CSV</div>
                      <div className="text-xs text-slate-500">Download all data</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data View Tab */}
          <TabsContent value="data" className="mt-6 space-y-6">
            {/* Search and Actions Bar */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search all records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80 bg-white/50"
                      />
                    </div>
                    <div className="text-sm text-slate-600">
                      {filteredRows.length.toLocaleString()} of {rows.length.toLocaleString()} records
                      {selectedRows.size > 0 && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • {selectedRows.size} selected
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToExcel}
                      disabled={filteredRows.length === 0}
                      className="flex items-center space-x-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Copy to Excel</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={filteredRows.length === 0}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        {headers.map((header, index) => (
                          <TableHead key={index} className="font-semibold text-slate-900 min-w-[150px]">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row, rowIndex) => (
                        <TableRow 
                          key={rowIndex} 
                          className={selectedRows.has(rowIndex) ? "bg-blue-50/50" : "hover:bg-slate-50/50"}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(rowIndex)}
                              onCheckedChange={(checked) => handleRowSelect(rowIndex, checked as boolean)}
                            />
                          </TableCell>
                          {headers.map((header, cellIndex) => (
                            <TableCell key={cellIndex} className="text-sm text-slate-700 max-w-[200px] truncate">
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredRows.length === 0 && searchTerm && (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium mb-2">No matches found</h3>
                    <p>No records match your search for "{searchTerm}"</p>
                  </div>
                )}

                {rows.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium mb-2">No data available</h3>
                    <p>This campaign doesn't contain any data records</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
                <CardDescription>Manage your campaign preferences and data handling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium text-slate-900 mb-4">Export Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-slate-200/50">
                      <div>
                        <div className="font-medium">Include Headers</div>
                        <div className="text-sm text-slate-500">Export column names with data</div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-slate-200/50">
                      <div>
                        <div className="font-medium">UTF-8 Encoding</div>
                        <div className="text-sm text-slate-500">Preserve special characters</div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 mb-4">Data Management</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-left">
                      <Download className="h-4 w-4 mr-2" />
                      Download Complete Dataset
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Campaign
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-left text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Database className="h-4 w-4 mr-2" />
                      Delete Campaign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}