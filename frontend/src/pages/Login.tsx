import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/account";
  const { signIn, signUp } = useAuth();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: signInErr } = mode === "signIn" ? await signIn(email, password) : await signUp(email, password, fullName);
      if (signInErr) {
        setError(signInErr.message);
        return;
      }
      toast({ title: mode === "signIn" ? "Signed in" : "Account created" });
      navigate(redirect);
    } catch (err) {
      console.error("auth submit", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="commerce-shell mx-auto max-w-[460px] px-4 py-12 md:px-8 md:py-20">
        <div className="rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-center text-[20px] font-semibold tracking-tight text-[rgb(var(--vibe-foreground))]">
            {mode === "signIn" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-center text-[13px] text-[rgb(var(--vibe-muted))]">
            Access your orders, addresses and saved items.
          </p>
          <div className="mt-5 grid grid-cols-2 rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] p-1">
            <button type="button" onClick={() => setMode("signIn")} className={`h-8 rounded text-[12px] ${mode === "signIn" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]"}`}>Sign in</button>
            <button type="button" onClick={() => setMode("signUp")} className={`h-8 rounded text-[12px] ${mode === "signUp" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]"}`}>Create</button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
            {mode === "signUp" && <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />}
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete={mode === "signIn" ? "current-password" : "new-password"} required />

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="login-form-submit-button"
              className="h-9 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait..." : mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/track" className="grid h-8 place-items-center rounded-md border border-[rgb(var(--vibe-border))] text-[12px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]">
              Track order
            </Link>
            <Link to="/" className="grid h-8 place-items-center rounded-md border border-[rgb(var(--vibe-border))] text-[12px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]">
              Storefront
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function Field({ label, value, onChange, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={`login-${label.toLowerCase().replace(/\s+/g, "-")}-input`}
        className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500"
      />
    </label>
  );
}

export default Login;
