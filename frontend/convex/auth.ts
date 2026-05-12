import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email.toLowerCase(),
        };
      },
      validatePasswordRequirements(password) {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
      },
    }),
  ],
});