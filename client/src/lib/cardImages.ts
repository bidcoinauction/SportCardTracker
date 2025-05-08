/**
 * Card image utilities
 */

// Default placeholder images for each sport type using CSS gradient backgrounds
const sportSpecificPlaceholders: Record<string, string> = {
  basketball: "linear-gradient(135deg, #3f94ea, #1565c0)",
  baseball: "linear-gradient(135deg, #43a047, #2e7d32)",
  football: "linear-gradient(135deg, #e53935, #c62828)",
  soccer: "linear-gradient(135deg, #673ab7, #4527a0)",
  hockey: "linear-gradient(135deg, #607d8b, #455a64)",
};

// Generic gradient for unknown sports
const defaultGradient = "linear-gradient(135deg, #9e9e9e, #616161)";

/**
 * Creates a data URL for an SVG image with gradient background
 * This doesn't rely on external services that might fail
 */
export function createCardImageSvg(playerName: string, sport: string, year?: string | number): string {
  const normalizedSport = sport?.toLowerCase().trim() || '';
  const gradient = sportSpecificPlaceholders[normalizedSport] || defaultGradient;
  
  // Clean the player name for display
  const displayName = playerName?.replace(/\+/g, ' ').trim() || 'Sports Card';
  const displayYear = year || '';
  
  // Create an SVG with gradient background and text
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <defs>
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.split(',')[0].replace('linear-gradient(135deg, ', '')}"/>
          <stop offset="100%" style="stop-color:${gradient.split(',')[1].replace(')', '')}"/>
        </linearGradient>
      </defs>
      <rect width="300" height="400" rx="15" ry="15" fill="url(#cardGradient)"/>
      <text x="150" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${displayName}</text>
      <text x="150" y="230" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white">${normalizedSport.charAt(0).toUpperCase() + normalizedSport.slice(1)}</text>
      <text x="150" y="260" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">${displayYear}</text>
    </svg>
  `;
  
  // Convert the SVG to a data URL
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Get a sport-specific placeholder image
 */
export function getSportSpecificImage(sport: string, playerName = '', year = ''): string {
  if (!sport) return createCardImageSvg('Sports Card', 'unknown');
  return createCardImageSvg(playerName, sport, year);
}

/**
 * Get a random card placeholder with the card's details
 */
export function getRandomCardImage(playerName: string, sport = ''): string {
  return createCardImageSvg(playerName, sport || 'unknown');
}