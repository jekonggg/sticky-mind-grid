import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loading01 as Loader2,
  LayoutGrid01 as LayoutGrid,
  Eye,
  EyeOff,
  Check,
  XClose as X,
} from "@untitledui/icons";
import { motion, AnimatePresence } from "framer-motion";

import { OAuthButtons } from "@/components/auth/OAuthButtons";

interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(() => emailParam || "");

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Warm the login chunk so "Sign in" navigates without a fallback flash.
  useEffect(() => {
    void import("./Login");
  }, []);

  // Evaluate password complexity criteria in real-time
  const passwordRules: PasswordRule[] = useMemo(() => [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "uppercase", label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { id: "lowercase", label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { id: "number", label: "At least one number (0-9)", met: /[0-9]/.test(password) },
    { id: "special", label: "At least one special symbol (!@#$%^&*)", met: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`]/.test(password) },
  ], [password]);

  const metRulesCount = passwordRules.filter((r) => r.met).length;
  const isAllPasswordCriteriaMet = metRulesCount === passwordRules.length;
  const isConfirmPasswordFilled = confirmPassword.length > 0;
  const doPasswordsMatch = isConfirmPasswordFilled && password === confirmPassword;

  // Strength label & color calculations
  const strengthInfo = useMemo(() => {
    if (password.length === 0) return { label: "", color: "bg-muted", textColor: "text-muted-foreground", percent: 0 };
    if (metRulesCount <= 2) return { label: "Weak", color: "bg-destructive", textColor: "text-destructive", percent: 25 };
    if (metRulesCount === 3) return { label: "Fair", color: "bg-orange-500", textColor: "text-orange-500", percent: 50 };
    if (metRulesCount === 4) return { label: "Good", color: "bg-amber-500", textColor: "text-amber-500", percent: 75 };
    return { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", percent: 100 };
  }, [password.length, metRulesCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllPasswordCriteriaMet) {
      toast.error("Please satisfy all password complexity requirements.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register(email, password, fullName);
      toast.success(
        response.message || "Account created successfully! Please sign in with your credentials."
      );
      // Requirement 5 & 7: Store pre-fill email in sessionStorage (never password)
      sessionStorage.setItem("login_prefill_email", email.trim().toLowerCase());
      const nextLoginUrl = redirectParam ? `/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectParam)}` : "/login";


      navigate(nextLoginUrl, { state: { email } });
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md my-auto"
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
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Enter your details or use social account to get started
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>

              {/* Password Input with Dynamic Criteria */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    required
                    placeholder="Create a strong password"
                    className="bg-muted/50 border-border/50 focus:bg-background transition-colors pr-10"
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

                {/* Password Strength Meter & Live Checklist */}
                {(isPasswordFocused || password.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-1.5 space-y-2 text-xs"
                  >
                    {/* Visual Strength Meter Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-bold ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4].map((step) => {
                          const isStepActive = metRulesCount >= step;
                          return (
                            <div
                              key={step}
                              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                isStepActive ? strengthInfo.color : "bg-muted"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Bulleted Criteria Checklist */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Must contain:
                      </p>
                      <ul className="space-y-1" aria-label="Password requirements">
                        {passwordRules.map((rule) => (
                          <li
                            key={rule.id}
                            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                              rule.met
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {rule.met ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 flex items-center justify-center shrink-0">
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                              </div>
                            )}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password Input with Live Match Indicator */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter your password"
                    className="bg-muted/50 border-border/50 focus:bg-background transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-md p-0.5"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Match indicator */}
                {isConfirmPasswordFilled && (
                  <div className="text-[11px] flex items-center gap-1.5 pt-0.5">
                    {doPasswordsMatch ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 text-destructive shrink-0 stroke-[2.5]" />
                        <span className="text-destructive font-semibold">
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full font-bold"
                disabled={loading || !isAllPasswordCriteriaMet || !doPasswordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <OAuthButtons mode="register" />

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to={redirectParam ? `/login?${new URLSearchParams({ ...(email ? { email } : {}), redirect: redirectParam }).toString()}` : "/login"}
                  className="text-primary hover:underline font-semibold"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
