# Architecture Proposal for Dynamic Category Filters

## 1. Schema Analysis & Selection

**Recommendation: `schema1.json` is the superior choice.**

### Why `schema1.json`?
`schema1.json` introduces a hierarchical taxonomy with explicitly defined `Attribute_Groups` (e.g., "Core Performance", "Display & Video", "Power & Battery"). 
- **Data-Driven UI:** The frontend can dynamically iterate through these `Attribute_Groups` keys to render the category filter boxes. 
- **Scalability:** If a new category like "Cameras" is added to the backend schema with groups like "Lenses & Optics" and "Video Capabilities", the frontend will automatically render these new filter buttons without requiring complex hardcoded logic.
- **Why not `schema2.json`?** It provides a flat list of specifications (e.g., an array of 13 attributes for Smartphones). To create category filters, the frontend or backend would need separate, hardcoded logic to cluster these 13 attributes into logical buckets (Performance, Display, etc.). This defeats the purpose of a dynamic schema.

---

## 2. Backend Architecture & Cost Optimization

**User Concern:** *"Will it be a costly API operation?"*

Yes, naive implementations typically require two separate LLM API calls:
1. **Classification Call:** Identify the product type (e.g., "These are Smartphones").
2. **Extraction Call:** Fetch the Smartphone schema and extract the relevant specs.

**Highly Efficient Method: Single-Prompt Classification & Extraction**
Modern LLMs (like Gemini 1.5 Pro/Flash) have large context windows and excel at complex instruction following. Instead of two calls, we can consolidate the process into a single LLM operation.

### Backend Workflow:
1. **Scrape:** Gather text from the user-provided URLs (Product A and Product B).
2. **Single LLM Prompt:** Pass the *entire* `schema1.json` (or a minified version of the taxonomy) alongside the scraped data.
3. **Prompt Instructions:**
   * *"Analyze the provided scraped text for Product A and Product B."*
   * *"Consult the provided JSON taxonomy. Determine the single most appropriate Subcategory (e.g., 'Smartphones') that fits both products."*
   * *"Extract the specifications for both products, structuring them exactly according to the `Attribute_Groups` defined for that category in the JSON."*
   * *"Output a strictly formatted JSON response containing the resolved category, subcategory, and the grouped specs."*

**Example Expected LLM JSON Output:**
```json
{
  "category": "Computing & Mobile",
  "subcategory": "Smartphones",
  "groups": {
    "Core Performance": {
      "Processor / Chipset": {
        "productA": "Snapdragon 8 Gen 3",
        "productB": "A17 Pro"
      }
    },
    "Power & Battery": {
      "Battery Capacity": {
        "productA": "5000 mAh",
        "productB": "4422 mAh"
      }
    }
  }
}
```

**Benefits:**
- **Halves the API Cost:** Reduces the number of LLM inference calls by 50%.
- **Lowers Latency:** The user gets their comparison screen significantly faster.
- **Maintains Consistency:** The LLM applies the schema structure perfectly because it has the context of the taxonomy all at once.

---

## 3. Frontend Strategy for Dynamic Icons

With the backend dynamically returning group names (e.g., "Core Performance"), the frontend needs a strategy to map these strings to visual icons (Lucide React) for the filter buttons.

### Implementation: The Icon Dictionary Approach
We create a mapping object on the frontend that binds recognized `Attribute_Groups` keys from the schema to specific Lucide icons.

```typescript
import { 
  Cpu, 
  Monitor, 
  Battery, 
  Wifi, 
  Shield, 
  Box, 
  Activity, 
  Speaker,
  List
} from 'lucide-react';

// Map schema string keys to Lucide React components
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  "Core Performance": Cpu,
  "Display & Video": Monitor,
  "Visual Performance": Monitor,
  "Display & Interface": Monitor,
  "Power & Battery": Battery,
  "Power & Durability": Battery,
  "Connectivity & I/O": Wifi,
  "Connectivity": Wifi,
  "Ecosystem": Wifi,
  "Design & Build": Shield,
  "Physical Setup": Box,
  "Audio Features": Speaker,
  "Smart & OS": Cpu,
  "Health & Tracking": Activity,
};

// Fallback icon for unrecognized or new groups added to the schema later
const FallbackIcon = List;
```

### Rendering the Filter Bar
When rendering the compare screen, we extract the keys from the `groups` object returned by the backend:

```tsx
const groupNames = Object.keys(apiResponse.groups); // e.g. ["Core Performance", "Power & Battery"]

return (
  <div className="flex gap-4 overflow-x-auto p-4">
    {groupNames.map((groupName) => {
      const Icon = CATEGORY_ICON_MAP[groupName] || FallbackIcon;
      
      return (
        <button 
          key={groupName}
          className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition-colors"
          onClick={() => scrollToGroup(groupName)}
        >
          <Icon size={18} className="text-gray-600" />
          <span className="font-medium text-sm text-gray-800">{groupName}</span>
        </button>
      );
    })}
  </div>
);
```

### Strategy Advantages:
1. **Resilience:** If the backend adds a new group (e.g., "AI Features") that isn't mapped yet, the UI won't break; it will simply display the `FallbackIcon`.
2. **Reusability:** Notice how multiple slightly different group names ("Display & Video", "Visual Performance", "Display & Interface") all map to the same `Monitor` icon, standardizing the visual language across different product categories.
3. **Decoupling:** The frontend remains perfectly data-driven by the backend schema, while still controlling the visual presentation layer independently.
