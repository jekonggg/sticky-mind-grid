import { ScratchpadNote, CreateScratchpadData, UpdateScratchpadData } from "@/types/scratchpad";
import { authenticatedFetch } from "./apiUtils";

export const scratchpadApi = {
  async getScratchpads(): Promise<ScratchpadNote[]> {
    const res = await authenticatedFetch("/scratchpads");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch scratchpad notes");
    }
    return res.json();
  },

  async createScratchpad(data: CreateScratchpadData): Promise<ScratchpadNote> {
    const res = await authenticatedFetch("/scratchpads", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create scratchpad note");
    }
    return res.json();
  },

  async updateScratchpad(id: string, data: UpdateScratchpadData): Promise<ScratchpadNote> {
    const res = await authenticatedFetch(`/scratchpads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update scratchpad note");
    }
    return res.json();
  },

  async deleteScratchpad(id: string): Promise<void> {
    const res = await authenticatedFetch(`/scratchpads/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete scratchpad note");
    }
  },
};
