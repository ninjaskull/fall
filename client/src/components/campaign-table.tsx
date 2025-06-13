import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Campaign {
  id: number;
  name: string;
  recordCount: number;
  fieldMappings: Record<string, string>;
  createdAt: string;
}

interface CampaignTableProps {
  campaign: Campaign;
}

export default function CampaignTable({ campaign }: CampaignTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: campaignData, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaign.id}`],
    enabled: isExpanded,
  });

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <p className="text-sm text-slate-600">
              {campaign.recordCount} records • Uploaded {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" onClick={toggleExpanded}>
            {isExpanded ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {isExpanded ? "Hide Data" : "View Data"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-600">Loading campaign data...</div>
            </div>
          ) : campaignData ? (
            <div className="space-y-4">
              {/* Field Mappings */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Field Mappings</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(campaign.fieldMappings).map(([expected, mapped]) => (
                    <div key={expected} className="bg-slate-50 p-2 rounded">
                      <span className="font-medium">{expected}:</span> {mapped}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Data Preview (First 10 rows)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {campaignData.data.headers.map((header: string, index: number) => (
                            <TableHead key={index} className="whitespace-nowrap bg-slate-50">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignData.data.rows.slice(0, 10).map((row: Record<string, string>, index: number) => (
                          <TableRow key={index}>
                            {campaignData.data.headers.map((header: string, cellIndex: number) => (
                              <TableCell key={cellIndex} className="whitespace-nowrap">
                                {row[header] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {campaignData.data.rows.length > 10 && (
                  <p className="text-sm text-slate-600 mt-2">
                    Showing first 10 of {campaignData.data.rows.length} total records
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-600 py-4">Failed to load campaign data</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
