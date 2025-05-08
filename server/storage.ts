import { 
  cards, 
  type Card, 
  type InsertCard, 
  valueHistory, 
  type ValueHistory, 
  type InsertValueHistory,
  users,
  type User,
  type InsertUser
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Card methods
  getAllCards(): Promise<Card[]>;
  getCardById(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: number): Promise<boolean>;
  
  // Value history methods
  getValueHistoryByCardId(cardId: number): Promise<ValueHistory[]>;
  addValueHistory(history: InsertValueHistory): Promise<ValueHistory>;
  
  // Analytics methods
  getCollectionStats(): Promise<{
    totalCards: number;
    totalValue: number;
    mostValuableCard: Card | null;
    averageValue: number;
  }>;
  getValueByCategory(): Promise<{
    sport: string;
    totalValue: number;
    percentage: number;
  }[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cards: Map<number, Card>;
  private valueHistories: Map<number, ValueHistory>;
  private userCurrentId: number;
  private cardCurrentId: number;
  private valueHistoryCurrentId: number;

  constructor() {
    this.users = new Map();
    this.cards = new Map();
    this.valueHistories = new Map();
    this.userCurrentId = 1;
    this.cardCurrentId = 1;
    this.valueHistoryCurrentId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Card methods
  async getAllCards(): Promise<Card[]> {
    return Array.from(this.cards.values());
  }
  
  async getCardById(id: number): Promise<Card | undefined> {
    return this.cards.get(id);
  }
  
  async createCard(insertCard: InsertCard): Promise<Card> {
    const id = this.cardCurrentId++;
    const card: Card = { 
      ...insertCard, 
      id, 
      addedDate: new Date(),
      priceHistory: [{ date: new Date().toISOString(), value: Number(insertCard.estimatedValue) }] 
    };
    this.cards.set(id, card);
    
    // Add initial value history entry
    await this.addValueHistory({
      cardId: id,
      value: insertCard.estimatedValue
    });
    
    return card;
  }
  
  async updateCard(id: number, updateData: Partial<InsertCard>): Promise<Card | undefined> {
    const existingCard = this.cards.get(id);
    
    if (!existingCard) {
      return undefined;
    }
    
    // Check if value changed
    if (updateData.estimatedValue && updateData.estimatedValue !== existingCard.estimatedValue) {
      // Add new value history
      await this.addValueHistory({
        cardId: id,
        value: updateData.estimatedValue
      });
      
      // Update price history
      const priceHistory = existingCard.priceHistory || [];
      priceHistory.push({
        date: new Date().toISOString(),
        value: Number(updateData.estimatedValue)
      });
      updateData.priceHistory = priceHistory;
    }
    
    const updatedCard: Card = { ...existingCard, ...updateData };
    this.cards.set(id, updatedCard);
    
    return updatedCard;
  }
  
  async deleteCard(id: number): Promise<boolean> {
    return this.cards.delete(id);
  }
  
  // Value history methods
  async getValueHistoryByCardId(cardId: number): Promise<ValueHistory[]> {
    return Array.from(this.valueHistories.values())
      .filter(history => history.cardId === cardId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async addValueHistory(insertHistory: InsertValueHistory): Promise<ValueHistory> {
    const id = this.valueHistoryCurrentId++;
    const history: ValueHistory = {
      ...insertHistory,
      id,
      date: new Date()
    };
    
    this.valueHistories.set(id, history);
    return history;
  }
  
  // Analytics methods
  async getCollectionStats(): Promise<{
    totalCards: number;
    totalValue: number;
    mostValuableCard: Card | null;
    averageValue: number;
  }> {
    const cards = Array.from(this.cards.values());
    const totalCards = cards.length;
    
    let totalValue = 0;
    let mostValuableCard: Card | null = null;
    let highestValue = 0;
    
    for (const card of cards) {
      const value = Number(card.estimatedValue);
      totalValue += value;
      
      if (value > highestValue) {
        highestValue = value;
        mostValuableCard = card;
      }
    }
    
    const averageValue = totalCards > 0 ? totalValue / totalCards : 0;
    
    return {
      totalCards,
      totalValue,
      mostValuableCard,
      averageValue
    };
  }
  
  async getValueByCategory(): Promise<{
    sport: string;
    totalValue: number;
    percentage: number;
  }[]> {
    const cards = Array.from(this.cards.values());
    const sportMap = new Map<string, number>();
    let totalValue = 0;
    
    // Calculate total value by sport
    for (const card of cards) {
      const value = Number(card.estimatedValue);
      totalValue += value;
      
      const currentValue = sportMap.get(card.sport) || 0;
      sportMap.set(card.sport, currentValue + value);
    }
    
    // Calculate percentages
    const result = Array.from(sportMap.entries()).map(([sport, value]) => ({
      sport,
      totalValue: value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }));
    
    // Sort by total value descending
    return result.sort((a, b) => b.totalValue - a.totalValue);
  }
  
  // Helper method to initialize sample data
  private initializeSampleData(): void {
    // Create sample user
    this.createUser({
      username: "demo",
      password: "password"
    });

    // Create sample cards
    const sampleCards: InsertCard[] = [
      {
        playerName: "LeBron James",
        team: "Los Angeles Lakers",
        sport: "basketball",
        year: 2020,
        brandSet: "Panini Prizm",
        cardNumber: "#6",
        condition: "mint",
        grade: "PSA 9",
        estimatedValue: 1200,
        notes: "Special edition, silver prizm",
        frontImageUrl: "https://pixabay.com/get/g915589d14548e64fc1b4b0c75eb1f77121baa759bb1f8822bdd16c4da9e7095452ecb7b41d163744f4c22db5d36c1a74667a1379facd59679be8f034ee04a0a1_1280.jpg",
        backImageUrl: "",
        priceHistory: [
          { date: "2023-01-01T00:00:00Z", value: 1000 },
          { date: "2023-03-01T00:00:00Z", value: 1100 },
          { date: "2023-06-01T00:00:00Z", value: 1150 },
          { date: "2023-09-01T00:00:00Z", value: 1200 }
        ]
      },
      {
        playerName: "Mike Trout",
        team: "LA Angels",
        sport: "baseball",
        year: 2018,
        brandSet: "Topps Chrome",
        cardNumber: "#17",
        condition: "nearMint",
        grade: "BGS 9.5",
        estimatedValue: 850,
        notes: "Refractor parallel",
        frontImageUrl: "https://images.unsplash.com/photo-1556866261-8763a7662333",
        backImageUrl: "",
        priceHistory: [
          { date: "2023-01-01T00:00:00Z", value: 800 },
          { date: "2023-06-01T00:00:00Z", value: 825 },
          { date: "2023-12-01T00:00:00Z", value: 850 }
        ]
      },
      {
        playerName: "Patrick Mahomes",
        team: "Kansas City Chiefs",
        sport: "football",
        year: 2019,
        brandSet: "Panini Prizm",
        cardNumber: "#22",
        condition: "mint",
        grade: "PSA 10",
        estimatedValue: 950,
        notes: "Red white and blue parallel",
        frontImageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390",
        backImageUrl: "",
        priceHistory: [
          { date: "2023-01-01T00:00:00Z", value: 900 },
          { date: "2023-04-01T00:00:00Z", value: 920 },
          { date: "2023-08-01T00:00:00Z", value: 950 }
        ]
      },
      {
        playerName: "Connor McDavid",
        team: "Edmonton Oilers",
        sport: "hockey",
        year: 2020,
        brandSet: "Upper Deck",
        cardNumber: "#97",
        condition: "nearMint",
        grade: "Raw",
        estimatedValue: 650,
        notes: "Young Guns rookie card",
        frontImageUrl: "https://pixabay.com/get/gfcf9caf88beb6b39f6d8c8986076dd8172c7834ed97fd6d450e76a753cf0b051ca53d7b99cba0abb4866343a7f7ca217b8b2fda507845ce1ccbc8bd8eebcdd08_1280.jpg",
        backImageUrl: "",
        priceHistory: [
          { date: "2023-01-01T00:00:00Z", value: 600 },
          { date: "2023-07-01T00:00:00Z", value: 625 },
          { date: "2023-12-01T00:00:00Z", value: 650 }
        ]
      }
    ];
    
    for (const card of sampleCards) {
      this.createCard(card);
    }
  }
}

export const storage = new MemStorage();
