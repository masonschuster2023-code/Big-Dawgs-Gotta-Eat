"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Big Dawgs Gotta <span className="text-tennessee">Eat</span>
          </h1>
          <p className="text-sm text-neutral-500">Create your account</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-tennessee px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
          >
            {pending ? "Signing up…" : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-tennessee hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
