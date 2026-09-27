import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/authApi";
import { fileApi } from "@/services/fileApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User01 as User,
  Mail01 as Mail,
  Key01 as KeyRound,
  Loading01 as Loader2,
  Camera01 as Camera,
  Trash01 as Trash2,
} from "@untitledui/icons";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    }
  }, [user, open]);

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
      const payload: { fullName: string; password?: string; currentPassword?: string } = { fullName: fullName.trim() };
      if (password) {
        payload.password = password;
        payload.currentPassword = currentPassword;
      }

      const updatedUser = await authApi.updateMe(payload);
      updateUser(updatedUser);
      toast.success("Profile updated successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

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

    try {
      setUploadingAvatar(true);
      const uploaded = await fileApi.uploadFile(file);
      const updatedUser = await authApi.updateMe({
        fullName: fullName.trim() || user?.fullName,
        avatarUrl: uploaded.url,
      });
      updateUser(updatedUser);
      toast.success("Avatar updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const updatedUser = await authApi.updateMe({
        fullName: fullName.trim() || user?.fullName,
        avatarUrl: null,
      });
      updateUser(updatedUser);
      toast.success("Avatar removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-none sm:max-w-[425px] h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Profile
          </DialogTitle>
          <DialogDescription>
            Manage your personal profile and account credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Avatar Section */}
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/40">
            <div className="relative group shrink-0">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={user?.avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base uppercase">
                  {fullName.charAt(0) || user?.email.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-foreground truncate">
                {fullName || "Anonymous User"}
              </span>
              <span className="text-xs text-muted-foreground truncate flex items-center gap-1 mb-2">
                <Mail className="h-3 w-3 inline" />
                {user?.email}
              </span>

              <div className="flex items-center gap-1.5">
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
                  className="h-7 text-xs px-2 gap-1"
                >
                  <Camera className="h-3 w-3 text-muted-foreground" />
                  Upload
                </Button>
                {user?.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar || loading}
                    className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          {/* Email (Disabled) */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Address (Login)
            </Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="h-10 bg-muted/50 cursor-not-allowed opacity-70"
            />
          </div>

          {/* Optional New Password */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Change Password (Optional)</span>
            </div>

            <div className="space-y-1.5">
              <Input
                type="password"
                placeholder="New Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {password && (
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="Current Password (required)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            )}

            {password && (
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
