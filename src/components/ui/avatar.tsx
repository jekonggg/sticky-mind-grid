import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import { API_BASE, getStoredToken } from "@/config/api";

export function getMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  let fullUrl = url;
  if (url.startsWith("/api/")) {
    const backendOrigin = API_BASE.replace(/\/api\/?$/, "");
    fullUrl = `${backendOrigin}${url}`;
  }
  if (fullUrl.includes("/api/files/")) {
    const token = getStoredToken();
    if (token && !fullUrl.includes("token=")) {
      const separator = fullUrl.includes("?") ? "&" : "?";
      fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return fullUrl;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full select-none", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    src={getMediaUrl(src)}
    className={cn("aspect-square h-full w-full object-cover max-h-full max-w-full block rounded-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
