import { AuthForm } from "@/components/AuthForm";
import { signIn, signInAsDemo } from "@/lib/auth/actions";

export default function SignInPage() {
  // A checkout with no demo configured shows no button, rather than one that
  // always fails. This is a server component, so the variable is never sent to
  // the browser; only whether it was set is observable.
  const demo = process.env.DEMO_EMAIL ? signInAsDemo : undefined;
  return <AuthForm mode="sign-in" action={signIn} demoAction={demo} />;
}
