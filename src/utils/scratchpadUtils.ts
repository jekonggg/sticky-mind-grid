import { ScratchpadNote } from "@/types/scratchpad";

export const TOUR_NOTE_CONTENT = `Welcome to your personal scratchpad!

🔒 Privacy First:
• Everything written here is completely private to you.
• Board collaborators and team members cannot see these notes.
• Synced securely to your account across all your devices.

⚡ Quick Tips to try right now:
1. 🎨 Change Colors — Click any color circle above to color-code your note.
2. 📌 Pin Important Notes — Click the "Pin" button to keep this note pinned at the top.
3. 📋 One-Click Copy — Click "Copy" to quickly grab the content and paste it into a board task or chat.
4. ➕ Create More — Click "+ New Note" in the top right to start a fresh draft anytime.`;

export const STANDUP_TEMPLATE_CONTENT = `### 🎯 Today's Focus
- [ ] Top priority task for today: 
- [ ] Review pending pull requests or board cards

### 💬 Daily Standup Notes
• Yesterday: Completed initial research and wireframes
• Today: Implementing API routes & frontend components
• Blockers: None at the moment

### 💡 Quick Ideas / Later:
• Discuss board color themes with the design team`;

export const DEFAULT_NOTES: ScratchpadNote[] = [
  {
    id: "starter-tour",
    title: "👋 Welcome to your Scratchpad (Quick Tour)",
    content: TOUR_NOTE_CONTENT,
    color: "#fef3c7",
    pinned: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "starter-standup",
    title: "📋 Daily Standup & Planner",
    content: STANDUP_TEMPLATE_CONTENT,
    color: "#e0f2fe",
    pinned: false,
    updatedAt: new Date().toISOString(),
  },
];

export function getStorageKey(userId?: string): string {
  return userId
    ? `sticky_mind_grid_personal_notes_${userId}`
    : "sticky_mind_grid_personal_notes";
}

export function getPersonalNotesCount(userId?: string): number {
  try {
    const key = getStorageKey(userId);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved).length : DEFAULT_NOTES.length;
  } catch {
    return DEFAULT_NOTES.length;
  }
}
