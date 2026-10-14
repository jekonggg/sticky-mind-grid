import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import {
  UserPlus01 as UserPlus,
  SearchLg as Search,
  UserCheck01 as UserCheck,
} from "@untitledui/icons";
import { boardApi } from "@/services/boardApi";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";
import { useActivity } from "@/hooks/useActivity";
import { useBoards } from "@/hooks/useBoards";
import { useDevMode } from "@/contexts/DevModeContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user";

interface InviteMemberDialogProps {
  boardId: string;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onInvited?: () => void;
  trigger?: React.ReactNode;
}

export function InviteMemberDialog({
  boardId,
  open: controlledOpen,
  onClose,
  onOpenChange,
  onInvited,
  trigger,
}: InviteMemberDialogProps) {
  const { devSettings } = useDevMode();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserSelectedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
    if (!newOpen) {
      onClose?.();
      setEmail("");
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      isUserSelectedRef.current = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }
  };

  const { addActivity } = useActivity();
  const { boards } = useBoards();
  const currentBoard = boards.find((b) => b.id === boardId);
  const { data: members = [] } = useQuery({
    queryKey: ["boardMembers", boardId],
    queryFn: () => boardApi.getMembers(boardId),
    enabled: open,
  });
  const permissions = useBoardPermissions(currentBoard, members);
  const queryClient = useQueryClient();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search for registered users with loading animation & race-condition cancellation
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (isUserSelectedRef.current) {
      isUserSelectedRef.current = false;
      return;
    }

    const trimmed = email.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await authApi.searchUsers(trimmed);
        if (isCurrent) {
          setSearchResults(results || []);
          setShowDropdown(true);
        }
      } catch {
        if (isCurrent) {
          setSearchResults([]);
          setShowDropdown(true);
        }
      } finally {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [email]);

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      boardApi.inviteMember(boardId, data.email, data.role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      addActivity(
        "update",
        currentBoard?.name || "Board",
        `Invited ${variables.email} as ${variables.role}`,
        boardId
      );
      toast.success("Member invited successfully!");
      handleOpenChange(false);
      setEmail("");
      setRole("editor");
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      onInvited?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to invite member");
    },
  });

  const handleSelectUser = (user: User) => {
    isUserSelectedRef.current = true;
    setEmail(user.email);
    setShowDropdown(false);
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        trigger
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 font-bold shadow-sm">
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Invite Member</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="w-full max-w-none sm:max-w-lg md:max-w-xl max-h-[90vh] rounded-none sm:rounded-2xl p-6 sm:p-7 overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Invite to Board</DialogTitle>
          <DialogDescription className="sr-only">
            Invite collaborators and manage pending board invitations
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Email / User Search Input */}
          <div ref={dropdownRef} className="space-y-2 relative">
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
                onChange={(e) => {
                  isUserSelectedRef.current = false;
                  setEmail(e.target.value);
                }}
                onFocus={() => {
                  if (email.trim().length >= 2) setShowDropdown(true);
                }}
                className="pl-9 pr-9 text-xs font-medium"
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" data-testid="search-loader" />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && email.trim().length >= 2 && !isSearching && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground rounded-xl border border-border/80 shadow-xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in-50 zoom-in-95">
                {searchResults.length > 0 ? (
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
                            <AvatarImage src={u.avatarUrl} alt={u.fullName || u.email} />
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
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">No registered users found</p>
                    <p className="text-[11px] mt-0.5">
                      You can still invite by email: <span className="font-semibold text-foreground">{email.trim()}</span>
                    </p>
                  </div>
                )}
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
                {permissions.canGrantAdminOwner && (
                  <SelectItem value="admin">
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-bold text-xs">{!devSettings.disableEmojiCustomization && "🛡️ "}Admin</span>
                      <span className="text-[10px] text-muted-foreground">Can manage members, columns, settings & cards</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="editor">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">{!devSettings.disableEmojiCustomization && "✏️ "}Editor</span>
                    <span className="text-[10px] text-muted-foreground">Can create, edit, move, archive & comment on cards</span>
                  </div>
                </SelectItem>
                <SelectItem value="commenter">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">{!devSettings.disableEmojiCustomization && "💬 "}Commenter</span>
                    <span className="text-[10px] text-muted-foreground">Can view board and post comments on cards</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-bold text-xs">{!devSettings.disableEmojiCustomization && "👁️ "}Viewer</span>
                    <span className="text-[10px] text-muted-foreground">Read-only access (no comments or card edits)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-xs font-bold px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={inviteMutation.isPending || !email.trim()}
              className="text-xs font-bold gap-1.5 px-4 min-w-[110px] cursor-pointer"
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
