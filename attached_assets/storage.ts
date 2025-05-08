import { cards, type Card, type InsertCard, users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, like, and, or, gte, lte, lt, desc, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Card operations
  getAllCards(): Promise<Card[]>;
  getCard(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: number): Promise<boolean>;
  deleteAllCards(): Promise<number>; // Returns count of deleted cards
  
  // Get cards with filtering and sorting
  getFilteredCards(params: {
    search?: string;
    sport?: string;
    year?: string;
    brand?: string;
    condition?: string;
    sortBy?: string;
  }): Promise<Card[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllCards(): Promise<Card[]> {
    return await db.select().from(cards).orderBy(desc(cards.id));
  }

  async getCard(id: number): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card || undefined;
  }

  async createCard(insertCard: InsertCard): Promise<Card> {
    const [card] = await db
      .insert(cards)
      .values(insertCard)
      .returning();
    return card;
  }

  async updateCard(id: number, updateData: Partial<InsertCard>): Promise<Card | undefined> {
    const [updatedCard] = await db
      .update(cards)
      .set(updateData)
      .where(eq(cards.id, id))
      .returning();
    
    return updatedCard || undefined;
  }

  async deleteCard(id: number): Promise<boolean> {
    const [deletedCard] = await db
      .delete(cards)
      .where(eq(cards.id, id))
      .returning({ id: cards.id });
    
    return !!deletedCard;
  }
  
  async deleteAllCards(): Promise<number> {
    // Get the count of cards first
    const allCards = await db.select({ id: cards.id }).from(cards);
    const count = allCards.length;
    
    // Delete all cards
    await db.delete(cards);
    
    return count;
  }

  async getFilteredCards(params: {
    search?: string;
    sport?: string;
    year?: string;
    brand?: string;
    condition?: string;
    sortBy?: string;
  }): Promise<Card[]> {
    let query = db.select().from(cards);
    
    // Build filters
    const filters = [];
    
    // Search filter
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      filters.push(
        or(
          like(cards.playerName, searchTerm),
          like(cards.brand, searchTerm),
          like(cards.cardSet, searchTerm),
          like(cards.notes, searchTerm)
        )
      );
    }
    
    // Sport filter
    if (params.sport && params.sport !== 'all') {
      filters.push(eq(cards.sport, params.sport));
    }
    
    // Year filter
    if (params.year && params.year !== 'all') {
      if (params.year.includes('-')) {
        // Handle range like 2010-2019
        const [start, end] = params.year.split('-').map(Number);
        filters.push(and(gte(cards.year, start), lte(cards.year, end)));
      } else {
        // Handle exact year
        filters.push(eq(cards.year, Number(params.year)));
      }
    }
    
    // Brand filter
    if (params.brand && params.brand !== 'all') {
      filters.push(eq(cards.brand, params.brand));
    }
    
    // Condition filter
    if (params.condition && params.condition !== 'all') {
      filters.push(eq(cards.condition, params.condition));
    }
    
    // Apply all filters
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }
    
    // Apply sorting
    if (params.sortBy) {
      switch (params.sortBy) {
        case 'recent':
          query = query.orderBy(desc(cards.createdAt));
          break;
        case 'playerNameAsc':
          query = query.orderBy(asc(cards.playerName));
          break;
        case 'playerNameDesc':
          query = query.orderBy(desc(cards.playerName));
          break;
        case 'valueDesc':
          query = query.orderBy(desc(cards.currentValue));
          break;
        case 'valueAsc':
          query = query.orderBy(asc(cards.currentValue));
          break;
        case 'yearDesc':
          query = query.orderBy(desc(cards.year));
          break;
        case 'yearAsc':
          query = query.orderBy(asc(cards.year));
          break;
        default:
          // Default to most recent by ID
          query = query.orderBy(desc(cards.id));
      }
    } else {
      // Default sort by most recent
      query = query.orderBy(desc(cards.id));
    }
    
    return await query;
  }
}

export const storage = new DatabaseStorage();