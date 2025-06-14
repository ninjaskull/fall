import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  LogOut, 
  FolderOpen, 
  MessageSquare, 
  Upload,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  FileText,
  PawPrint
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  useEffect(() => {
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

  const handleLogout = () => {
    localStorage.removeItem('dashboard_token');
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50">
      {/* Cute Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-pink-200/50 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
              <PawPrint className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-pink-800 flex items-center gap-2">
                🐕 Pawsome Campaign Hub 
                <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              </h1>
              <p className="text-sm text-pink-600">Your furry friend data manager! 🦴</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">
              🎾 {totalCampaigns} Campaigns
            </Badge>
            <Button variant="ghost" onClick={handleLogout} className="text-pink-600 hover:text-pink-800 hover:bg-pink-50">
              <LogOut className="mr-2 h-4 w-4" />
              Walkies (Logout)
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3 bg-white/70 backdrop-blur-sm border-pink-200">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-800">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">🏠 Home</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-800">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">📁 Treats (Files)</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-800">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">📝 Diary</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-pink-200/50 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-pink-700">🐕 Total Campaigns</CardTitle>
                  <PawPrint className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-900">{totalCampaigns}</div>
                  <p className="text-xs text-pink-600">Good pups managed!</p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-orange-200/50 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">🦴 Total Records</CardTitle>
                  <Users className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">{totalRecords.toLocaleString()}</div>
                  <p className="text-xs text-orange-600">Treats collected!</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white/70 backdrop-blur-sm border-pink-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-pink-600" />
                  🎾 Quick Fetch Commands
                </CardTitle>
                <CardDescription>What would you like to do today, good pup?</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveTab("files")}
                  className="h-auto p-4 bg-pink-500 hover:bg-pink-600 text-left justify-start"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5" />
                    <div>
                      <div className="font-medium">🍖 Upload Treats (CSV)</div>
                      <div className="text-xs opacity-90">Bring in fresh campaign data!</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => setActiveTab("files")}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-pink-200 hover:bg-pink-50"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-pink-600" />
                    <div>
                      <div className="font-medium">🎾 Fetch Campaigns</div>
                      <div className="text-xs text-pink-600">Browse your pup data</div>
                    </div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab("notes")}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-orange-200 hover:bg-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">📖 Pup Diary</div>
                      <div className="text-xs text-orange-600">Write down memories</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Campaigns */}
            {recentCampaigns.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border-yellow-200/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-yellow-600" />
                    🐾 Recent Pup Adventures
                  </CardTitle>
                  <CardDescription>Your latest furry friend data uploads!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCampaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-yellow-200/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <PawPrint className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div>
                            <div className="font-medium text-yellow-900">🐕 {campaign.name}</div>
                            <div className="text-sm text-yellow-600">{campaign.recordCount} good pups • 🦴</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/campaign/${campaign.id}`)}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        >
                          🔍 Sniff
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("files")}
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                    >
                      🎾 See All Adventures
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