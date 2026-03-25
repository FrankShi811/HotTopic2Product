export enum ProductStatus {
  DRAFT = 'DRAFT',
  CROWDFUNDING = 'CROWDFUNDING',
  FUNDED = 'FUNDED',
  PRODUCTION = 'PRODUCTION'
}

export enum ProductType {
  TSHIRT = 'T-Shirt',
  HOODIE = 'Hoodie',
  CAP = 'Cap',
  TOTE = 'Tote Bag',
  MUG = 'Mug',
  PHONE_CASE = 'Phone Case',
  CUSHION = 'Cushion',
  POSTER = 'Art Poster'
}

export interface Trend {
  id: string;
  topic: string;
  platform: 'TikTok' | 'Instagram' | 'Facebook';
  context: string;
  visualStyle: string;
  score: number;
}

export interface ProductDetails {
  coreConcept: string;
  designAppearance: string;
  coreInnovation: string;
  usageScenarios: string;
}

export interface GeneratedDesign {
  imageUrl: string; // Base64 or URL
  promptUsed: string;
  details: ProductDetails;
}

export interface Product {
  id: string;
  trendId: string;
  title: string;
  description: string;
  type: ProductType;
  designUrl: string; // The generated artwork
  details?: ProductDetails;
  votes: number;
  preOrders: number;
  status: ProductStatus;
  price: number;
  createdAt: number;
  fundingProgress: number; // 0 to 100
}

export interface SystemState {
  isScanning: boolean;
  isGenerating: boolean;
  logs: string[];
}

export interface AppSettings {
  trendPrompt: string;
  designStylePrompt: string;
  fundingThreshold: number;
  productionThreshold: number;
}