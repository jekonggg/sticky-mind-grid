import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserMinus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BoardMember } from "@/types/board";
import { useActivity } from "@/hooks/useActivity";
import { useBoards } from "@/hooks/useBoards";

interface BoardMembersProps {
  boardId: string;
}

export function BoardMembers({ boardId }: BoardMembersProps) {
  const { user: currentUser } = useAuth();
  const { addActivity } = useActivity();
  const { currentBoard } = useBoards();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["boardMembers", boardId],
    queryFn: () => boardApi.getMembers(boardId),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => boardApi.removeMember(boardId, userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      const removedUser = members?.find(m => m.userId === userId);
      const userName = removedUser?.user?.fullName || removedUser?.user?.email || "User";
      addActivity("update", currentBoard?.name || "Board", `Removed member ${userName}`, boardId);
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    }
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30';
      case 'viewer': return 'bg-slate-500/20 text-slate-500 hover:bg-slate-500/30';
      default: return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Loading members...</div>;
  }

  if (!members || members.length === 0) return null;

  // Let's find the current user's role on this board
  const myMembership = members.find(m => m.userId === currentUser?.id);
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex -space-x-2 overflow-hidden items-center group">
        {members.map((member) => (
          <Avatar 
            key={member.id} 
            className="inline-block h-8 w-8 rounded-full ring-2 ring-background transition-transform hover:scale-110 hover:z-10 cursor-pointer"
            title={`${member.user?.fullName || member.user?.email} (${member.role})`}
          >
            <AvatarFallback className="text-xs bg-muted border font-medium">
              {member.user?.fullName?.charAt(0).toUpperCase() || member.user?.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Board Members List
        </h4>
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{member.user?.fullName?.charAt(0).toUpperCase() || member.user?.email.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                  {member.user?.fullName || member.user?.email}
                  {member.userId === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                </span>
                {member.user?.fullName && <span className="text-xs text-muted-foreground mt-1">{member.user.email}</span>}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`capitalize text-[10px] ${getRoleColor(member.role)}`}>
                {member.role}
              </Badge>
              
              {canManage && member.role !== 'owner' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if(confirm("Are you sure you want to remove this member?")) {
                      removeMutation.mutate(member.userId);
                    }
                  }}
                  disabled={removeMutation.isPending}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
