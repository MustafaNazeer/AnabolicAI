import { AuthForm } from "@/components/AuthForm";
import { signIn, signInAsDemo } from "@/lib/auth/actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // A checkout with no demo configured shows no button, rather than one that
  // always fails. This is a server component, so the variable is never sent to
  // the browser; only whether it was set is observable.
  const demo = process.env.DEMO_EMAIL ? signInAsDemo : undefined;

  // The callback route sends a refused provider sign in back here with this
  // marker. A repeated parameter arrives as an array rather than a string, so
  // comparing to the marker also rejects that. Note that searchParams is a
  // promise and has to be awaited.
  const { error } = await searchParams;
  const notice =
    error === "not-invited" ? "This email is not on the invite list." : undefined;

  return (
    <AuthForm mode="sign-in" action={signIn} demoAction={demo} notice={notice} />
  );
}
