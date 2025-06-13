import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, LogOut, FolderOpen, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NotesDocuments from "@/components/notes-documents";
import CampaignList from "@/components/campaign-list";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Code className="text-white text-sm" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Campaign Dashboard</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="w-full">
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="ml-6 grid w-fit grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes & Documents
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-0">
            <CampaignList />
          </TabsContent>

          {/* Notes & Documents Tab */}
          <TabsContent value="notes" className="mt-6 max-w-7xl mx-auto px-6">
            <NotesDocuments />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
