import { useEffect, useState } from "react";
import { useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || (location.state as any)?.email || "";
  const isPendingParam = searchParams.get("pending") === "true" || Boolean((location.state as any)?.pending);
  const redirectParam = searchParams.get("redirect") || (location.state as any)?.redirect || "";

  // Status can be:
  // - "loading": actively verifying a token from query string
  // - "pending": waiting for user to click verification link in their email
  // - "success": verified successfully (via token or live poller)
  // - "error": invalid/expired token or unknown request
  const [status, setStatus] = useState<"loading" | "pending" | "success" | "error">(() => {
    if (token) return "loading";
    if (isPendingParam || emailParam) return "pending";
    return "error";
  });

  const [message, setMessage] = useState<string>(() => {
    if (token) return "Verifying your email address...";
    if (isPendingParam || emailParam) return "A verification link has been sent to your inbox.";
    return "No verification token provided in the link.";
  });

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Token Verification Flow (when user clicked email link)
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    authApi
      .verifyEmail(token)
      .then((data) => {
        if (!isMounted) return;
        setStatus("success");
        setMessage(data.message || "Your email address has been successfully verified.");
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setStatus("error");
        setMessage(err.message || "The verification link is invalid or has expired.");
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Real-time Status Polling (when user is waiting on pending screen)
  useEffect(() => {
    if (status !== "pending" || !emailParam) return;

    let isMounted = true;

    const checkVerificationStatus = async () => {
      try {
        const res = await authApi.getVerificationStatus(emailParam);
        if (!isMounted) return;
        if (res.verified) {
          setStatus("success");
          setMessage("Your email address has been verified successfully!");
          toast.success("Email verified successfully! You can now sign in.");
        }
      } catch {
        // Polling errors are ignored to avoid disrupting the user experience
      }
    };

    // Check immediately on mount and when user returns to this tab
    checkVerificationStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVerificationStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll every 3.5 seconds while visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkVerificationStatus();
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, emailParam]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !emailParam) return;
    setIsResending(true);
    try {
      const res = await authApi.resendVerification(emailParam);
      toast.success(res.message || "Verification email resent! Please check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  const handleProceedToLogin = () => {
    const nextLoginUrl = redirectParam
      ? `/login?email=${encodeURIComponent(emailParam)}&redirect=${encodeURIComponent(redirectParam)}`
      : emailParam
      ? `/login?email=${encodeURIComponent(emailParam)}`
      : "/login";

    navigate(nextLoginUrl, { state: { email: emailParam } });
  };

  const handleSignUpAgain = () => {
    sessionStorage.removeItem("login_prefill_email");
    navigate("/register");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-border/60 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-3">
            <div className="flex justify-center mb-4">
              <AnimatePresence mode="wait">
                {status === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"
                  >
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </motion.div>
                )}

                {status === "pending" && (
                  <motion.div
                    key="pending"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary relative shadow-md shadow-primary/10"
                  >
                    <Mail className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                    </span>
                  </motion.div>
                )}

                {status === "success" && (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10"
                  >
                    <CheckCircle2 className="w-9 h-9" />
                  </motion.div>
                )}

                {status === "error" && (
                  <motion.div
                    key="error"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive shadow-md shadow-destructive/10"
                  >
                    <AlertCircle className="w-9 h-9" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight">
              {status === "loading" && "Verifying Email"}
              {status === "pending" && "Check Your Inbox"}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>

            <CardDescription className="text-sm mt-1.5 text-muted-foreground">
              {status === "pending"
                ? "We sent a verification link to your email address."
                : message}
            </CardDescription>

            {status === "pending" && emailParam && (
              <div className="mt-3">
                <span
                  data-testid="pending-email-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 max-w-full truncate"
                  title={emailParam}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emailParam}</span>
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-2 text-center text-sm space-y-3">
            {status === "pending" && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-2">
                <p>
                  Click the link in the email to activate your account. This page will update automatically once verified.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-primary">
                  <RefreshCw className="h-3 w-3 animate-spin text-primary/70" />
                  <span>Waiting for confirmation...</span>
                </div>
              </div>
            )}

            {status === "success" && (
              <p className="text-sm text-muted-foreground">
                Your email address has been verified. You can now sign in with your credentials to access your boards.
              </p>
            )}

            {status === "error" && (
              <p className="text-sm text-muted-foreground">
                The link may have expired or is invalid. You can request a new verification email from the login page or try signing up again.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-2">
            {status === "pending" ? (
              <>
                <Button
                  data-testid="resend-verification-btn"
                  variant="outline"
                  className="w-full font-semibold border-primary/30 hover:bg-primary/5"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend verification in ${resendCooldown}s`
                  ) : (
                    "Resend verification email"
                  )}
                </Button>

                <Button
                  data-testid="go-to-login-btn"
                  className="w-full font-bold"
                  onClick={handleProceedToLogin}
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="flex items-center justify-between w-full pt-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleSignUpAgain}
                    className="hover:text-foreground transition-colors underline"
                  >
                    Wrong email? Sign up again
                  </button>
                  <Link
                    to="/login"
                    className="hover:text-foreground transition-colors font-medium text-primary"
                  >
                    Sign in
                  </Link>
                </div>
              </>
            ) : status === "success" ? (
              <Button
                data-testid="continue-to-login-btn"
                className="w-full font-bold"
                onClick={handleProceedToLogin}
              >
                Continue to Sign In
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : status === "error" ? (
              <>
                <Button
                  className="w-full font-bold"
                  onClick={() => navigate("/login")}
                >
                  Return to Login
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={handleSignUpAgain}
                >
                  Create a new account
                </Button>
              </>
            ) : null}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
