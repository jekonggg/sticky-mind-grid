import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loading01 as Loader2,
  LayoutGrid01 as LayoutGrid,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  LogOut01 as LogOut,
  ArrowRight,
  User01 as UserIcon,
} from "@untitledui/icons";
import { motion } from "framer-motion";

export default function AcceptInvitePage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const {
    data: invitation,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["invitationPreview", invitationId],
    queryFn: () => boardApi.getInvitationPreview(invitationId!),
    enabled: Boolean(invitationId),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => boardApi.acceptInvitationById(invitationId!),
    onSuccess: (membership) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Welcome to ${invitation?.boardName || "the board"}!`);
      navigate(`/boards/${membership.boardId || invitation?.boardId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept invitation");
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => boardApi.declineInvitationById(invitationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      toast.info("Invitation declined");
      navigate("/boards");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to decline invitation");
    },
  });

  const handleSwitchAccount = () => {
    if (!invitation) return;
    logout(false);
    const redirectUrl = `/invite/${invitation.id}`;
    navigate(
      `/login?email=${encodeURIComponent(invitation.invitedEmail)}&redirect=${encodeURIComponent(redirectUrl)}`
    );
  };

  const handleRegisterAsInvited = () => {
    if (!invitation) return;
    logout(false);
    const redirectUrl = `/invite/${invitation.id}`;
    navigate(
      `/register?email=${encodeURIComponent(invitation.invitedEmail)}&redirect=${encodeURIComponent(redirectUrl)}`
    );
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md p-8 border-border/50 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Loading Invitation...</h2>
            <p className="text-sm text-muted-foreground">Checking invitation details and authorization</p>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (isError || !invitation) {
    const errorMsg = (error as any)?.message || "Invitation not found";
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl bg-card">
            <CardHeader className="text-center space-y-2 pb-4">
              <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Invalid Invitation</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {errorMsg.includes("expired")
                  ? "This board invitation link has expired."
                  : "This invitation link is invalid or may have been revoked by the board owner."}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col space-y-2 pt-2">
              <Button asChild className="w-full font-bold" variant="default">
                <Link to="/boards">Go to My Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Check email match if user is currently authenticated
  const currentUserEmail = user?.email?.trim().toLowerCase() || "";
  const invitedEmail = invitation.invitedEmail.trim().toLowerCase();
  const isEmailMatch = Boolean(user && currentUserEmail === invitedEmail);
  const isEmailMismatch = Boolean(user && currentUserEmail !== invitedEmail);

  // 3. Status checks: Expired, Revoked, Already Accepted
  if (invitation.status === "expired" || invitation.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl bg-card text-center">
            <CardHeader className="space-y-2">
              <div className="mx-auto h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="mx-auto border-amber-500/40 text-amber-600 dark:text-amber-400">
                Invitation Expired
              </Badge>
              <CardTitle className="text-2xl font-bold">Invitation Expired</CardTitle>
              <CardDescription>
                This invitation to join <strong>{invitation.boardName}</strong> expired after 7 days. Please ask{" "}
                <strong>{invitation.inviterName}</strong> to resend your invite.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full font-bold">
                <Link to="/boards">Go to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (invitation.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl bg-card text-center">
            <CardHeader className="space-y-2">
              <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="mx-auto border-destructive/40 text-destructive">
                Invitation Revoked
              </Badge>
              <CardTitle className="text-2xl font-bold">Invitation Revoked</CardTitle>
              <CardDescription>
                This invitation to join <strong>{invitation.boardName}</strong> has been cancelled by an administrator.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full font-bold">
                <Link to="/boards">Go to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl bg-card text-center">
            <CardHeader className="space-y-2">
              <div className="mx-auto h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="mx-auto border-emerald-500/40 text-emerald-600">
                Already Joined
              </Badge>
              <CardTitle className="text-2xl font-bold">Invitation Already Accepted</CardTitle>
              <CardDescription>
                You are already a member of <strong>{invitation.boardName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full font-bold">
                <Link to={`/boards/${invitation.boardId}`}>Open Board</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutGrid className="text-primary-foreground h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic text-foreground">
            Sticky <span className="text-primary not-italic">Mind Grid</span>
          </h1>
        </div>

        {/* 4. USER B LOGGED IN: ACCOUNT MISMATCH WARNING */}
        {isEmailMismatch && (
          <Card className="border-amber-500/40 bg-card shadow-2xl overflow-hidden" data-testid="invite-account-mismatch-card">
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">Account Mismatch</h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  You are signed in with a different account
                </p>
              </div>
            </div>

            <CardContent className="pt-6 space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Board:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>{invitation.boardEmoji || "📋"}</span>
                    <span>{invitation.boardName}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Invited by:</span>
                  <span className="font-semibold text-foreground">{invitation.inviterName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Offered role:</span>
                  <Badge variant="secondary" className="capitalize text-[11px] font-bold">
                    {invitation.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Intended recipient:</span>
                  <span className="font-mono font-bold text-primary break-all">{invitation.invitedEmail}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold">
                  You are currently signed in as <span className="font-mono font-bold underline">{user?.email}</span>.
                </p>
                <p className="text-muted-foreground">
                  This invitation is strictly reserved for{" "}
                  <span className="font-mono font-bold text-foreground">{invitation.invitedEmail}</span>. To access this
                  board, please switch to the invited account.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2.5 pt-0">
              <Button
                onClick={handleSwitchAccount}
                className="w-full font-bold gap-2"
                variant="default"
                data-testid="switch-account-button"
              >
                <LogOut className="h-4 w-4" />
                Switch & Sign In as {invitation.invitedEmail}
              </Button>

              <Button
                onClick={handleRegisterAsInvited}
                className="w-full font-bold gap-2"
                variant="outline"
                data-testid="register-as-invited-button"
              >
                <UserIcon className="h-4 w-4" />
                Create account as {invitation.invitedEmail}
              </Button>

              <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                <Link to="/boards">Stay signed in as {user?.email} (Back to Dashboard)</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 5. NOT LOGGED IN: SIGN IN OR REGISTER TO ACCEPT */}
        {!user && (
          <Card className="border-border/50 shadow-2xl bg-card overflow-hidden" data-testid="invite-unauthenticated-card">
            <CardHeader className="text-center pb-2">
              <div
                className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-md mb-2 border border-border/50"
                style={{ backgroundColor: `${invitation.boardColor || "#3b82f6"}15` }}
              >
                <span>{invitation.boardEmoji || "📋"}</span>
              </div>
              <Badge variant="outline" className="mx-auto capitalize text-xs font-semibold">
                {invitation.role} Invitation
              </Badge>
              <CardTitle className="text-2xl font-black tracking-tight">{invitation.boardName}</CardTitle>
              <CardDescription className="text-sm">
                <strong>{invitation.inviterName}</strong> invited you to collaborate on this board.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-center space-y-1">
                <span className="text-xs text-muted-foreground">Invitation sent to:</span>
                <p className="font-mono text-sm font-bold text-foreground break-all">{invitation.invitedEmail}</p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Please sign in or create an account with this email address to view and accept the invitation.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2.5">
              <Button asChild className="w-full font-bold gap-2" data-testid="signin-to-accept-button">
                <Link
                  to={`/login?email=${encodeURIComponent(invitation.invitedEmail)}&redirect=${encodeURIComponent(
                    `/invite/${invitation.id}`
                  )}`}
                >
                  Sign In to Accept <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full font-bold" data-testid="signup-to-accept-button">
                <Link
                  to={`/register?email=${encodeURIComponent(invitation.invitedEmail)}&redirect=${encodeURIComponent(
                    `/invite/${invitation.id}`
                  )}`}
                >
                  Create Account
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 6. LOGGED IN AS MATCHING USER (USER A): EXPLICIT ACCEPT / DECLINE */}
        {isEmailMatch && (
          <Card className="border-border/50 shadow-2xl bg-card overflow-hidden" data-testid="invite-matching-card">
            <CardHeader className="text-center pb-2">
              <div
                className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-md mb-2 border border-border/50"
                style={{ backgroundColor: `${invitation.boardColor || "#3b82f6"}15` }}
              >
                <span>{invitation.boardEmoji || "📋"}</span>
              </div>
              <Badge variant="outline" className="mx-auto capitalize text-xs font-semibold border-primary/40 text-primary">
                {invitation.role} Access
              </Badge>
              <CardTitle className="text-2xl font-black tracking-tight">{invitation.boardName}</CardTitle>
              <CardDescription className="text-sm">
                <strong>{invitation.inviterName}</strong> invited you to collaborate as <strong>{invitation.role}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 text-center space-y-1">
                <span className="text-xs text-muted-foreground">Signed in as:</span>
                <p className="font-mono text-sm font-bold text-foreground break-all">{user?.email}</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2.5">
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="w-full font-bold gap-2 text-base py-5"
                data-testid="explicit-accept-button"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    Accept Invitation <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                onClick={() => declineMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                variant="outline"
                className="w-full font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                data-testid="decline-button"
              >
                {declineMutation.isPending ? "Declining..." : "Decline"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
