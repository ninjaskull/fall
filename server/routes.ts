import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { storage } from "./storage.js";
import { encrypt, decrypt } from "./utils/encryption.js";
import { deriveTimezone } from "./utils/timezone.js";

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    console.log('File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype, 'originalname:', file.originalname);
    
    // Only allow CSV files for the csv field
    if (file.fieldname === 'csv') {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed for CSV uploads'));
      }
    } else if (file.fieldname === 'document') {
      // Allow various document types
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    } else {
      cb(new Error('Invalid file field'));
    }
  }
});

// Password for dashboard access
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// Function to parse CSV line with proper handling of quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator found outside quotes
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication route
  app.post('/api/auth', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      // Hash the provided password and compare with stored hash
      // For simplicity, we're doing a direct comparison here
      // In production, you'd store a hashed password and compare hashes
      if (password === DASHBOARD_PASSWORD) {
        // Generate a simple session token (in production, use proper JWT or session management)
        const token = Buffer.from(`authenticated:${Date.now()}`).toString('base64');
        res.json({ success: true, token });
      } else {
        res.status(401).json({ message: 'Invalid password' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // CSV preview endpoint for field mapping
  app.post('/api/campaigns/preview', upload.single('csv'), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }

      // Read and parse CSV headers only
      const csvContent = fs.readFileSync(file.path, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return res.status(400).json({ message: 'CSV file is empty' });
      }

      // Parse headers
      const headers = parseCSVLine(lines[0]);
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json({ 
        headers,
        fileName: file.originalname
      });
    } catch (error) {
      console.error('CSV preview error:', error);
      res.status(500).json({ message: 'Failed to preview CSV file' });
    }
  });

  // Campaign CSV upload
  app.post('/api/campaigns/upload', upload.single('csv'), async (req, res) => {
    try {
      console.log('CSV upload request received');
      console.log('Request body:', req.body);
      console.log('Request file:', req.file);
      
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }

      // Get field mappings from request
      const fieldMappingsJson = req.body.fieldMappings;
      if (!fieldMappingsJson) {
        return res.status(400).json({ message: 'Field mappings are required' });
      }

      const fieldMappings: Record<string, string> = JSON.parse(fieldMappingsJson);

      // Read and parse CSV
      const csvContent = fs.readFileSync(file.path, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return res.status(400).json({ message: 'CSV file is empty' });
      }

      // Parse headers
      const headers = parseCSVLine(lines[0]);

      // Parse data rows and add timezone
      const dataRows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        
        // Map original headers to values
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Create mapped row with standard field names
        const mappedRow: Record<string, string> = {};
        Object.entries(fieldMappings).forEach(([standardField, csvHeader]) => {
          mappedRow[standardField] = row[csvHeader] || '';
        });

        // Derive timezone based on mapped State and Country fields
        const state = mappedRow['State'] || '';
        const country = mappedRow['Country'] || '';
        mappedRow['Time Zone'] = deriveTimezone(state, country);

        dataRows.push(mappedRow);
      }

      // Create final headers array with mapped fields plus timezone
      const finalHeaders = [...Object.keys(fieldMappings), 'Time Zone'];

      // Encrypt the campaign data
      const campaignData = {
        headers: finalHeaders,
        rows: dataRows,
        fieldMappings: { ...fieldMappings, 'Time Zone': 'Time Zone' }
      };

      const encryptedData = encrypt(JSON.stringify(campaignData));

      // Save to database
      const campaign = await storage.createCampaign({
        name: file.originalname.replace('.csv', ''),
        encryptedData,
        fieldMappings: campaignData.fieldMappings,
        recordCount: dataRows.length
      });

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json({ 
        campaign: {
          id: campaign.id,
          name: campaign.name,
          recordCount: campaign.recordCount,
          fieldMappings: campaign.fieldMappings
        }
      });
    } catch (error) {
      console.error('Campaign upload error:', error);
      res.status(500).json({ message: 'Failed to process campaign upload' });
    }
  });

  // Get campaigns
  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns.map(c => ({
        id: c.id,
        name: c.name,
        recordCount: c.recordCount,
        fieldMappings: c.fieldMappings,
        createdAt: c.createdAt
      })));
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  });

  // Get campaign data (decrypted)
  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Decrypt campaign data
      const decryptedData = JSON.parse(decrypt(campaign.encryptedData));
      
      res.json({
        id: campaign.id,
        name: campaign.name,
        data: decryptedData,
        createdAt: campaign.createdAt,
        recordCount: campaign.recordCount
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ message: 'Failed to fetch campaign data' });
    }
  });

  // Delete campaign
  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      await storage.deleteCampaign(id);
      
      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ message: 'Failed to delete campaign' });
    }
  });

  // Create note
  app.post('/api/notes', async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Note content is required' });
      }

      const encryptedContent = encrypt(content);
      
      const note = await storage.createNote({
        content: content.substring(0, 100) + '...', // Store preview
        encryptedContent
      });

      res.json({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt
      });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ message: 'Failed to create note' });
    }
  });

  // Get notes
  app.get('/api/notes', async (req, res) => {
    try {
      const notes = await storage.getNotes();
      res.json(notes.map(note => ({
        id: note.id,
        content: decrypt(note.encryptedContent),
        createdAt: note.createdAt
      })));
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ message: 'Failed to fetch notes' });
    }
  });

  // Upload documents
  app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ message: 'No document uploaded' });
      }

      // Encrypt file path
      const encryptedPath = encrypt(file.path);
      
      const document = await storage.createDocument({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        encryptedPath
      });

      res.json({
        id: document.id,
        name: document.originalName,
        type: document.mimeType,
        size: document.fileSize,
        createdAt: document.createdAt
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // Get documents
  app.get('/api/documents', async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents.map(doc => ({
        id: doc.id,
        name: doc.originalName,
        type: doc.mimeType,
        size: doc.fileSize,
        createdAt: doc.createdAt
      })));
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Download document
  app.get('/api/documents/:id/download', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Decrypt file path
      const filePath = decrypt(document.encryptedPath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Document file not found' });
      }

      res.download(filePath, document.originalName);
    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}