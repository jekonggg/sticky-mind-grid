import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Loader2, Search, UserCheck } from "lucide-react";
import { boardApi } from "@/services/boardApi";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";
import { useActivity } from "@/hooks/useActivity";
import { useBoards } from "@/hooks/useBoards";
import { User } from "@/types/user";

interface InviteMemberDialogProps {
  boardId: string;
}

export function InviteMemberDialog({ boardId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { addActivity } = useActivity();
  const { boards } = useBoards();
  const currentBoard = boards.find((b) => b.id === boardId);
  const queryClient = useQueryClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search for registered users
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = email.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await authApi.searchUsers(trimmed);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [email]);

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      boardApi.inviteMember(boardId, data.email, data.role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      addActivity(
        "update",
        currentBoard?.name || "Board",
        `Invited ${variables.email} as ${variables.role}`,
        boardId
      );
      toast.success("Member invited successfully!");
      setOpen(false);
      setEmail("");
      setRole("member");
      setSearchResults([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to invite member");
    },
  });

  const handleSelectUser = (user: User) => {
    setEmail(user.email);
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-bold shadow-sm">
          <UserPlus className="h-4 w-4 text-primary" />
          <span>Invite Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Invite to Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Email / User Search Input */}
          <div className="space-y-2 relative">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              User Search or Email Address
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="text"
                required
                placeholder="Search by name or email (e.g. alex@example.com)..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                className="pl-9 text-xs font-medium"
                autoComplete="off"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground rounded-xl border border-border/80 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                <div className="p-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                    Matching Users
                  </span>
                  {searchResults.map((u) => {
                    const initial = (u.fullName || u.email || "U").charAt(0).toUpperCase();
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/80 text-left transition-colors cursor-pointer group"
                      >
                        <Avatar className="h-7 w-7 border border-primary/20 shrink-0">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {u.fullName || u.email}
                          </span>
                          {u.fullName && (
                            <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                          )}
                        </div>
                        <UserCheck className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Search by username, full name, or enter an exact email address.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assign Board Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-10 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">🛡️ Admin</span>
                    <span className="text-[10px] text-muted-foreground">Can manage members, states & tasks</span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">👤 Member</span>
                    <span className="text-[10px] text-muted-foreground">Can create, edit, move & delete tasks</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">👁️ Viewer</span>
                    <span className="text-[10px] text-muted-foreground">Read-only access (no task movements or edits)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={inviteMutation.isPending || !email.trim()}
              className="text-xs font-bold gap-1.5"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Inviting...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Send Invite</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
