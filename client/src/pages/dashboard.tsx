import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, LogOut, Upload, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CsvUpload from "@/components/csv-upload";
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to your dashboard</h2>
          <p className="text-slate-600">Manage your campaign data and documents from here</p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="campaign" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaign" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Campaign Data
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes & Documents
            </TabsTrigger>
          </TabsList>

          {/* Campaign Data Tab */}
          <TabsContent value="campaign" className="mt-6">
            <div className="space-y-6">
              <CsvUpload />
              <CampaignList />
            </div>
          </TabsContent>

          {/* Notes & Documents Tab - Community Style */}
          <TabsContent value="community" className="mt-6">
            <NotesDocuments />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
