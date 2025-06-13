import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { encrypt, decrypt } from "./utils/encryption";
import { deriveTimezone } from "./utils/timezone";
import { insertCampaignSchema, insertNoteSchema, insertDocumentSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype, 'originalname:', file.originalname);
    
    // Allow CSV files for campaign upload
    if (file.fieldname === 'csv' && (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv'))) {
      cb(null, true);
    }
    // Allow various document types for notes
    else if (file.fieldname === 'documents') {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'text/csv', // Add CSV support for documents too
        'application/octet-stream' // Sometimes files come as this
      ];
      
      // Also check file extension as fallback
      const fileExtension = file.originalname.toLowerCase();
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png', '.csv'];
      const hasValidExtension = allowedExtensions.some(ext => fileExtension.endsWith(ext));
      
      cb(null, allowedTypes.includes(file.mimetype) || hasValidExtension);
    }
    else {
      console.log('File rejected - invalid fieldname:', file.fieldname);
      cb(null, false);
    }
  }
});

// Password for dashboard access
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

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

  // Campaign CSV upload
  app.post('/api/campaigns/upload', upload.array('csv'), async (req, res) => {
    try {
      console.log('CSV upload request received');
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      console.log('Content-Type:', req.headers['content-type']);
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        console.log('No CSV files found in request');
        return res.status(400).json({ message: 'No CSV files uploaded' });
      }

      const results = [];

      for (const file of files) {
        // Read and parse CSV
        const csvContent = fs.readFileSync(file.path, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          continue;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Define expected headers
        const expectedHeaders = [
          'First Name', 'Last Name', 'Title', 'Company', 'Email', 
          'Mobile Phone', 'Other Phone', 'Corporate Phone',
          'Person Linkedin Url', 'Company Linkedin Url', 'Website', 
          'State', 'Country'
        ];

        // Auto-detect field mappings
        const fieldMappings: Record<string, string> = {};
        expectedHeaders.forEach(expected => {
          const found = headers.find(header => 
            header.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(header.toLowerCase())
          );
          if (found) {
            fieldMappings[expected] = found;
          }
        });

        // Parse data rows and add timezone
        const dataRows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Derive timezone
          const state = row[fieldMappings['State']] || '';
          const country = row[fieldMappings['Country']] || '';
          row['Time zone'] = deriveTimezone(state, country);

          dataRows.push(row);
        }

        // Encrypt the campaign data
        const campaignData = {
          headers: [...headers, 'Time zone'],
          rows: dataRows,
          fieldMappings: { ...fieldMappings, 'Time zone': 'Time zone' }
        };

        const encryptedData = encrypt(JSON.stringify(campaignData));

        // Save to database
        const campaign = await storage.createCampaign({
          name: file.originalname.replace('.csv', ''),
          encryptedData,
          fieldMappings: campaignData.fieldMappings,
          recordCount: dataRows.length
        });

        results.push({
          id: campaign.id,
          name: campaign.name,
          recordCount: campaign.recordCount,
          fieldMappings: campaign.fieldMappings
        });

        // Clean up uploaded file
        fs.unlinkSync(file.path);
      }

      res.json({ campaigns: results });
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
        createdAt: campaign.createdAt
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ message: 'Failed to fetch campaign data' });
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
  app.post('/api/documents/upload', upload.array('documents'), async (req, res) => {
    try {
      console.log('Document upload request received');
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        console.log('No files found in request');
        return res.status(400).json({ message: 'No documents uploaded' });
      }

      const results = [];

      for (const file of files) {
        // Encrypt file path for security
        const encryptedPath = encrypt(file.path);

        const document = await storage.createDocument({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          encryptedPath
        });

        results.push({
          id: document.id,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          createdAt: document.createdAt
        });
      }

      res.json({ documents: results });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: 'Failed to upload documents' });
    }
  });

  // Get documents
  app.get('/api/documents', async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents.map(doc => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
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

      const filePath = decrypt(document.encryptedPath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
