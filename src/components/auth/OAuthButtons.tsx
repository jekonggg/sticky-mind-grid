import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/authApi";
import { OAuthProvider, OAuthLoginPayload } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OAuthButtonsProps {
  mode?: "login" | "register";
}

// Default presets for fast 1-click testing/login
const PRESET_ACCOUNTS: Record<
  OAuthProvider,
  Array<{ name: string; email: string; avatarUrl: string }>
> = {
  google: [
    {
      name: "Alex Johnson",
      email: "alex.johnson@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Sophia Chen",
      email: "sophia.chen@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
  ],
  github: [
    {
      name: "Octo Developer",
      email: "octodev@github.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    },
    {
      name: "Dev Lead",
      email: "techlead@github.com",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    },
  ],
  microsoft: [
    {
      name: "Morgan Lee",
      email: "morgan.lee@outlook.com",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Jordan Taylor",
      email: "jordan.taylor@live.com",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  ],
};

// Provider metadata
const PROVIDER_INFO: Record<
  OAuthProvider,
  { name: string; color: string; bgHover: string }
> = {
  google: {
    name: "Google",
    color: "#4285F4",
    bgHover: "hover:bg-red-500/5 hover:border-red-500/30",
  },
  github: {
    name: "GitHub",
    color: "#24292F",
    bgHover: "hover:bg-muted/80 hover:border-foreground/30",
  },
  microsoft: {
    name: "Microsoft",
    color: "#00A4EF",
    bgHover: "hover:bg-blue-500/5 hover:border-blue-500/30",
  },
};

export function OAuthButtons({ mode = "login" }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<OAuthProvider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleOAuthFlow = async (payload: OAuthLoginPayload) => {
    setLoadingProvider(payload.provider);
    try {
      const response = await authApi.oauthLogin(payload);
      login(response.user, response.token);
      toast.success(
        `Signed in with ${PROVIDER_INFO[payload.provider].name}! Welcome, ${
          response.user.fullName || response.user.email
        }`
      );
      setIsModalOpen(false);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${PROVIDER_INFO[payload.provider].name}`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleProviderClick = (provider: OAuthProvider) => {
    setSelectedProvider(provider);
    setCustomEmail("");
    setCustomName("");
    setIsModalOpen(true);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !customEmail) return;

    handleOAuthFlow({
      provider: selectedProvider,
      profile: {
        email: customEmail.trim(),
        fullName: customName.trim() || undefined,
        providerId: `${selectedProvider}_${Date.now()}`,
      },
    });
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">
            Or {mode === "register" ? "sign up" : "sign in"} with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Google Button */}
        <Button
          type="button"
          variant="outline"
          disabled={loadingProvider !== null}
          onClick={() => handleProviderClick("google")}
          className={`h-10 text-xs font-semibold border-border/70 bg-card hover:bg-muted/60 transition-all ${PROVIDER_INFO.google.bgHover}`}
          title="Continue with Google"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg className="h-4 w-4 shrink-0 mr-1.5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span className="hidden sm:inline">Google</span>
        </Button>

        {/* GitHub Button */}
        <Button
          type="button"
          variant="outline"
          disabled={loadingProvider !== null}
          onClick={() => handleProviderClick("github")}
          className={`h-10 text-xs font-semibold border-border/70 bg-card hover:bg-muted/60 transition-all ${PROVIDER_INFO.github.bgHover}`}
          title="Continue with GitHub"
        >
          {loadingProvider === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg className="h-4 w-4 shrink-0 mr-1.5 fill-foreground" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          )}
          <span className="hidden sm:inline">GitHub</span>
        </Button>

        {/* Microsoft Button */}
        <Button
          type="button"
          variant="outline"
          disabled={loadingProvider !== null}
          onClick={() => handleProviderClick("microsoft")}
          className={`h-10 text-xs font-semibold border-border/70 bg-card hover:bg-muted/60 transition-all ${PROVIDER_INFO.microsoft.bgHover}`}
          title="Continue with Microsoft"
        >
          {loadingProvider === "microsoft" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg className="h-4 w-4 shrink-0 mr-1.5" viewBox="0 0 24 24">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#00a4ef" d="M1 13h10v10H1z" />
              <path fill="#7fba00" d="M13 1h10v10H13z" />
              <path fill="#ffb900" d="M13 13h10v10H13z" />
            </svg>
          )}
          <span className="hidden sm:inline">Microsoft</span>
        </Button>
      </div>

      {/* Interactive Account Selection Modal */}
      {selectedProvider && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {selectedProvider === "google" && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {selectedProvider === "github" && (
                  <svg className="h-5 w-5 fill-foreground" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                {selectedProvider === "microsoft" && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z" />
                    <path fill="#00a4ef" d="M1 13h10v10H1z" />
                    <path fill="#7fba00" d="M13 1h10v10H13z" />
                    <path fill="#ffb900" d="M13 13h10v10H13z" />
                  </svg>
                )}
                <span>Continue with {PROVIDER_INFO[selectedProvider].name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Choose a pre-configured profile or enter your {PROVIDER_INFO[selectedProvider].name} email to {mode === "register" ? "sign up" : "sign in"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Quick Select Preset Cards */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  1-Click Profiles
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_ACCOUNTS[selectedProvider].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      disabled={loadingProvider !== null}
                      onClick={() =>
                        handleOAuthFlow({
                          provider: selectedProvider,
                          profile: {
                            email: account.email,
                            fullName: account.name,
                            avatarUrl: account.avatarUrl,
                            providerId: `${selectedProvider}_${account.email}`,
                          },
                        })
                      }
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                    >
                      <img
                        src={account.avatarUrl}
                        alt={account.name}
                        className="w-9 h-9 rounded-full object-cover border border-border/80 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {account.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {account.email}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Email Form */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-semibold">
                    Or use custom account
                  </span>
                </div>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="oauth-email" className="text-xs">
                    {PROVIDER_INFO[selectedProvider].name} Email
                  </Label>
                  <Input
                    id="oauth-email"
                    type="email"
                    placeholder={`you@${
                      selectedProvider === "google"
                        ? "gmail.com"
                        : selectedProvider === "github"
                        ? "github.com"
                        : "outlook.com"
                    }`}
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="oauth-name" className="text-xs">
                    Full Name (Optional)
                  </Label>
                  <Input
                    id="oauth-name"
                    type="text"
                    placeholder="Your Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={!customEmail || loadingProvider !== null}
                    className="w-full h-9 text-xs font-bold gap-2"
                  >
                    {loadingProvider !== null ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      `Continue with ${PROVIDER_INFO[selectedProvider].name}`
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
