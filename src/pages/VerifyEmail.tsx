import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState<string>(
    token ? "Verifying your email address..." : "No verification token provided in the link."
  );

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {status === "error" && (
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
            </div>

            <CardTitle className="text-xl font-bold tracking-tight">
              {status === "loading" && "Verifying Email"}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>

            <CardDescription className="text-sm mt-2 text-muted-foreground">
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 text-center">
            {status === "success" && (
              <p className="text-sm text-muted-foreground">
                You can now log in to your account and collaborate on your boards.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-muted-foreground">
                If the link expired, you can request a new verification email from the login page.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2">
            {status === "success" ? (
              <Button
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Continue to Login
              </Button>
            ) : status === "error" ? (
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Go to Login
              </Button>
            ) : null}

            <Link
              to="/login"
              className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              Return to Login
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
