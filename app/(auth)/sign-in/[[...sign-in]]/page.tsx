import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl="/workflow"
        fallbackRedirectUrl="/workflow"
        signUpUrl="/sign-up"
      />
    </main>
  );
}