import { SubscriptionWorkspace } from "@/components/subscription-workspace";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 sm:py-10">
      <SubscriptionWorkspace embedded />
    </main>
  );
}
