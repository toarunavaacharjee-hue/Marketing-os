import Link from "next/link";
import { Card, Container } from "@/lib/ui";

function PriceCard({
  name,
  price,
  plan,
  bullets
}: {
  name: string;
  price: string;
  plan: "starter" | "growth" | "enterprise";
  bullets: string[];
}) {
  return (
    <Card className="p-6">
      <div className="text-sm text-white/70">{name}</div>
      <div className="mt-2 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
        {price}
      </div>
      <div className="mt-4 space-y-2 text-sm text-white/75">
        {bullets.map((b) => (
          <div key={b} className="flex gap-2">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            <div>{b}</div>
          </div>
        ))}
      </div>

      <Link
        href={`/signup?plan=${plan}`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-cta px-4 py-3 text-sm font-medium text-black"
      >
        Choose {name}
      </Link>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <Container>
      <div className="mb-10">
        <div className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
          Pricing
        </div>
        <p className="mt-2 text-white/75">
          Start with Starter and upgrade anytime.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PriceCard
          name="Starter"
          price="$49 / month"
          plan="starter"
          bullets={["100 AI queries / month", "Core modules", "Email support"]}
        />
        <PriceCard
          name="Growth"
          price="$99 / month"
          plan="growth"
          bullets={["Unlimited AI queries", "Advanced modules", "Priority support"]}
        />
        <PriceCard
          name="Enterprise"
          price="$299 / month"
          plan="enterprise"
          bullets={["Unlimited AI queries", "SLA + onboarding", "Dedicated support"]}
        />
      </div>
    </Container>
  );
}

