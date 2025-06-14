import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CsvFieldMapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mappings: Record<string, string>) => void;
  csvHeaders: string[];
  fileName: string;
}

const STANDARD_FIELDS = [
  "First Name",
  "Last Name", 
  "Title",
  "Company",
  "Email",
  "Mobile Phone",
  "Other Phone",
  "Corporate Phone",
  "Person Linkedin Url",
  "Company Linkedin Url", 
  "Website",
  "State",
  "Country"
];

const REQUIRED_FIELDS = ["First Name", "Last Name", "Email"];

export default function CsvFieldMapper({ isOpen, onClose, onSave, csvHeaders, fileName }: CsvFieldMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [autoDetectedCount, setAutoDetectedCount] = useState(0);
  const { toast } = useToast();

  // Auto-detect field mappings
  useEffect(() => {
    if (csvHeaders.length > 0) {
      const autoMappings: Record<string, string> = {};
      let detectedCount = 0;

      STANDARD_FIELDS.forEach(standardField => {
        const normalizedStandard = standardField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const matchedHeader = csvHeaders.find(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Direct match
          if (normalizedHeader === normalizedStandard) return true;
          
          // Partial matches for common variations
          const keywords = standardField.toLowerCase().split(' ');
          return keywords.every(keyword => 
            normalizedHeader.includes(keyword.replace(/[^a-z0-9]/g, ''))
          );
        });

        if (matchedHeader) {
          autoMappings[standardField] = matchedHeader;
          detectedCount++;
        }
      });

      setMappings(autoMappings);
      setAutoDetectedCount(detectedCount);
    }
  }, [csvHeaders]);

  const handleMappingChange = (standardField: string, csvHeader: string) => {
    setMappings(prev => ({
      ...prev,
      [standardField]: csvHeader
    }));
  };

  const handleRemoveMapping = (standardField: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[standardField];
      return newMappings;
    });
  };

  const getMappedCount = () => Object.keys(mappings).length;
  const getSkippedCount = () => STANDARD_FIELDS.length - getMappedCount();
  const getRequiredMissingFields = () => REQUIRED_FIELDS.filter(field => !mappings[field]);

  const handleSave = () => {
    const missingRequired = getRequiredMissingFields();
    if (missingRequired.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please map these required fields: ${missingRequired.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    onSave(mappings);
  };

  const getAvailableHeaders = (currentField?: string) => {
    const usedHeaders = Object.values(mappings).filter(header => 
      currentField ? mappings[currentField] !== header : true
    );
    return csvHeaders.filter(header => !usedHeaders.includes(header));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Map CSV Fields</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Map your CSV columns to standard campaign fields for <strong>{fileName}</strong>. 
            Required fields are marked with *.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {autoDetectedCount} fields auto-detected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {getMappedCount()} fields mapped
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                {getSkippedCount()} fields will be skipped
              </span>
            </div>
          </div>

          {/* Field Mappings */}
          <div className="grid gap-4">
            {STANDARD_FIELDS.map(standardField => {
              const isRequired = REQUIRED_FIELDS.includes(standardField);
              const currentMapping = mappings[standardField];
              const isAutoDetected = csvHeaders.includes(currentMapping || '');

              return (
                <div key={standardField} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {standardField}
                        {isRequired && <span className="text-red-500">*</span>}
                      </span>
                      {currentMapping && isAutoDetected && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          Auto-detected
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <Select
                      value={currentMapping || ""}
                      onValueChange={(value) => handleMappingChange(standardField, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not mapped --</SelectItem>
                        {getAvailableHeaders(standardField).map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                        {currentMapping && (
                          <SelectItem value={currentMapping}>
                            {currentMapping}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentMapping && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(standardField)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Required Fields Warning */}
          {getRequiredMissingFields().length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Required Fields Missing</span>
              </div>
              <p className="text-sm text-red-700">
                Please map these required fields: {getRequiredMissingFields().join(", ")}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={getRequiredMissingFields().length > 0}
            >
              Save Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}