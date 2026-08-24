import { Attachment } from "@/types/task";

const API_BASE = "http://127.0.0.1:5000/api";

export interface UploadedFileResponse {
  id: string;
  name: string;
  storedName: string;
  url: string;
  type: string;
  size: string;
  sizeBytes: number;
}

export const fileApi = {
  async uploadFile(file: File): Promise<UploadedFileResponse> {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to upload file");
    }

    const data = await res.json();
    return {
      ...data,
      url: data.url.startsWith("http") ? data.url : `${API_BASE.replace("/api", "")}${data.url}`,
    };
  },

  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      // If it's a data URL or blob URL, download directly
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // If it's our backend API file URL
      let downloadUrl = url;
      if (url.includes("/api/files/")) {
        const storedName = url.split("/api/files/")[1];
        if (storedName && !storedName.includes("/download")) {
          downloadUrl = `${API_BASE}/files/${storedName}/download?name=${encodeURIComponent(filename)}`;
        }
      }

      // Fetch blob and trigger programmatic download to prevent browser navigation issues
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("File download failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: window open
      window.open(url, "_blank");
    }
  },
};
