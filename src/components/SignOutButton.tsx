import { signOut } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-3 font-medium"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "var(--text)",
          minHeight: 48,
        }}
      >
        <LogOut size={18} aria-hidden />
        Sign out
      </button>
    </form>
  );
}
