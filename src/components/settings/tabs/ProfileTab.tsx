import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/authApi";
import { API_BASE, getStoredToken } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Mail,
  KeyRound,
  Loader2,
  Camera,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export function ProfileTab({ onClose }: { onClose?: () => void }) {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setAvatarUrl(user.avatarUrl || null);
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    }
  }, [user]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingAvatar(true);
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload avatar image");
      }

      const result = await res.json();
      setAvatarUrl(result.url);
      toast.success("Avatar uploaded. Save profile to apply changes.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (password && password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password && !currentPassword) {
      toast.error("Enter your current password to change it");
      return;
    }

    try {
      setLoading(true);
      const payload: {
        fullName: string;
        avatarUrl?: string | null;
        password?: string;
        currentPassword?: string;
      } = {
        fullName: fullName.trim(),
        avatarUrl: avatarUrl,
      };

      if (password) {
        payload.password = password;
        payload.currentPassword = currentPassword;
      }

      const updatedUser = await authApi.updateMe(payload);
      updateUser(updatedUser);
      toast.success("Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const userInitial =
    fullName.charAt(0) || user?.email.charAt(0) || "U";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Account Profile</h3>
        <p className="text-xs text-muted-foreground">
          Manage your personal details, avatar photo, and account password.
        </p>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
        <div className="relative group">
          <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-sm">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl uppercase">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground truncate">
              {fullName || "User"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 inline" />
              Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || loading}
              className="h-7 text-xs gap-1.5"
            >
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              Upload Avatar
            </Button>

            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar || loading}
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Full Name & Email */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-bold text-foreground">
            Full Name
          </Label>
          <Input
            id="fullName"
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="text-xs font-bold text-foreground">
              Email Address
            </Label>
            <span className="text-[11px] text-muted-foreground">Primary Login</span>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="h-9 pl-9 text-xs bg-muted/50 cursor-not-allowed opacity-75"
            />
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <KeyRound className="h-4 w-4 text-primary" />
          <span>Security & Password (Optional)</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Leave blank if you do not wish to change your current password.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-[11px] font-semibold text-muted-foreground">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[11px] font-semibold text-muted-foreground">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {password && (
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="currentPassword" className="text-[11px] font-bold text-destructive">
              Current Password (Required to apply password changes)
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>
        )}
      </div>

      {/* Footer / Submit */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50">
        <Button type="submit" disabled={loading} className="gap-2 h-9 text-xs font-bold">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save Profile Changes
        </Button>
      </div>
    </form>
  );
}
