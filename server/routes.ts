import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertCardSchema, cardFormSchema } from "@shared/schema";
import { parse as csvParse } from "csv-parse";
import * as XLSX from "xlsx";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(import.meta.dirname, "../uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Error handler middleware
  const handleError = (err: unknown, res: Response) => {
    console.error(err);
    
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ message: validationError.message });
    }
    
    if (err instanceof Error) {
      return res.status(500).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'An unknown error occurred' });
  };

  // GET all cards
  app.get('/api/cards', async (req, res) => {
    try {
      const cards = await storage.getAllCards();
      res.json(cards);
    } catch (err) {
      handleError(err, res);
    }
  });

  // GET card by ID
  app.get('/api/cards/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const card = await storage.getCardById(id);
      
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }
      
      res.json(card);
    } catch (err) {
      handleError(err, res);
    }
  });

  // POST create new card
  app.post('/api/cards', upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Parse and validate the request data
      const cardData = cardFormSchema.parse({
        ...req.body,
        year: Number(req.body.year),
        estimatedValue: Number(req.body.estimatedValue),
        frontImageUrl: files.frontImage ? `/uploads/${files.frontImage[0].filename}` : undefined,
        backImageUrl: files.backImage ? `/uploads/${files.backImage[0].filename}` : undefined,
      });
      
      const newCard = await storage.createCard(cardData);
      res.status(201).json(newCard);
    } catch (err) {
      handleError(err, res);
    }
  });

  // PUT update card
  app.put('/api/cards/:id', upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      
      // Prepare update data
      const updateData = {
        ...req.body,
        year: req.body.year ? Number(req.body.year) : undefined,
        estimatedValue: req.body.estimatedValue ? Number(req.body.estimatedValue) : undefined,
      };
      
      // Add image paths if new images were uploaded
      if (files?.frontImage) {
        updateData.frontImageUrl = `/uploads/${files.frontImage[0].filename}`;
      }
      
      if (files?.backImage) {
        updateData.backImageUrl = `/uploads/${files.backImage[0].filename}`;
      }
      
      // Update the card
      const updatedCard = await storage.updateCard(id, updateData);
      
      if (!updatedCard) {
        return res.status(404).json({ message: 'Card not found' });
      }
      
      res.json(updatedCard);
    } catch (err) {
      handleError(err, res);
    }
  });

  // DELETE card
  app.delete('/api/cards/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const success = await storage.deleteCard(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Card not found' });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Configure multer for CSV/Excel uploads
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
    },
  });

  // Import cards from CSV/Excel
  app.post("/api/import", csvUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { buffer, mimetype } = file;
      const { columnMap } = req.body;
      
      let mappedColumns: Record<string, string>;
      try {
        mappedColumns = JSON.parse(columnMap);
      } catch (e) {
        return res.status(400).json({ message: "Invalid column mapping" });
      }
      
      let records: any[] = [];
      
      // Parse CSV or Excel file
      if (mimetype === "text/csv") {
        const csvContent = buffer.toString("utf-8");
        
        // Parse CSV data
        const parsedCsv: any[] = await new Promise((resolve, reject) => {
          csvParse(csvContent, { columns: true, trim: true }, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
        
        records = parsedCsv;
      } else {
        // Parse Excel data
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(worksheet);
      }
      
      // Map the records based on the provided column mapping
      const cardRecords = records.map(record => {
        const mappedRecord: any = {};
        
        for (const [cardField, fileField] of Object.entries(mappedColumns)) {
          if (fileField && fileField !== "none" && record[fileField] !== undefined) {
            mappedRecord[cardField] = record[fileField];
          }
        }
        
        // Convert numerical values
        if (mappedRecord.year) {
          mappedRecord.year = parseInt(mappedRecord.year);
        }
        
        if (mappedRecord.purchasePrice) {
          mappedRecord.purchasePrice = parseFloat(mappedRecord.purchasePrice);
        }
        
        if (mappedRecord.currentValue) {
          mappedRecord.currentValue = parseFloat(mappedRecord.currentValue);
        }
        
        return mappedRecord;
      });
      
      // Validate and insert each card
      const results = await Promise.all(
        cardRecords.map(async (record) => {
          try {
            const validationResult = insertCardSchema.safeParse(record);
            
            if (!validationResult.success) {
              return {
                success: false,
                error: `Validation error: ${record.playerName || "Unknown"} - ${fromZodError(validationResult.error).message}`,
                data: record,
              };
            }
            
            const card = await storage.createCard(validationResult.data);
            return { success: true, data: card };
          } catch (error) {
            return {
              success: false,
              error: `Error processing record: ${record.playerName || "Unknown"}`,
              data: record,
            };
          }
        })
      );
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        message: `Import completed: ${successful} cards imported, ${failed} failed`,
        results: results,
      });
    } catch (error) {
      console.error("Error importing cards:", error);
      res.status(500).json({ message: "Failed to import cards" });
    }
  });

  // GET collection statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getCollectionStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  // GET value history for a card
  app.get('/api/cards/:id/history', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const history = await storage.getValueHistoryByCardId(id);
      res.json(history);
    } catch (err) {
      handleError(err, res);
    }
  });

  // GET value by category
  app.get('/api/stats/by-category', async (req, res) => {
    try {
      const categoryStats = await storage.getValueByCategory();
      res.json(categoryStats);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(import.meta.dirname, '../uploads')));
  
  return httpServer;
}
