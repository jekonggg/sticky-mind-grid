import React, { useRef, useState } from "react";
import { Attachment } from "@/types/task";
import { Paperclip, Upload, Trash2, Download, ExternalLink, Image as ImageIcon, FileText, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";
import { format } from "date-fns";

interface TaskAttachmentsProps {
  attachments: Attachment[];
  readOnly?: boolean;
  onChange: (attachments: Attachment[]) => void;
}

export function TaskAttachments({ attachments, readOnly, onChange }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    if (readOnly || files.length === 0) return;
    setIsUploading(true);

    const newAttachments: Attachment[] = [...attachments];

    for (const file of Array.from(files)) {
      try {
        const uploaded = await fileApi.uploadFile(file);
        newAttachments.push({
          id: uploaded.id,
          name: uploaded.filename,
          url: uploaded.url,
          type: uploaded.contentType || file.type,
          size: uploaded.size || file.size,
          uploadedAt: new Date(),
        });
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message || "Upload error"}`);
      }
    }

    onChange(newAttachments);
    setIsUploading(false);
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    onChange(attachments.filter((a) => a.id !== id));
    toast.success("Attachment removed");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          <span>Attachments ({attachments.length})</span>
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-7 text-xs gap-1.5"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Upload File</span>
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Attachments Grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {attachments.map((att) => {
            const isImage = att.type?.startsWith("image/");
            return (
              <div
                key={att.id}
                className="group relative flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-all shadow-xs overflow-hidden"
              >
                {/* Thumbnail / Icon */}
                <div className="w-12 h-12 rounded-lg bg-muted/80 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden">
                  {isImage ? (
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate" title={att.name}>
                    {att.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(att.size)}
                    {att.uploadedAt && ` • ${format(new Date(att.uploadedAt), "MMM d")}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    download={att.name}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                    title="Download / View"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Delete attachment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Drag and Drop Zone if empty */}
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
            isDraggingOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <Upload className="h-4 w-4 text-muted-foreground/70" />
            <p className="text-xs font-medium text-muted-foreground">
              {isUploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading files...
                </span>
              ) : (
                "Drop files here or click to upload"
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/50">Images, PDFs, documents, or zip archives</p>
          </div>
        </div>
      )}
    </div>
  );
}
