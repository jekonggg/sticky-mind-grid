import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useActivity } from "@/hooks/useActivity";
import { useBoards } from "@/hooks/useBoards";

interface InviteMemberDialogProps {
  boardId: string;
}

export function InviteMemberDialog({ boardId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const { addActivity } = useActivity();
  const { currentBoard } = useBoards();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string, role: string }) => 
      boardApi.inviteMember(boardId, data.email, data.role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      addActivity("update", currentBoard?.name || "Board", `Invited ${variables.email} as ${variables.role}`, boardId);
      toast.success("Member invited successfully!");
      setOpen(false);
      setEmail("");
      setRole("member");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to invite member");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    inviteMutation.mutate({ email, role });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Invite</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              placeholder="colleague@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              User must already be registered with this email.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Can manage board & tasks</SelectItem>
                <SelectItem value="member">Member - Can create & edit tasks</SelectItem>
                <SelectItem value="viewer">Viewer - Read only access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Send Invite"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
