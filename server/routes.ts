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
import { scrapeEbayPrices, generateSearchQuery, type PriceAnalysis } from "./priceService";

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
        // Default column mapping for the provided format if not specified
        mappedColumns = {
          "playerName": "Player Name",
          "sport": "Sport",
          "year": "Season",
          "brand": "Brand",
          "cardSet": "Card Set",
          "cardNumber": "Card Number",
          "condition": "Condition",
          "team": "Team",
          "notes": "Features",
          "frontImageUrl": "IMAGE URL",
          "backImageUrl": "IMAGE URL"
        };
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
      
      console.log(`Found ${records.length} records in uploaded file`);
      
      // Filter out empty rows or rows without essential data
      records = records.filter(record => {
        return (record["Player Name"] || record["Card Name"]) && 
               (record["IMAGE URL"] !== undefined || record["Card Number"] !== undefined);
      });
      
      console.log(`After filtering, ${records.length} valid records remain`);
      
      // Map the records based on the provided column mapping
      const cardRecords = records.map(record => {
        const mappedRecord: any = {};
        
        // Ensure we have a player name - prefer Player Name field, fallback to Card Name
        if (record["Player Name"]) {
          mappedRecord.playerName = record["Player Name"];
        } else if (record["Card Name"]) {
          // Extract player name from card name if no player name exists
          const cardName = record["Card Name"].toString();
          // Look for a name pattern in the card name
          const nameMatch = cardName.match(/(?:.*?)([A-Z][a-z]+ [A-Z][a-z]+)/);
          if (nameMatch && nameMatch[1]) {
            mappedRecord.playerName = nameMatch[1];
          } else {
            // Fallback: just use the card name
            mappedRecord.playerName = cardName;
          }
        }
        
        // Direct mapping of standard fields
        mappedRecord.sport = record["Sport"] ? record["Sport"].toLowerCase() : "soccer";
        mappedRecord.team = record["Team"] || null;
        mappedRecord.brand = record["Brand"] || null;
        mappedRecord.cardSet = record["Card Set"] || null;
        mappedRecord.cardNumber = record["Card Number"] || null;
        mappedRecord.condition = record["Condition"] ? record["Condition"].toLowerCase() : "new";
        mappedRecord.notes = record["Features"] || null;
        
        // Handle image URLs - properly split the pipe-separated values
        if (record["IMAGE URL"]) {
          const imageUrl = record["IMAGE URL"].toString();
          const imageUrls = imageUrl.split('|').map(url => url.trim());
          
          if (imageUrls.length > 0 && imageUrls[0]) {
            mappedRecord.frontImageUrl = imageUrls[0];
          }
          
          if (imageUrls.length > 1 && imageUrls[1]) {
            mappedRecord.backImageUrl = imageUrls[1];
          }
        }
        
        // Handle season/year conversion - extract just the first year from ranges like 2023-2024
        if (record["Season"]) {
          const yearMatch = record["Season"].toString().match(/(\d{4})/);
          if (yearMatch && yearMatch[1]) {
            mappedRecord.year = parseInt(yearMatch[1]);
          } else {
            mappedRecord.year = new Date().getFullYear(); // Default to current year if format is unexpected
          }
        } else {
          mappedRecord.year = new Date().getFullYear(); // Default to current year if missing
        }
        
        if (!mappedRecord.sport) {
          mappedRecord.sport = "soccer"; // Default to soccer based on the data
        }
        
        if (!mappedRecord.condition) {
          mappedRecord.condition = "new"; // Default to "new" condition
        }
        
        // Map purchases and current values (defaulting to 0 if missing)
        mappedRecord.purchasePrice = 0;
        mappedRecord.currentValue = 0;
        
        console.log(`Mapped record: ${JSON.stringify(mappedRecord)}`);
        
        return mappedRecord;
      });
      
      // Validate and insert each card
      const results = await Promise.all(
        cardRecords.map(async (record) => {
          try {
            // Use a more permissive validation for import
            const validRecord = {
              playerName: record.playerName || "Unknown Player",
              sport: record.sport || "soccer",
              year: record.year || new Date().getFullYear(),
              condition: record.condition || "new",
              team: record.team || null,
              brand: record.brand || null,
              cardSet: record.cardSet || null,
              cardNumber: record.cardNumber || null,
              purchasePrice: "0",
              currentValue: "0",
              notes: record.notes || null,
              frontImageUrl: record.frontImageUrl || null,
              backImageUrl: record.backImageUrl || null
            };
            
            const card = await storage.createCard(validRecord);
            return { success: true, data: card };
          } catch (error) {
            console.error("Error processing record:", error);
            return {
              success: false,
              error: `Error processing record: ${record.playerName || "Unknown"} - ${error}`,
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

  // GET eBay price search for a specific search query
  app.get('/api/prices', async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const priceAnalysis = await scrapeEbayPrices(query);
      res.json(priceAnalysis);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET eBay price search for a specific card
  app.get('/api/cards/:id/price', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const card = await storage.getCardById(id);
      
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }
      
      // Generate search query based on card details
      const searchQuery = generateSearchQuery(card);
      
      // Get price analysis
      const priceAnalysis = await scrapeEbayPrices(searchQuery);
      
      res.json({
        ...priceAnalysis,
        card
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(import.meta.dirname, '../uploads')));
  
  return httpServer;
}
