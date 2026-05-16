import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/ui/Logo";

interface PageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const from = params.from && params.from.startsWith("/") ? params.from : "/dashboard";
  if (session?.user) redirect(from);

  return (
    <main className="min-h-screen bg-bg-dark text-ink-light flex items-center justify-center p-6">
      <div className="w-full max-w-sm border border-ink-light/10 bg-bg-dark-2/30 p-6 space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="space-y-1 text-center">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ ACCESS
          </div>
          <h1 className="font-display font-bold text-h2 text-ink-light">Sign in to continue</h1>
          <p className="font-mono text-label-sm text-ink-light-muted">
            Frame0 is gated. Sign in to open the dashboard, run commissions, and chat with your graph.
          </p>
        </div>

        <Suspense>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: from });
            }}
          >
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-accent-lime text-bg-dark font-mono text-label uppercase tracking-widest hover:bg-accent-lime-bright transition-colors"
            >
              ▸ continue with google
            </button>
          </form>
        </Suspense>

        {params.error && (
          <div className="border border-accent-orange/60 bg-accent-orange/10 px-3 py-2 font-mono text-label-sm text-accent-orange">
            ▶ {params.error}
          </div>
        )}

        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-light-muted text-center">
          access control only · no per-user data isolation yet
        </div>
      </div>
    </main>
  );
}
