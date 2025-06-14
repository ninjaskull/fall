import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  LogOut, 
  FolderOpen, 
  MessageSquare, 
  Upload,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAuth } from "@/lib/auth";
import NotesDocuments from "@/components/notes-documents";
import CampaignList from "@/components/campaign-list";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/campaigns'],
  });

  const handleLogout = () => {
    clearAuth();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    setLocation("/");
  };

  // Calculate dashboard stats
  const totalCampaigns = campaigns.length;
  const totalRecords = campaigns.reduce((sum: number, campaign: any) => sum + (campaign.recordCount || 0), 0);
  const recentCampaigns = campaigns.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Database className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Campaign Manager</h1>
              <p className="text-sm text-slate-600">Manage your data campaigns efficiently</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {totalCampaigns} Campaigns
            </Badge>
            <Button variant="ghost" onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Campaigns</CardTitle>
                  <Database className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{totalCampaigns}</div>
                  <p className="text-xs text-slate-500">Active data campaigns</p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{totalRecords.toLocaleString()}</div>
                  <p className="text-xs text-slate-500">Data points processed</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Get started with common tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveTab("files")}
                  className="h-auto p-4 bg-blue-600 hover:bg-blue-700 text-left justify-start"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Upload CSV</div>
                      <div className="text-xs opacity-90">Import new campaign data</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => setActiveTab("files")}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-slate-600" />
                    <div>
                      <div className="font-medium">View Campaigns</div>
                      <div className="text-xs text-slate-500">Browse existing data</div>
                    </div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab("notes")}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-slate-600" />
                    <div>
                      <div className="font-medium">Add Notes</div>
                      <div className="text-xs text-slate-500">Document your work</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Campaigns */}
            {recentCampaigns.length > 0 && (
              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    Recent Campaigns
                  </CardTitle>
                  <CardDescription>Your latest uploaded data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCampaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-slate-200/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{campaign.name}</div>
                            <div className="text-sm text-slate-500">{campaign.recordCount} records</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/campaign/${campaign.id}`)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("files")}
                      className="w-full"
                    >
                      View All Campaigns
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-6">
            <CampaignList />
          </TabsContent>

          {/* Notes & Documents Tab */}
          <TabsContent value="notes" className="mt-6">
            <NotesDocuments />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}