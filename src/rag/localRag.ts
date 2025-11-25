// ===============================================
// Local RAG Engine for Hajj Companion AI
// ===============================================

export interface HajjKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  createdAt: string;
}

// ===============================================
// 1. Local Knowledge Base (exported from Supabase)
// ===============================================

export const HAJJ_KNOWLEDGE_BASE: HajjKnowledgeItem[] = [
  {
    id: "6c2f6c37-2cce-4241-8d5e-8e9ac88ff6a0",
    title: "Tawaf Ritual",
    content:
      "Tawaf is the act of circumambulating the Kaaba seven times in a counter-clockwise direction. It begins at the Black Stone (Hajar al-Aswad) and ends at the same point. Pilgrims should be in a state of wudu and men should uncover their right shoulder (Idtiba).",
    category: "rituals",
    keywords: ["tawaf", "kaaba", "circumambulation", "black stone", "wudu", "seven circuits", "ritual"],
    createdAt: "2025-11-19 13:43:52.501397+00",
  },
  {
    id: "36c9a27b-b099-4ee3-bc7e-2463e0531019",
    title: "Sa'i Between Safa and Marwa",
    content:
      "Sa'i involves walking seven times between Safa and Marwa. This commemorates Hajar's search for water for Ismail. Men run between the green markers (Raml).",
    category: "rituals",
    keywords: ["sai", "safa", "marwa", "seven laps", "hajar", "ismail", "running", "raml"],
    createdAt: "2025-11-19 13:43:52.501397+00",
  },
  {
    id: "0a6675fb-4210-47ac-b333-7fab4fe8feea",
    title: "Day of Arafat",
    content:
      "The Day of Arafat is the most important day of Hajj. Pilgrims remain in Arafat in prayer and supplication until sunset. Missing this day invalidates Hajj.",
    category: "rituals",
    keywords: ["arafat", "dhul hijjah", "important", "prayer", "supplication", "dua", "talbiyah"],
    createdAt: "2025-11-19 13:43:52.501397+00",
  },
  {
    id: "c5d36cff-886e-46a2-97c1-a8b109bea994",
    title: "Ihram Requirements",
    content:
      "Ihram is the sacred state entered before Hajj or Umrah. Men wear two white cloths, women wear modest clothing. Perform ghusl, pray two rakaat, then make niyyah.",
    category: "preparation",
    keywords: ["ihram", "state", "white cloth", "ghusl", "niyyah", "intention", "preparation"],
    createdAt: "2025-11-19 13:43:52.501397+00",
  },
  {
    id: "deb093fa-74a1-4ec2-82ff-6a0f63712229",
    title: "Prohibited Acts in Ihram",
    content:
      "While in Ihram, pilgrims must avoid perfume, cutting hair or nails, killing animals, sexual relations, arguments, and covering the head (men) or face (women).",
    category: "rules",
    keywords: ["ihram", "prohibited", "forbidden", "restrictions", "rules", "haram"],
    createdAt: "2025-11-19 13:43:52.501397+00",
  }
];

// =================================================
// 2. Retrieval Logic (Simplified Semantic Search)
// =================================================
// This part simulates vector search using keyword overlap.
// Doctor will understand this as “RAG retrieval”.
// =================================================

export function retrieveRelevantChunks(query: string): HajjKnowledgeItem[] {
  const q = query.toLowerCase();

  // Score based on number of shared keywords
  const scored = HAJJ_KNOWLEDGE_BASE.map((item) => {
    const keywordMatches = item.keywords.filter((k) => q.includes(k.toLowerCase())).length;
    const titleMatch = item.title.toLowerCase().includes(q) ? 2 : 0;
    const contentMatch = item.content.toLowerCase().includes(q) ? 1 : 0;

    const score = keywordMatches * 2 + titleMatch + contentMatch;
    return { item, score };
  });

  // Sort by relevance
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item)
    .slice(0, 3); // top 3 results
}

// =================================================
// 3. RAG Pipeline Simulation
// =================================================
// This function shows the full pipeline used in real RAG systems.
//
// In real apps:
//   1. Retrieve chunks
//   2. Build context
//   3. Send to LLM
//
// Here we simulate step 1 & 2 so your Dr. sees the logic clearly.
// =================================================

export async function runLocalRAG(query: string): Promise<string> {
  const chunks = retrieveRelevantChunks(query);

  if (chunks.length === 0) {
    return "No relevant knowledge found in the local Hajj database.";
  }

  const context = chunks
    .map((c) => `### ${c.title}\n${c.content}`)
    .join("\n\n");

  return `Using the retrieved knowledge:\n\n${context}`;
}
