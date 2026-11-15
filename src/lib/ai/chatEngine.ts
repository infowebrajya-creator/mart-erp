import { SOFTWARE_KNOWLEDGE_BASE } from './softwareKnowledge';

export interface LiveStoreContext {
  totalProducts: number;
  lowStockCount: number;
  lowStockSample: string[];
  todaySalesCount: number;
  todaySalesRevenue: number;
  totalCustomersWithDue: number;
  totalKhataOutstanding: number;
}

export interface ChatActionItem {
  type: string;
  label: string;
  icon?: string;
}

export interface AssistantTurnResponse {
  cleanText: string;
  actions: ChatActionItem[];
}

const ACTION_MAP: Record<string, { label: string; icon?: string }> = {
  NAVIGATE_BILLING: { label: 'Go to Billing', icon: 'Receipt' },
  NAVIGATE_INVENTORY: { label: 'Go to Inventory', icon: 'Package' },
  NAVIGATE_CUSTOMERS: { label: 'Go to Customers & Khata', icon: 'Users' },
  NAVIGATE_REPORTS: { label: 'Go to Reports', icon: 'BarChart3' },
  NAVIGATE_SETTINGS: { label: 'Go to Settings', icon: 'Settings' },
  OPEN_BILL_SCANNER: { label: 'Scan Purchase Bill', icon: 'Camera' },
  OPEN_STOCK_TAKE: { label: 'Start Stock Take Audit', icon: 'ClipboardCheck' },
  OPEN_REORDER_ASSISTANT: { label: 'Open Reorder Assistant', icon: 'Sparkles' }
};

/**
 * Extracts [ACTION:XXXX] tags from model text and maps them to clean actionable buttons
 */
export function parseActionsFromText(rawText: string): AssistantTurnResponse {
  const actions: ChatActionItem[] = [];
  const actionRegex = /\[ACTION:([A-Z_]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = actionRegex.exec(rawText)) !== null) {
    const actionKey = match[1];
    const mapping = ACTION_MAP[actionKey];
    if (mapping && !actions.some(a => a.type === actionKey)) {
      actions.push({
        type: actionKey,
        label: mapping.label,
        icon: mapping.icon
      });
    }
  }

  // Remove the [ACTION:...] tags from display text
  const cleanText = rawText.replace(/\[ACTION:[A-Z_]+\]/g, '').trim();

  return { cleanText, actions };
}

/**
 * Calls Google Gemini 2.0 Flash with software knowledge and live store context
 */
export async function sendQueryToGeminiCopilot(params: {
  apiKey: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  userQuery: string;
  liveContext?: LiveStoreContext;
}): Promise<AssistantTurnResponse> {
  const { apiKey, history, userQuery, liveContext } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No Gemini API Key provided. Please add your free key in Settings or AI Config.');
  }

  // Build live context string
  let contextBlock = '';
  if (liveContext) {
    contextBlock = `
CURRENT LIVE STORE STATUS (WebRajya Retail POS):
- Total Products in Catalog: ${liveContext.totalProducts}
- Low Stock Items: ${liveContext.lowStockCount} items (${liveContext.lowStockSample.length > 0 ? liveContext.lowStockSample.join(', ') : 'None'})
- Today's Completed Bills: ${liveContext.todaySalesCount}
- Today's Revenue: ₹${liveContext.todaySalesRevenue.toLocaleString('en-IN')}
- Customers with Dues: ${liveContext.totalCustomersWithDue} (Total Khata Pending: ₹${liveContext.totalKhataOutstanding.toLocaleString('en-IN')})
Use this live data accurately when the user asks questions about their current inventory, sales, or customer dues.
`;
  }

  const systemInstruction = `${SOFTWARE_KNOWLEDGE_BASE}\n\n${contextBlock}`;

  // Assemble Gemini contents payload
  const contents: any[] = [];

  // We feed system instructions as the initial grounding prompt
  contents.push({
    role: 'user',
    parts: [{ text: `[SYSTEM INSTRUCTION & KNOWLEDGE BASE]\n${systemInstruction}\n\nUnderstood. Please wait for my questions.` }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: "Understood! I am WebRajya Invoice Chatbot, fully grounded in WebRajya Invoice software, workflows, and live store status. How can I help you today?" }]
  });

  // Append recent history (up to last 6 turns to keep fast and concise)
  const recentHistory = history.slice(-6);
  for (const turn of recentHistory) {
    contents.push({
      role: turn.role,
      parts: [{ text: turn.text }]
    });
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userQuery }]
  });

  const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800
          }
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }
        const errorBody = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      const rawOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawOutput) {
        return parseActionsFromText(rawOutput);
      }
    } catch (err: any) {
      lastError = err;
      if (!String(err?.message || '').includes('404')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('No compatible Gemini model could be reached with this API key.');
}

