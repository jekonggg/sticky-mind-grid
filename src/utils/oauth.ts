import { OAuthProvider, OAuthProviderInfo } from "@/types/user";

const OAUTH_STATE_KEY = "smg_oauth_state";
const OAUTH_PROVIDER_KEY = "smg_oauth_provider";

/**
 * Returns the default frontend OAuth callback URL.
 */
export function getOAuthRedirectUri(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8080/auth/callback";
  }
  return `${window.location.origin}/auth/callback`;
}

/**
 * Generates a random cryptographic state token to protect against CSRF attacks,
 * storing it in sessionStorage alongside the active provider.
 */
export function generateOAuthState(provider: OAuthProvider): string {
  const array = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const state = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
    window.sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
  }
  return state;
}

export function getStoredOAuthState(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage.getItem(OAUTH_STATE_KEY);
}

export function getStoredOAuthProvider(): OAuthProvider | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage.getItem(OAUTH_PROVIDER_KEY) as OAuthProvider | null;
}

export function clearOAuthState(): void {
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.removeItem(OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
  }
}

/**
 * Builds the provider authorization URL with the appropriate client ID, scopes, and redirect URI.
 */
export function buildProviderAuthUrl(
  provider: OAuthProvider,
  providerInfo: OAuthProviderInfo,
  redirectUri: string,
  state: string
): string {
  const clientId = providerInfo.clientId;
  if (!clientId) {
    throw new Error(`Client ID for ${providerInfo.name} is not configured.`);
  }

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state: state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state: state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === "microsoft") {
    const tenant = providerInfo.tenantId || "common";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile User.Read",
      prompt: "select_account",
      state: state,
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

export interface OAuthPopupResult {
  code: string;
  state?: string;
}

/**
 * Opens a centered popup window for the OAuth flow and listens for the authorization code.
 */
export function openOAuthPopup(
  url: string,
  title: string = "Sign in with Provider"
): Promise<OAuthPopupResult> {
  return new Promise((resolve, reject) => {
    const width = 520;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      reject(new Error("Popup blocked by browser. Please allow popups for this site or use redirect flow."));
      return;
    }

    let isCleanedUp = false;
    let pollTimer: any = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      window.removeEventListener("message", onMessage);
      if (pollTimer) clearInterval(pollTimer);
    };

    const onMessage = (event: MessageEvent) => {
      // Security: Only accept messages from the same origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data && event.data.type === "OAUTH_CALLBACK") {
        cleanup();
        try {
          if (!popup.closed) popup.close();
        } catch (_e) {
          void _e;
        }

        if (event.data.error) {
          reject(new Error(event.data.error));
        } else if (event.data.code) {
          resolve({
            code: event.data.code,
            state: event.data.state,
          });
        } else {
          reject(new Error("No authorization code received from provider"));
        }
      }
    };

    window.addEventListener("message", onMessage);

    // Poll to detect if user manually closes the popup window
    pollTimer = setInterval(() => {
      try {
        if (popup.closed) {
          cleanup();
          reject(new Error("Sign in window was closed"));
        }
      } catch {
        // Cross-origin checks may throw on navigation, ignore
      }
    }, 600);
  });
}
