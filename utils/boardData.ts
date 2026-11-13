export type TileType =
  | "start"
  | "property"
  | "event"
  | "tax"
  | "jail"
  | "go_to_jail"
  | "free_parking"
  | "utility"
  | "railroad";

export type IndustryGroup =
  | "social_media" // Brown - cheapest
  | "food_beverage" // Light Blue
  | "automotive" // Pink
  | "airlines" // Orange
  | "semiconductors" // Red
  | "streaming" // Yellow
  | "ai_tech" // Green
  | "big_tech"; // Dark Blue - most expensive

export interface PropertyTile {
  id: number;
  index: number;
  type: "property";
  name: string;
  company: string;
  industry: IndustryGroup;
  color: string;
  price: number;
  baseRent: number;
  rentWithSet: number;
  rent1House: number;
  rent2Houses: number;
  rent3Houses: number;
  rent4Houses: number;
  rentHotel: number;
  houseCost: number;
  hotelCost: number;
}

export interface SpecialTile {
  id: number;
  index: number;
  type: Exclude<TileType, "property">;
  name: string;
  description?: string;
  amount?: number; // For tax tiles
}

export interface RailroadTile {
  id: number;
  index: number;
  type: "railroad";
  name: string;
  price: number;
  baseRent: number; // 25 for 1, 50 for 2, 100 for 3, 200 for 4
}

export interface UtilityTile {
  id: number;
  index: number;
  type: "utility";
  name: string;
  price: number;
  rentMultiplier: number; // 4x dice if own 1, 10x if own both
}

export type BoardTile = PropertyTile | SpecialTile | RailroadTile | UtilityTile;

// Classic Monopoly board layout with real companies
export const BOARD_TILES: BoardTile[] = [
  // Start (GO)
  {
    id: 0,
    index: 0,
    type: "start",
    name: "GO",
    description: "Collect $200 salary",
  },

  // Social Media (Brown/Purple) - Cheapest
  {
    id: 1,
    index: 1,
    type: "property",
    name: "X",
    company: "X (Twitter)",
    industry: "social_media",
    color: "#8B4513",
    price: 60,
    baseRent: 2,
    rentWithSet: 4,
    rent1House: 10,
    rent2Houses: 30,
    rent3Houses: 90,
    rent4Houses: 160,
    rentHotel: 250,
    houseCost: 50,
    hotelCost: 50,
  },

  // Event
  {
    id: 2,
    index: 2,
    type: "event",
    name: "Tech Event",
    description: "Draw an event card",
  },

  // Social Media (Brown/Purple)
  {
    id: 3,
    index: 3,
    type: "property",
    name: "TikTok",
    company: "TikTok",
    industry: "social_media",
    color: "#8B4513",
    price: 60,
    baseRent: 4,
    rentWithSet: 8,
    rent1House: 20,
    rent2Houses: 60,
    rent3Houses: 180,
    rent4Houses: 320,
    rentHotel: 450,
    houseCost: 50,
    hotelCost: 50,
  },

  // Income Tax
  {
    id: 4,
    index: 4,
    type: "tax",
    name: "Income Tax",
    description: "Pay $200 or 10%",
    amount: 200,
  },

  // Railroad 1
  {
    id: 5,
    index: 5,
    type: "railroad",
    name: "Heathrow Airport",
    price: 200,
    baseRent: 25,
  },

  // Food & Beverage (Light Blue)
  {
    id: 6,
    index: 6,
    type: "property",
    name: "Jarritos",
    company: "Jarritos",
    industry: "food_beverage",
    color: "#87CEEB",
    price: 100,
    baseRent: 6,
    rentWithSet: 12,
    rent1House: 30,
    rent2Houses: 90,
    rent3Houses: 270,
    rent4Houses: 400,
    rentHotel: 550,
    houseCost: 50,
    hotelCost: 50,
  },

  // Event
  {
    id: 7,
    index: 7,
    type: "event",
    name: "Market Event",
    description: "Draw an event card",
  },

  // Food & Beverage (Light Blue)
  {
    id: 8,
    index: 8,
    type: "property",
    name: "Pepsi",
    company: "PepsiCo",
    industry: "food_beverage",
    color: "#87CEEB",
    price: 100,
    baseRent: 6,
    rentWithSet: 12,
    rent1House: 30,
    rent2Houses: 90,
    rent3Houses: 270,
    rent4Houses: 400,
    rentHotel: 550,
    houseCost: 50,
    hotelCost: 50,
  },
  {
    id: 9,
    index: 9,
    type: "property",
    name: "Coca-Cola",
    company: "Coca-Cola",
    industry: "food_beverage",
    color: "#87CEEB",
    price: 120,
    baseRent: 8,
    rentWithSet: 16,
    rent1House: 40,
    rent2Houses: 100,
    rent3Houses: 300,
    rent4Houses: 450,
    rentHotel: 600,
    houseCost: 50,
    hotelCost: 50,
  },

  // Jail (Just Visiting)
  {
    id: 10,
    index: 10,
    type: "jail",
    name: "Jail",
    description: "Just visiting / In jail",
  },

  // Automotive (Pink)
  {
    id: 11,
    index: 11,
    type: "property",
    name: "BYD",
    company: "BYD Auto",
    industry: "automotive",
    color: "#FF69B4",
    price: 140,
    baseRent: 10,
    rentWithSet: 20,
    rent1House: 50,
    rent2Houses: 150,
    rent3Houses: 450,
    rent4Houses: 625,
    rentHotel: 750,
    houseCost: 100,
    hotelCost: 100,
  },

  // Utility 1
  {
    id: 12,
    index: 12,
    type: "utility",
    name: "Electric Company",
    price: 150,
    rentMultiplier: 4,
  },

  // Automotive (Pink)
  {
    id: 13,
    index: 13,
    type: "property",
    name: "Honda",
    company: "Honda Motor",
    industry: "automotive",
    color: "#FF69B4",
    price: 140,
    baseRent: 10,
    rentWithSet: 20,
    rent1House: 50,
    rent2Houses: 150,
    rent3Houses: 450,
    rent4Houses: 625,
    rentHotel: 750,
    houseCost: 100,
    hotelCost: 100,
  },
  {
    id: 14,
    index: 14,
    type: "property",
    name: "Ford",
    company: "Ford Motor",
    industry: "automotive",
    color: "#FF69B4",
    price: 160,
    baseRent: 12,
    rentWithSet: 24,
    rent1House: 60,
    rent2Houses: 180,
    rent3Houses: 500,
    rent4Houses: 700,
    rentHotel: 900,
    houseCost: 100,
    hotelCost: 100,
  },

  // Railroad 2
  {
    id: 15,
    index: 15,
    type: "railroad",
    name: "Dubai Airport",
    price: 200,
    baseRent: 25,
  },

  // Airlines (Orange)
  {
    id: 16,
    index: 16,
    type: "property",
    name: "JetBlue",
    company: "JetBlue Airways",
    industry: "airlines",
    color: "#FFA500",
    price: 180,
    baseRent: 14,
    rentWithSet: 28,
    rent1House: 70,
    rent2Houses: 200,
    rent3Houses: 550,
    rent4Houses: 750,
    rentHotel: 950,
    houseCost: 100,
    hotelCost: 100,
  },

  // Event
  {
    id: 17,
    index: 17,
    type: "event",
    name: "Global Event",
    description: "Draw an event card",
  },

  // Airlines (Orange)
  {
    id: 18,
    index: 18,
    type: "property",
    name: "American",
    company: "American Airlines",
    industry: "airlines",
    color: "#FFA500",
    price: 180,
    baseRent: 14,
    rentWithSet: 28,
    rent1House: 70,
    rent2Houses: 200,
    rent3Houses: 550,
    rent4Houses: 750,
    rentHotel: 950,
    houseCost: 100,
    hotelCost: 100,
  },
  {
    id: 19,
    index: 19,
    type: "property",
    name: "Aeromexico",
    company: "Aeromexico",
    industry: "airlines",
    color: "#FFA500",
    price: 200,
    baseRent: 16,
    rentWithSet: 32,
    rent1House: 80,
    rent2Houses: 220,
    rent3Houses: 600,
    rent4Houses: 800,
    rentHotel: 1000,
    houseCost: 100,
    hotelCost: 100,
  },

  // Free Parking
  {
    id: 20,
    index: 20,
    type: "free_parking",
    name: "Free Parking",
    description: "No action",
  },

  // Semiconductors (Red)
  {
    id: 21,
    index: 21,
    type: "property",
    name: "AMD",
    company: "AMD (Radeon)",
    industry: "semiconductors",
    color: "#FF0000",
    price: 220,
    baseRent: 18,
    rentWithSet: 36,
    rent1House: 90,
    rent2Houses: 250,
    rent3Houses: 700,
    rent4Houses: 875,
    rentHotel: 1050,
    houseCost: 150,
    hotelCost: 150,
  },

  // Event
  {
    id: 22,
    index: 22,
    type: "event",
    name: "Industry Event",
    description: "Draw an event card",
  },

  // Semiconductors (Red)
  {
    id: 23,
    index: 23,
    type: "property",
    name: "Intel",
    company: "Intel",
    industry: "semiconductors",
    color: "#FF0000",
    price: 220,
    baseRent: 18,
    rentWithSet: 36,
    rent1House: 90,
    rent2Houses: 250,
    rent3Houses: 700,
    rent4Houses: 875,
    rentHotel: 1050,
    houseCost: 150,
    hotelCost: 150,
  },
  {
    id: 24,
    index: 24,
    type: "property",
    name: "NVIDIA",
    company: "NVIDIA",
    industry: "semiconductors",
    color: "#FF0000",
    price: 240,
    baseRent: 20,
    rentWithSet: 40,
    rent1House: 100,
    rent2Houses: 300,
    rent3Houses: 750,
    rent4Houses: 925,
    rentHotel: 1100,
    houseCost: 150,
    hotelCost: 150,
  },

  // Railroad 3
  {
    id: 25,
    index: 25,
    type: "railroad",
    name: "JFK Airport",
    price: 200,
    baseRent: 25,
  },

  // Streaming (Yellow)
  {
    id: 26,
    index: 26,
    type: "property",
    name: "Disney+",
    company: "Disney",
    industry: "streaming",
    color: "#FFFF00",
    price: 260,
    baseRent: 22,
    rentWithSet: 44,
    rent1House: 110,
    rent2Houses: 330,
    rent3Houses: 800,
    rent4Houses: 975,
    rentHotel: 1150,
    houseCost: 150,
    hotelCost: 150,
  },
  {
    id: 27,
    index: 27,
    type: "property",
    name: "HBO Max",
    company: "Warner Bros",
    industry: "streaming",
    color: "#FFFF00",
    price: 260,
    baseRent: 22,
    rentWithSet: 44,
    rent1House: 110,
    rent2Houses: 330,
    rent3Houses: 800,
    rent4Houses: 975,
    rentHotel: 1150,
    houseCost: 150,
    hotelCost: 150,
  },

  // Utility 2
  {
    id: 28,
    index: 28,
    type: "utility",
    name: "Water Works",
    price: 150,
    rentMultiplier: 4,
  },

  // Streaming (Yellow)
  {
    id: 29,
    index: 29,
    type: "property",
    name: "Netflix",
    company: "Netflix",
    industry: "streaming",
    color: "#FFFF00",
    price: 280,
    baseRent: 24,
    rentWithSet: 48,
    rent1House: 120,
    rent2Houses: 360,
    rent3Houses: 850,
    rent4Houses: 1025,
    rentHotel: 1200,
    houseCost: 150,
    hotelCost: 150,
  },

  // Go to Jail
  {
    id: 30,
    index: 30,
    type: "go_to_jail",
    name: "Go to Jail",
    description: "Go directly to jail",
  },

  // AI Tech (Green)
  {
    id: 31,
    index: 31,
    type: "property",
    name: "Grok",
    company: "xAI",
    industry: "ai_tech",
    color: "#00FF00",
    price: 300,
    baseRent: 26,
    rentWithSet: 52,
    rent1House: 130,
    rent2Houses: 390,
    rent3Houses: 900,
    rent4Houses: 1100,
    rentHotel: 1275,
    houseCost: 200,
    hotelCost: 200,
  },
  {
    id: 32,
    index: 32,
    type: "property",
    name: "Claude",
    company: "Anthropic",
    industry: "ai_tech",
    color: "#00FF00",
    price: 300,
    baseRent: 26,
    rentWithSet: 52,
    rent1House: 130,
    rent2Houses: 390,
    rent3Houses: 900,
    rent4Houses: 1100,
    rentHotel: 1275,
    houseCost: 200,
    hotelCost: 200,
  },

  // Event
  {
    id: 33,
    index: 33,
    type: "event",
    name: "Innovation Event",
    description: "Draw an event card",
  },

  // AI Tech (Green)
  {
    id: 34,
    index: 34,
    type: "property",
    name: "OpenAI",
    company: "OpenAI",
    industry: "ai_tech",
    color: "#00FF00",
    price: 320,
    baseRent: 28,
    rentWithSet: 56,
    rent1House: 150,
    rent2Houses: 450,
    rent3Houses: 1000,
    rent4Houses: 1200,
    rentHotel: 1400,
    houseCost: 200,
    hotelCost: 200,
  },

  // Railroad 4
  {
    id: 35,
    index: 35,
    type: "railroad",
    name: "Narita Airport",
    price: 200,
    baseRent: 25,
  },

  // Event
  {
    id: 36,
    index: 36,
    type: "event",
    name: "Tech Boom",
    description: "Draw an event card",
  },

  // Big Tech (Dark Blue) - Most expensive
  {
    id: 37,
    index: 37,
    type: "property",
    name: "Amazon",
    company: "Amazon",
    industry: "big_tech",
    color: "#00008B",
    price: 350,
    baseRent: 35,
    rentWithSet: 70,
    rent1House: 175,
    rent2Houses: 500,
    rent3Houses: 1100,
    rent4Houses: 1300,
    rentHotel: 1500,
    houseCost: 200,
    hotelCost: 200,
  },

  // Luxury Tax
  {
    id: 38,
    index: 38,
    type: "tax",
    name: "Luxury Tax",
    description: "Pay $100",
    amount: 100,
  },

  // Big Tech (Dark Blue)
  {
    id: 39,
    index: 39,
    type: "property",
    name: "Microsoft",
    company: "Microsoft",
    industry: "big_tech",
    color: "#00008B",
    price: 400,
    baseRent: 50,
    rentWithSet: 100,
    rent1House: 200,
    rent2Houses: 600,
    rent3Houses: 1400,
    rent4Houses: 1700,
    rentHotel: 2000,
    houseCost: 200,
    hotelCost: 200,
  },
];

// Helper functions
export function getTileByIndex(index: number): BoardTile | undefined {
  return BOARD_TILES.find((tile) => tile.index === index);
}

export function getPropertiesByIndustry(
  industry: IndustryGroup
): PropertyTile[] {
  return BOARD_TILES.filter(
    (tile): tile is PropertyTile =>
      tile.type === "property" && tile.industry === industry
  );
}

export function calculateRent(
  property: PropertyTile,
  ownsFullSet: boolean,
  houses: number,
  hotels: number
): number {
  if (hotels > 0) return property.rentHotel;
  if (houses === 4) return property.rent4Houses;
  if (houses === 3) return property.rent3Houses;
  if (houses === 2) return property.rent2Houses;
  if (houses === 1) return property.rent1House;
  if (ownsFullSet) return property.rentWithSet;
  return property.baseRent;
}

export function calculateRailroadRent(ownedCount: number): number {
  switch (ownedCount) {
    case 1:
      return 25;
    case 2:
      return 50;
    case 3:
      return 100;
    case 4:
      return 200;
    default:
      return 0;
  }
}

export function calculateUtilityRent(
  ownedCount: number,
  diceRoll: number
): number {
  return ownedCount === 2 ? diceRoll * 10 : diceRoll * 4;
}

// Board configuration
export const BOARD_CONFIG = {
  totalTiles: 40,
  startBonus: 200,
  jailBail: 50,
  maxHousesPerProperty: 4,
  maxHotelsPerProperty: 1,
  housesInBank: 32,
  hotelsInBank: 12,
};
