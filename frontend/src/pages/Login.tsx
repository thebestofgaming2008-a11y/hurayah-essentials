import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/account";
  const { signIn, signUp } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message);
          return;
        }
        toast({ title: "Welcome back" });
        navigate(redirect);
      } else {
        const { error: signUpErr } = await signUp(email, password, fullName.trim() || undefined);
        if (signUpErr) {
          setError(signUpErr.message);
          return;
        }
        toast({
          title: "Account created",
          description: "Please sign in to continue.",
        });
        setMode("signin");
        setPassword("");
      }
    } catch (err) {
      console.error("auth submit", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[460px] px-4 md:px-8 py-12 md:py-20">
        <div className="rounded-2xl border border-border bg-background p-6 md:p-8 shadow-sm">
          <h1 className="text-foreground italic font-bold tracking-tight text-2xl md:text-3xl text-center">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-center text-sm text-foreground/60">
            {mode === "signin"
              ? "Sign in to view orders, addresses and your wishlist."
              : "Join the Hurayrah Essentials family."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
            {mode === "signup" && (
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />

            {error && (
              <p
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="login-form-submit-button"
              className="w-full inline-flex items-center justify-center rounded-md bg-brand text-brand-foreground font-semibold py-3 hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-foreground/65">
            {mode === "signin" ? "New here?" : "Already a member?"}{" "}
            <button
              onClick={switchMode}
              className="text-brand font-semibold hover:underline"
              type="button"
              data-testid="login-mode-toggle-button"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-3 text-center text-xs text-foreground/50">
            <Link to="/" className="hover:text-brand">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </SiteLayout>
  );
};

interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function Field({ label, value, onChange, ...props }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`login-${label.toLowerCase().replace(/\s+/g, "-")}-input`}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

export default Login;