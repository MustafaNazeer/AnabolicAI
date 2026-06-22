import { signOut } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium"
        style={{ background: "var(--surface)", color: "var(--text)", minHeight: 48 }}
      >
        <LogOut size={18} aria-hidden />
        Sign out
      </button>
    </form>
  );
}
