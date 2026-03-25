import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <SignUp
        routing="path"
        path="/sign-up"
        forceRedirectUrl="/workflow"
        fallbackRedirectUrl="/workflow"
        signInUrl="/sign-in"
      />
    </main>
  );
}
