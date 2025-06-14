import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Reset state when dialog closes
  const handleClose = () => {
    setMappings({});
    setAutoDetectedCount(0);
    setManualOverrides(new Set());
    onClose();
  };

  // Filter out empty headers
  const validHeaders = csvHeaders.filter(header => header && header.trim() !== '');

  // Auto-detect field mappings
  useEffect(() => {
    if (validHeaders.length > 0) {
      console.log('Auto-detecting fields for headers:', validHeaders);
      const autoMappings: Record<string, string> = {};
      let detectedCount = 0;

      STANDARD_FIELDS.forEach(standardField => {
        // Skip if user has manually overridden this field
        if (manualOverrides.has(standardField)) {
          return;
        }

        const normalizedStandard = standardField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const matchedHeader = validHeaders.find(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Direct match
          if (normalizedHeader === normalizedStandard) {
            console.log(`Direct match found: ${standardField} -> ${header}`);
            return true;
          }
          
          // Partial matches for common variations
          const keywords = standardField.toLowerCase().split(' ');
          const isMatch = keywords.every(keyword => 
            normalizedHeader.includes(keyword.replace(/[^a-z0-9]/g, ''))
          );
          
          if (isMatch) {
            console.log(`Partial match found: ${standardField} -> ${header}`);
          }
          
          return isMatch;
        });

        if (matchedHeader) {
          autoMappings[standardField] = matchedHeader;
          detectedCount++;
        }
      });

      console.log('Auto-detected mappings:', autoMappings);
      setMappings(prev => ({ ...prev, ...autoMappings }));
      setAutoDetectedCount(detectedCount);
    }
  }, [validHeaders, manualOverrides]);

  const handleMappingChange = (standardField: string, csvHeader: string) => {
    console.log(`Manual mapping change: ${standardField} -> ${csvHeader}`);
    
    // Mark this field as manually overridden
    setManualOverrides(prev => new Set([...prev, standardField]));
    
    setMappings(prev => {
      if (csvHeader === "__unmapped__") {
        const newMappings = { ...prev };
        delete newMappings[standardField];
        return newMappings;
      }
      return {
        ...prev,
        [standardField]: csvHeader
      };
    });
  };

  const handleRemoveMapping = (standardField: string) => {
    console.log(`Removing mapping for: ${standardField}`);
    
    // Mark this field as manually overridden (to prevent auto-detection from re-adding it)
    setManualOverrides(prev => new Set([...prev, standardField]));
    
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 100 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span>Map CSV Fields</span>
              <span className="text-sm font-normal text-slate-600">
                File: <span className="font-medium text-slate-800">{fileName}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Map your CSV columns to standard campaign fields. Required fields are marked with 
            <span className="text-red-500 font-medium"> *</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* CSV Headers Preview */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">CSV Columns Found ({validHeaders.length})</h3>
            <div className="flex flex-wrap gap-2">
              {validHeaders.map((header, index) => (
                <span key={`header-${index}-${header}`} className="px-2 py-1 bg-white border border-blue-200 rounded text-sm text-blue-800">
                  {header}
                </span>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Auto-detected</span>
              </div>
              <p className="text-lg font-semibold text-green-800 mt-1">{autoDetectedCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Mapped</span>
              </div>
              <p className="text-lg font-semibold text-blue-800 mt-1">{getMappedCount()}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Skipped</span>
              </div>
              <p className="text-lg font-semibold text-orange-800 mt-1">{getSkippedCount()}</p>
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="text-red-500">*</span>
              Required Fields
            </h3>
            <div className="grid gap-3">
              {REQUIRED_FIELDS.map(standardField => {
                const currentMapping = mappings[standardField];
                const isAutoDetected = validHeaders.includes(currentMapping || '');

                return (
                  <div key={`required-${standardField}`} className="grid grid-cols-2 gap-4 items-center p-4 border-2 border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {standardField}
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                      {currentMapping && isAutoDetected && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                          Auto-detected
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                        Required
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentMapping || "__unmapped__"}
                        onValueChange={(value) => handleMappingChange(standardField, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select CSV column..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]" position="popper" sideOffset={4}>
                          <SelectItem value="__unmapped__">
                            Don't map this field
                          </SelectItem>
                          {validHeaders.map((header, index) => {
                            const isUsed = Object.values(mappings).includes(header) && mappings[standardField] !== header;
                            return (
                              <SelectItem 
                                key={`req-${standardField}-${header}-${index}`} 
                                value={header}
                                disabled={isUsed}
                              >
                                {isUsed ? `${header} (already used)` : header}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {currentMapping && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(standardField)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove mapping"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Optional Fields</h3>
            <div className="grid gap-3">
              {STANDARD_FIELDS.filter(field => !REQUIRED_FIELDS.includes(field)).map(standardField => {
                const currentMapping = mappings[standardField];
                const isAutoDetected = validHeaders.includes(currentMapping || '');

                return (
                  <div key={`optional-${standardField}`} className="grid grid-cols-2 gap-4 items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {standardField}
                      </span>
                      {currentMapping && isAutoDetected && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                          Auto-detected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentMapping || "__unmapped__"}
                        onValueChange={(value) => handleMappingChange(standardField, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select CSV column..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]" position="popper" sideOffset={4}>
                          <SelectItem value="__unmapped__">
                            Don't map this field
                          </SelectItem>
                          {validHeaders.map((header, index) => {
                            const isUsed = Object.values(mappings).includes(header) && mappings[standardField] !== header;
                            return (
                              <SelectItem 
                                key={`opt-${standardField}-${header}-${index}`} 
                                value={header}
                                disabled={isUsed}
                              >
                                {isUsed ? `${header} (already used)` : header}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {currentMapping && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(standardField)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove mapping"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={getRequiredMissingFields().length > 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Mappings ({getMappedCount()} fields)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}