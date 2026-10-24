import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loading01 as Loader2, LayoutGrid01 as LayoutGrid, Eye, EyeOff, AlertCircle } from "@untitledui/icons";
import { motion } from "framer-motion";

import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const emailParam = searchParams.get("email");

  // Requirement 7: Read pre-fill email only right after registration from sessionStorage
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem("login_prefill_email") || emailParam || (location.state as any)?.email || "";
  });

  useEffect(() => {
    const prefill = sessionStorage.getItem("login_prefill_email") || emailParam;
    if (prefill) {
      setEmail(prefill);
    }
  }, [emailParam]);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 403 Unverified & Legacy Expired state (Requirement 4 & 9)
  const [unverifiedState, setUnverifiedState] = useState<{
    blocked: boolean;
    message: string;
    email: string;
    canSignUpAgain?: boolean;
    legacyExpired?: boolean;
  } | null>(null);

  const [loginError, setLoginError] = useState<{
    message: string;
    field?: "email" | "password" | "oauth" | "general";
    code?: string;
    provider?: string;
  } | null>(null);

  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Recovery modal state for post-deadline legacy users
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockNewEmail, setUnlockNewEmail] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Warm the register chunk so "Create one" navigates without a fallback flash.
  useEffect(() => {
    void import("./Register");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setUnverifiedState(null);

    // Immediate client-side validation
    if (!email.trim()) {
      setLoginError({
        message: "Email address is required.",
        field: "email",
        code: "MISSING_EMAIL",
      });
      return;
    }

    if (!password) {
      setLoginError({
        message: "Password is required.",
        field: "password",
        code: "MISSING_PASSWORD",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(email.trim().toLowerCase(), password);
      sessionStorage.removeItem("login_prefill_email");
      login(response.user, response.token!);
      toast.success(`Welcome back, ${response.user.fullName || response.user.email}!`);
      const destination = redirectParam || (location.state as any)?.from || "/";
      navigate(destination);
    } catch (error: any) {
      if (error.status === 403 && (error.data?.emailVerified === false || error.data?.legacyExpired)) {
        setUnverifiedState({
          blocked: true,
          message: error.data?.message || "Please verify your email address before signing in.",
          email: error.data?.email || email,
          canSignUpAgain: Boolean(error.data?.canSignUpAgain),
          legacyExpired: Boolean(error.data?.legacyExpired),
        });
        setLoginError(null);
      } else {
        const errorField = error.field || error.data?.field;
        const errorCode = error.code || error.data?.code;
        const errorProvider = error.provider || error.data?.provider;
        const msg = error.message || error.data?.message || "Failed to sign in. Please check your credentials.";

        setLoginError({
          message: msg,
          field: errorField || "general",
          code: errorCode,
          provider: errorProvider,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const targetEmail = unverifiedState?.email || email;
      const res = await authApi.resendVerification(targetEmail);
      toast.success(res.message || "Verification email resent! Please check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  const handleSignUpAgain = () => {
    // Clear prefilled email and session storage (Requirement 4 & 7)
    sessionStorage.removeItem("login_prefill_email");
    setEmail("");
    setUnverifiedState(null);
    navigate("/register");
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockNewEmail || !password) {
      toast.error("Please provide both your password and a new email address.");
      return;
    }
    setIsUnlocking(true);
    try {
      const res = await authApi.requestLinkEmail({
        originalEmail: unverifiedState?.email || email,
        password,
        newEmail: unlockNewEmail,
      });
      toast.success(res.message || "Verification email sent to your new contact address!");
      setShowUnlockModal(false);
      setUnlockNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate account unlock");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutGrid className="text-primary-foreground h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic text-foreground">
            Sticky <span className="text-primary not-italic">Mind Grid</span>
          </h1>
        </div>

        <Card className="border-border/50 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Enter your email and password or use social account to sign in
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {/* Unverified / Blocked State Banner */}
              {unverifiedState && (
                <div data-testid="unverified-state-banner" className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Verification Required</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{unverifiedState.message}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!unverifiedState.legacyExpired ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-destructive/30 hover:bg-destructive/10"
                          onClick={handleResend}
                          disabled={resendCooldown > 0 || isResending}
                        >
                          {isResending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : null}
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend verification email"}
                        </Button>
                        {unverifiedState.canSignUpAgain && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs hover:bg-destructive/10 text-muted-foreground hover:text-foreground"
                            onClick={handleSignUpAgain}
                          >
                            Wrong email? Sign up again
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => setShowUnlockModal(true)}
                      >
                        Link a verified email to unlock
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Guided In-Modal Error Alert */}
              {loginError && (
                <div
                  data-testid="login-error-alert"
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ${
                    loginError.field === "oauth"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                      : "bg-destructive/10 border-destructive/25 text-destructive"
                  }`}
                >
                  <AlertCircle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      loginError.field === "oauth"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                    }`}
                  />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold">{loginError.message}</p>
                    {loginError.field === "email" && loginError.code === "USER_NOT_FOUND" && (
                      <p className="text-muted-foreground text-[11px]">
                        Don't have an account yet?{" "}
                        <Link
                          to={redirectParam ? `/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectParam)}` : `/register?email=${encodeURIComponent(email)}`}
                          className="text-primary underline font-bold"
                        >
                          Create one here
                        </Link>
                      </p>
                    )}
                    {loginError.field === "oauth" && loginError.provider && (
                      <p className="text-muted-foreground text-[11px]">
                        Please click the <strong className="uppercase">{loginError.provider}</strong> button below to sign in with your social account.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className={loginError?.field === "email" ? "text-destructive" : ""}>
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (loginError?.field === "email" || loginError?.field === "oauth") {
                      setLoginError(null);
                    }
                  }}
                  required
                  className={`bg-muted/50 border-border/50 focus:bg-background transition-colors ${
                    loginError?.field === "email"
                      ? "border-destructive focus-visible:ring-destructive ring-1 ring-destructive/40"
                      : ""
                  }`}
                />
                {loginError?.field === "email" && (
                  <p data-testid="email-helper-error" className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{loginError.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={loginError?.field === "password" ? "text-destructive" : ""}>
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError?.field === "password") {
                        setLoginError(null);
                      }
                    }}
                    onKeyDown={handlePasswordKey}
                    onKeyUp={handlePasswordKey}
                    required
                    placeholder="••••••••"
                    className={`bg-muted/50 border-border/50 focus:bg-background transition-colors pr-10 ${
                      loginError?.field === "password"
                        ? "border-destructive focus-visible:ring-destructive ring-1 ring-destructive/40"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-md p-0.5"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {loginError?.field === "password" && (
                  <p data-testid="password-helper-error" className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{loginError.message}</span>
                  </p>
                )}
                {isCapsLockOn && (
                  <p data-testid="caps-lock-warning" className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                    <span>⇪ Caps Lock is ON</span>
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <OAuthButtons mode="login" />

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  to={redirectParam ? `/register?${new URLSearchParams({ ...(email ? { email } : {}), redirect: redirectParam }).toString()}` : "/register"}
                  className="text-primary hover:underline font-semibold"
                >
                  Create one
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Account Recovery Dialog for post-deadline legacy users */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Your Account</DialogTitle>
            <DialogDescription>
              Your legacy verification deadline has expired. Link a new verified contact email to restore access to your account and workspaces. Your data remains fully intact.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUnlockSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="unlock-original-email">Account Email</Label>
              <Input
                id="unlock-original-email"
                type="email"
                value={unverifiedState?.email || email}
                disabled
                className="bg-muted opacity-80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Current Password</Label>
              <Input
                id="unlock-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-new-email">New Verified Email Address</Label>
              <Input
                id="unlock-new-email"
                type="email"
                value={unlockNewEmail}
                onChange={(e) => setUnlockNewEmail(e.target.value)}
                placeholder="newcontact@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                We will send a single-use verification link to this address.
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowUnlockModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUnlocking}>
                {isUnlocking ? (
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
    </div>
  );
}
