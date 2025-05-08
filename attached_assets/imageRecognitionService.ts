import Anthropic from '@anthropic-ai/sdk';
import { Card, InsertCard } from '@shared/schema';

// Create an instance of the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Maps MIME types to the formats Anthropic API accepts
 */
function getValidMediaType(contentType: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const loweredType = contentType.toLowerCase();
  if (loweredType.includes('jpeg') || loweredType.includes('jpg')) {
    return "image/jpeg";
  } else if (loweredType.includes('png')) {
    return "image/png";
  } else if (loweredType.includes('gif')) {
    return "image/gif";
  } else if (loweredType.includes('webp')) {
    return "image/webp";
  }
  
  // Default to JPEG if we can't determine
  return "image/jpeg";
}

/**
 * Identify a card from an uploaded image using Claude vision model
 */
export async function identifyCardFromImage(
  base64Image: string,
  contentType: string
): Promise<{
  success: boolean;
  card?: Partial<InsertCard>;
  error?: string;
}> {
  try {
    // Basic validation
    if (!base64Image) {
      return { success: false, error: "No image data provided" };
    }

    // Form the system prompt for Claude
    const systemPrompt = `You are a trading card recognition expert. 
Analyze the image of the trading card and extract the following information:
- Player name
- Sport (baseball, basketball, football, hockey, soccer, etc.)
- Card year
- Card brand (manufacturer like Topps, Panini, Upper Deck, etc.)
- Card set name
- Card number (if visible)
- Condition (assume "new" if not clearly damaged)

If any information is not visible or cannot be determined, leave it blank.
Return the information as valid JSON with these exact keys: playerName, sport, year, brand, cardSet, cardNumber, condition.
ONLY return the JSON, nothing else.`;

    // Call Claude with the image
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getValidMediaType(contentType),
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Analyze this trading card and extract the information as JSON as specified in your instructions.',
            },
          ],
        },
      ],
    });

    // Parse the response
    const textContent = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '{}';
    
    // Extract the JSON from the response
    let cardData;
    try {
      // Try direct parsing first
      cardData = JSON.parse(textContent);
    } catch (e) {
      // Try to extract JSON from text if direct parsing fails
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cardData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from response");
      }
    }
    
    // Transform to InsertCard format
    const card: Partial<InsertCard> = {
      playerName: cardData.playerName || '',
      sport: cardData.sport?.toLowerCase() || 'other',
      year: cardData.year ? parseInt(cardData.year, 10) : new Date().getFullYear(),
      brand: cardData.brand || '',
      cardSet: cardData.cardSet || '',
      cardNumber: cardData.cardNumber || '',
      condition: cardData.condition?.toLowerCase() || 'new',
      purchasePrice: 0,
      notes: `${cardData.cardSet || ''} ${cardData.cardNumber || ''}`.trim(),
      imageUrl: '', // Will be filled in by the server if image is uploaded
    };

    // Basic validation
    if (!card.playerName) {
      return { 
        success: false, 
        card,
        error: "Could not identify player name from the image. Please enter card details manually." 
      };
    }

    return { success: true, card };
  } catch (error: any) {
    console.error('Error in identifyCardFromImage:', error);
    return { 
      success: false, 
      error: `Error identifying card: ${error?.message || 'Unknown error'}` 
    };
  }
}

/**
 * Generate a description for a card using Claude
 */
export async function generateCardDescription(
  card: Partial<Card>
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a brief, professional description for this trading card:
Player: ${card.playerName}
Sport: ${card.sport}
Year: ${card.year}
Brand: ${card.brand}
Set: ${card.cardSet || 'Unknown'}
Card Number: ${card.cardNumber || 'Unknown'}

Please keep it factual and focused on what makes this card noteworthy.`,
        },
      ],
    });

    const textContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';
      
    return textContent.trim();
  } catch (error: any) {
    console.error('Error in generateCardDescription:', error);
    return '';
  }
}