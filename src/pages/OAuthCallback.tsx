import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/authApi";
import {
  clearOAuthState,
  getOAuthRedirectUri,
  getStoredOAuthProvider,
  getStoredOAuthState,
} from "@/utils/oauth";
import { OAuthProvider } from "@/types/user";
import { Loading01 as Loader2, CheckCircle, AlertTriangle } from "@untitledui/icons";
import { toast } from "sonner";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const params = useParams<{ provider?: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const hasExecutedRef = useRef(false);

  const handleFailure = useCallback((msg: string) => {
    setStatus("error");
    setErrorMessage(msg);
    clearOAuthState();

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          {
            type: "OAUTH_CALLBACK",
            error: msg,
          },
          window.location.origin
        );
        setTimeout(() => {
          try {
            window.close();
          } catch (_e) {
            void _e;
          }
        }, 1200);
        return;
      } catch (_e) {
        void _e;
      }
    }

    toast.error(msg);
    setTimeout(() => {
      navigate("/login");
    }, 2500);
  }, [navigate]);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const urlParams = typeof window !== "undefined" ? new URL(window.location.href).searchParams : searchParams;
    const code = searchParams.get("code") || urlParams.get("code");
    const state = searchParams.get("state") || urlParams.get("state");
    const error = searchParams.get("error") || urlParams.get("error");
    const errorDescription = searchParams.get("error_description") || urlParams.get("error_description");

    const expectedState = getStoredOAuthState();
    const storedProvider = getStoredOAuthProvider();
    const provider = (params.provider as OAuthProvider) || storedProvider || "google";

    // 1. Check for provider error
    if (error) {
      const msg = errorDescription || error || "Authentication was denied or cancelled.";
      handleFailure(msg);
      return;
    }

    // 2. Validate CSRF state if expectedState exists
    if (expectedState && state && state !== expectedState) {
      handleFailure("Security warning: OAuth state verification failed (potential CSRF). Please try again.");
      return;
    }

    if (!code) {
      handleFailure("No authorization code received from authentication provider.");
      return;
    }

    // 3. Popup window communication
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          {
            type: "OAUTH_CALLBACK",
            code,
            state,
            error: null,
          },
          window.location.origin
        );
        setStatus("success");
        clearOAuthState();
        setTimeout(() => {
          try {
            window.close();
          } catch (_e) {
            void _e;
          }
        }, 500);
        return;
      } catch (e) {
        console.warn("Could not postMessage to opener window, falling back to direct auth:", e);
      }
    }

    // 4. Direct full-page redirect fallback (when not in a popup)
    const exchangeDirectly = async () => {
      const redirectUri = getOAuthRedirectUri();
      try {
        const response = await authApi.oauthLogin({
          provider,
          code,
          redirectUri,
        });
        if (!response || !response.user) {
          throw new Error("Invalid response received from authentication server.");
        }
        setStatus("success");
        clearOAuthState();
        login(response.user, response.token);
        toast.success(
          `Welcome, ${response.user.fullName || response.user.email}!`
        );
        navigate("/");
      } catch (err: any) {
        handleFailure(err.message || "Failed to exchange authorization code.");
      }
    };

    exchangeDirectly();
  }, [searchParams, params, navigate, login, handleFailure]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-xl text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Completing sign in...</h2>
            <p className="text-xs text-muted-foreground">
              Please wait while we securely verify your account credentials.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Authentication Successful!</h2>
            <p className="text-xs text-muted-foreground">
              Closing this window and redirecting to your workspace...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Authentication Failed</h2>
            <p className="text-xs text-destructive">{errorMessage}</p>
            <p className="text-[11px] text-muted-foreground pt-2">
              Redirecting you back to the sign in page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
