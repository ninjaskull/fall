import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CsvUpload from "@/components/csv-upload";
import NotesDocuments from "@/components/notes-documents";

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

        <div className="grid md:grid-cols-2 gap-8">
          <CsvUpload />
          <NotesDocuments />
        </div>

        {/* Recent Activity Section */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-slate-900 mb-6">Recent Activity</h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">Ready to upload campaign data</p>
                    <p className="text-slate-500 text-sm">Upload your first CSV file to get started</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">📄</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">Document storage ready</p>
                    <p className="text-slate-500 text-sm">Upload documents and add notes securely</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">🔒</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">Secure encryption enabled</p>
                    <p className="text-slate-500 text-sm">All data is encrypted with AES-256</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
