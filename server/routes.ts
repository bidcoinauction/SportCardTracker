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
      
      // Check if this is a bulk import of multiple cards
      if (req.body.cards && Array.isArray(req.body.cards)) {
        const cardsToCreate = req.body.cards.map((card: any) => ({
          playerName: card.playerName || "Unknown Player",
          sport: card.sport?.toLowerCase() || "soccer",
          year: Number(card.year) || new Date().getFullYear(),
          condition: card.condition?.toLowerCase() || "new",
          team: card.team || null,
          brand: card.brand || null,
          cardSet: card.cardSet || null,
          cardNumber: card.cardNumber || null,
          purchasePrice: "0",
          currentValue: card.currentValue ? String(card.currentValue) : "0",
          notes: card.notes || null,
          frontImageUrl: card.frontImageUrl || null,
          backImageUrl: card.backImageUrl || null
        }));
        
        // Process and create each card
        const createdCards = [];
        for (const cardData of cardsToCreate) {
          try {
            const newCard = await storage.createCard(cardData);
            createdCards.push(newCard);
          } catch (error) {
            console.error("Error creating card:", error);
          }
        }
        
        return res.status(201).json({ 
          message: `Imported ${createdCards.length} of ${cardsToCreate.length} cards`,
          imported: createdCards.length,
          cards: createdCards
        });
      }
      
      // Single card creation
      const cardData = cardFormSchema.parse({
        ...req.body,
        year: Number(req.body.year),
        estimatedValue: Number(req.body.estimatedValue),
        frontImageUrl: files?.frontImage ? `/uploads/${files.frontImage[0].filename}` : undefined,
        backImageUrl: files?.backImage ? `/uploads/${files.backImage[0].filename}` : undefined,
      });
      
      const newCard = await storage.createCard(cardData);
      res.status(201).json(newCard);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // POST import text endpoint for processing raw text data
  app.post('/api/import/text', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'No text data provided' });
      }
      
      // Split text into lines and process each one
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      console.log(`Processing ${lines.length} lines of text`);
      
      const cards = lines.map(line => {
        // Handle common patterns in card descriptions
        const yearMatch = line.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        
        // Look for condition terms
        let condition = "new";
        const conditionTerms = {
          mint: /\bmint\b|\bpsa\s*10\b|\bgem\s*mt\b/i,
          nearMint: /\bnear\s*mint\b|\bpsa\s*9\b|\bnm\b|\bnm-mt\b/i,
          excellent: /\bexcellent\b|\bpsa\s*[78]\b|\bex\b/i,
          veryGood: /\bvery\s*good\b|\bpsa\s*[56]\b|\bvg\b/i,
          good: /\bgood\b|\bpsa\s*[34]\b/i,
          fair: /\bfair\b|\bpsa\s*[12]\b/i,
          poor: /\bpoor\b|\bpsa\s*0\b/i
        };
        
        for (const [cond, regex] of Object.entries(conditionTerms)) {
          if (regex.test(line)) {
            condition = cond;
            break;
          }
        }
        
        // Try to extract player name - look for capitalized words
        const nameMatch = line.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
        const playerName = nameMatch ? nameMatch[0] : "Unknown Player";
        
        // Try to determine brand and card set
        const brandMatch = line.match(/\b(Topps|Panini|Fleer|Upper Deck|Bowman|Donruss)\b/i);
        const brand = brandMatch ? brandMatch[0] : null;
        
        // Look for set names that usually follow brand
        const setMatch = brandMatch && line.match(new RegExp(`${brandMatch[0]}\\s+([A-Za-z]+)`, 'i'));
        const cardSet = setMatch ? setMatch[1] : null;
        
        // Look for card numbers usually indicated with #
        const cardNumberMatch = line.match(/#\s*(\d+)/);
        const cardNumber = cardNumberMatch ? cardNumberMatch[1] : null;
        
        // Determine sport based on keywords
        let sport = "soccer";  // Default for your use case
        const sportKeywords = {
          basketball: /basketball|nba|hoops/i,
          baseball: /baseball|mlb|diamond/i,
          football: /football|nfl|gridiron/i,
          hockey: /hockey|nhl|puck/i,
          soccer: /soccer|fifa|mls/i
        };
        
        for (const [sportName, regex] of Object.entries(sportKeywords)) {
          if (regex.test(line)) {
            sport = sportName;
            break;
          }
        }
        
        return {
          playerName,
          sport,
          year,
          condition,
          brand,
          cardSet,
          cardNumber,
          team: null,
          purchasePrice: "0",
          currentValue: "0",
          notes: line.trim(),
          frontImageUrl: null,
          backImageUrl: null
        };
      });
      
      // Save all cards
      const results = await Promise.all(
        cards.map(async (card) => {
          try {
            const newCard = await storage.createCard(card);
            return { success: true, data: newCard };
          } catch (error) {
            console.error("Error creating card from text:", error);
            return { 
              success: false, 
              error: `Failed to create card: ${error instanceof Error ? error.message : 'Unknown error'}`,
              data: card
            };
          }
        })
      );
      
      const successful = results.filter(r => r.success).length;
      
      res.json({
        message: `Successfully imported ${successful} of ${cards.length} cards`,
        imported: successful,
        results
      });
    } catch (error) {
      console.error("Error in text import:", error);
      res.status(500).json({ message: "Failed to import cards from text" });
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
      
      // Log a few sample records to debug
      if (records.length > 0) {
        console.log("Sample record:", JSON.stringify(records[0]));
      }
      
      // Filter out empty rows or rows without essential data
      records = records.filter(record => {
        return record && (
          (record["Player Name"] || record["Card Name"]) || 
          (record["IMAGE URL"] !== undefined && record["Card Number"] !== undefined)
        );
      });
      
      console.log(`After filtering, ${records.length} valid records remain`);
      
      // Map the records based on the provided column mapping
      const cardRecords = records.map(record => {
        const mappedRecord: any = {};
        
        // Debug the raw record
        console.log("Processing record:", JSON.stringify(record));
        
        // Ensure we have a player name - prefer Player Name field, fallback to Card Name
        if (record["Player Name"] && record["Player Name"].trim()) {
          mappedRecord.playerName = record["Player Name"].trim();
        } else if (record["Card Name"] && record["Card Name"].trim()) {
          // Extract player name from card name
          const cardName = record["Card Name"].toString().trim();
          
          // Try to extract player name from card name patterns
          // First check if there's a pattern like "Card Set Name Player Name Card Details"
          const nameMatch = cardName.match(/(?:.*?)((?:[A-Z][a-z]+ )+[A-Z][a-z]+)/);
          if (nameMatch && nameMatch[1]) {
            mappedRecord.playerName = nameMatch[1].trim();
          } else {
            // Fallback: just use the card name
            mappedRecord.playerName = cardName;
          }
        } else {
          // Last resort: use a default name
          mappedRecord.playerName = "Unknown Player";
        }
        
        // Direct mapping of standard fields
        mappedRecord.sport = record["Sport"] ? record["Sport"].toLowerCase() : "soccer";
        mappedRecord.team = record["Team"] || null;
        mappedRecord.brand = record["Brand"] || null;
        mappedRecord.cardSet = record["Card Set"] || null;
        mappedRecord.cardNumber = record["Card Number"] || null;
        mappedRecord.condition = record["Condition"] ? record["Condition"].toLowerCase() : "new";
        mappedRecord.notes = record["Features"] || record["Card Name"] || null;
        
        // Handle image URLs - properly split the pipe-separated values
        if (record["IMAGE URL"]) {
          try {
            const imageUrl = record["IMAGE URL"].toString();
            console.log("Raw image URL field:", imageUrl);
            
            // Images could be separated by | or ||
            // First try to split by pipe character
            let imageUrls: string[] = [];
            
            if (imageUrl.includes('|')) {
              // Split by pipe character and handle potential whitespace
              imageUrls = imageUrl.split('|').map(url => url.trim()).filter(url => url.length > 0);
              console.log("Split image URLs by pipe:", imageUrls);
            } else {
              // If there's no pipe, treat as a single URL
              imageUrls = [imageUrl.trim()];
            }
            
            // Log all extracted URLs
            console.log(`Found ${imageUrls.length} image URLs:`, imageUrls);
            
            // Assign front and back image URLs
            if (imageUrls.length > 0 && imageUrls[0]) {
              mappedRecord.frontImageUrl = imageUrls[0];
              console.log(`Front image URL: ${mappedRecord.frontImageUrl}`);
            }
            
            if (imageUrls.length > 1 && imageUrls[1]) {
              mappedRecord.backImageUrl = imageUrls[1];
              console.log(`Back image URL: ${mappedRecord.backImageUrl}`);
            }
          } catch (error) {
            console.error("Error processing image URLs:", error);
          }
        }
        
        // Look for additional image URL fields in case they're split across columns
        const possibleImageFields = ["Image URL", "IMAGE URL", "Front Image URL", "Back Image URL", "Front Image", "Back Image"];
        for (const fieldName of possibleImageFields) {
          if (record[fieldName] && typeof record[fieldName] === 'string' && record[fieldName].trim().length > 0) {
            const url = record[fieldName].trim();
            
            // If it contains http:// or https://, it's likely a URL
            if (url.includes('http://') || url.includes('https://')) {
              if (fieldName.toLowerCase().includes('front') || !mappedRecord.frontImageUrl) {
                mappedRecord.frontImageUrl = url;
                console.log(`Found front image in field ${fieldName}: ${url}`);
              } else if (fieldName.toLowerCase().includes('back') && !mappedRecord.backImageUrl) {
                mappedRecord.backImageUrl = url;
                console.log(`Found back image in field ${fieldName}: ${url}`);
              }
            }
          }
        }
        
        // Handle season/year conversion - extract just the first year from ranges like 2023-2024
        if (record["Season"]) {
          try {
            const yearStr = record["Season"].toString();
            const yearMatch = yearStr.match(/(\d{4})/);
            if (yearMatch && yearMatch[1]) {
              mappedRecord.year = parseInt(yearMatch[1]);
            } else {
              mappedRecord.year = new Date().getFullYear(); // Default to current year if format is unexpected
            }
          } catch (error) {
            console.error("Error parsing year:", error);
            mappedRecord.year = new Date().getFullYear();
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
