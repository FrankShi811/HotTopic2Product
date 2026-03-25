// Mockup Base Images (High-quality Unsplash assets)
export const MOCKUP_BASE_TSHIRT = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop"; 
export const MOCKUP_BASE_HOODIE = "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_MUG = "https://images.unsplash.com/photo-1517260739337-6799d2df60eb?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_PHONE = "https://images.unsplash.com/photo-1586105251261-72a756497a11?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_TOTE = "https://images.unsplash.com/photo-1597484662317-c9253e602540?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_CAP = "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_CUSHION = "https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?q=80&w=800&auto=format&fit=crop";
export const MOCKUP_BASE_POSTER = "https://images.unsplash.com/photo-1583705318952-385278216319?q=80&w=800&auto=format&fit=crop";

export const CROWDFUNDING_THRESHOLD = 15; // Votes needed to trigger funding
export const MAX_GENERATION_ITEMS = 3; // Items to generate per "scan"

// Prompt Engineering Templates
export const TREND_ANALYSIS_PROMPT = `
You are a trend forecasting engine for a high-end streetwear and lifestyle brand. 
Identify 25 fictional but realistic viral aesthetics or concepts that would appeal to Gen Z/Alpha on TikTok right now.
Focus on "core" aesthetics (e.g., Cyber-Y2K, Goblincore, Old Money Glitch, Solarpunk), abstract moods, or ironic memes.
CRITICAL: Do NOT use real copyrighted characters. Create original parodies or abstract art concepts.
Keep descriptions concise and evocative.
Return JSON format.
`;

export const DESIGN_PROMPT_PREFIX = "Professional product photography, highly detailed, photorealistic, cinematic lighting, 8k resolution, clean background.";