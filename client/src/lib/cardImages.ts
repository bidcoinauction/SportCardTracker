/**
 * Card image utilities
 */

// Default placeholder images for each sport type
const sportSpecificPlaceholders: Record<string, string> = {
  basketball: "https://via.placeholder.com/300x400/3f94ea/ffffff?text=Basketball+Card",
  baseball: "https://via.placeholder.com/300x400/43a047/ffffff?text=Baseball+Card",
  football: "https://via.placeholder.com/300x400/e53935/ffffff?text=Football+Card",
  soccer: "https://via.placeholder.com/300x400/673ab7/ffffff?text=Soccer+Card",
  hockey: "https://via.placeholder.com/300x400/607d8b/ffffff?text=Hockey+Card",
};

// Random card placeholder images
const cardPlaceholders = [
  "https://via.placeholder.com/300x400/4a148c/ffffff?text=Sports+Card",
  "https://via.placeholder.com/300x400/1a237e/ffffff?text=Trading+Card",
  "https://via.placeholder.com/300x400/01579b/ffffff?text=Collectible+Card",
  "https://via.placeholder.com/300x400/004d40/ffffff?text=Card+Collection",
  "https://via.placeholder.com/300x400/bf360c/ffffff?text=Sports+Card",
];

/**
 * Get a sport-specific placeholder image
 */
export function getSportSpecificImage(sport: string): string | null {
  if (!sport) return null;
  
  const normalizedSport = sport.toLowerCase().trim();
  return sportSpecificPlaceholders[normalizedSport] || null;
}

/**
 * Get a random card placeholder image
 */
export function getRandomCardImage(): string {
  const randomIndex = Math.floor(Math.random() * cardPlaceholders.length);
  return cardPlaceholders[randomIndex];
}