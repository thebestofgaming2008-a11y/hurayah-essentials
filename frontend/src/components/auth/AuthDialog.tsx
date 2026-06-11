import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AuthMode = "signIn" | "signUp" | "forgot" | "reset";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, requestPasswordReset, resetPassword } = useAuth();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if ((mode === "signIn" || mode === "signUp") && !password) return setError("Email and password are required.");
    if (mode === "reset" && (!resetCode.trim() || !newPassword)) return setError("Reset code and new password are required.");

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const { error: resetErr } = await requestPasswordReset(email);
        if (resetErr) return setError(resetErr.message);
        toast({ title: "Reset code sent", description: "Check your email for the password reset code." });
        setMode("reset");
        return;
      }

      if (mode === "reset") {
        const { error: resetErr } = await resetPassword(email, resetCode, newPassword);
        if (resetErr) return setError(resetErr.message);
        toast({ title: "Password reset", description: "You are signed in now." });
        onOpenChange(false);
        return;
      }

      const { error: authErr } = mode === "signIn" ? await signIn(email, password) : await signUp(email, password, fullName);
      if (authErr) return setError(authErr.message);
      toast({ title: mode === "signIn" ? "Signed in" : "Account created" });
      onOpenChange(false);
    } catch (err) {
      console.error("auth dialog submit", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : "Reset password";
  const description = mode === "forgot" || mode === "reset"
    ? "Use the code sent to your email to choose a new password."
    : "Access your orders, addresses and saved items without leaving this page.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="commerce-shell max-h-[92dvh] max-w-[440px] overflow-y-auto rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-0 shadow-2xl">
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-[20px] font-semibold tracking-tight text-[rgb(var(--vibe-foreground))]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[rgb(var(--vibe-muted))]">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid grid-cols-2 rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] p-1">
            <button type="button" onClick={() => setMode("signIn")} className={cn("h-8 rounded text-[12px]", mode === "signIn" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]")}>
              Sign in
            </button>
            <button type="button" onClick={() => setMode("signUp")} className={cn("h-8 rounded text-[12px]", mode === "signUp" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]")}>
              Create
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            {mode === "signUp" && <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />}
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
            {(mode === "signIn" || mode === "signUp") && <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete={mode === "signIn" ? "current-password" : "new-password"} required />}
            {mode === "reset" && (
              <>
                <Field label="Reset code" value={resetCode} onChange={setResetCode} autoComplete="one-time-code" required />
                <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" required />
              </>
            )}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="auth-dialog-submit-button"
              className="h-9 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait..." : mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : mode === "forgot" ? "Send reset code" : "Reset password"}
            </button>
          </form>

          {(mode === "signIn" || mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "signIn" ? "forgot" : "signIn");
              }}
              className="mx-auto mt-4 block text-center text-[12px] text-brand hover:underline"
            >
              {mode === "signIn" ? "Forgot your password?" : "Back to sign in"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
        data-testid={`auth-dialog-${label.toLowerCase().replace(/\s+/g, "-")}-input`}
        className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500"
      />
    </label>
  );
}
