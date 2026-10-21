import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loading01 as Loader2, Mail01 as Mail } from "@untitledui/icons";
import { authApi } from "@/services/authApi";

interface LinkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string;
}

export function LinkEmailModal({ open, onOpenChange, currentEmail }: LinkEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.requestLinkEmail({ newEmail: clean });
      toast.success(res.message || "Verification link sent! Check your new inbox.");
      onOpenChange(false);
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to request email link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Mail className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Link a Verified Contact Email</DialogTitle>
          <DialogDescription className="text-center">
            Link a verified email to secure your Sticky Mind Grid account, receive workspace invitations, and prevent account lockout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {currentEmail && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Current Legacy Address</Label>
              <div className="text-sm font-medium px-3 py-2 bg-muted rounded-md text-foreground/80">
                {currentEmail}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="link-new-email">New Verified Email Address</Label>
            <Input
              id="link-new-email"
              type="email"
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              We will send a single-use verification link that expires in 24 hours. Your current account data will be preserved.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newEmail.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Verification Link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
