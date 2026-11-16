"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="panel m-10">
      <h1>Workspace unavailable</h1>
      <p className="my-5">
        Check the local registry and server configuration, then retry.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
