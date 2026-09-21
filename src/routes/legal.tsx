import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms, privacy and guidelines — BlindMatch" },
      {
        name: "description",
        content:
          "How BlindMatch handles your data, what we expect from members, and the rules of our 18+ community.",
      },
      { property: "og:title", content: "Terms, privacy and guidelines — BlindMatch" },
      {
        property: "og:description",
        content:
          "How BlindMatch handles your data, what we expect from members, and the rules of our 18+ community.",
      },
    ],
  }),
  component: LegalPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Terms of Service (placeholder)",
    body: [
      "BlindMatch is available only to people aged 18 and over. By using it you confirm you meet that requirement and that the information on your profile is your own.",
      "We make no promises about meeting anyone, forming a relationship, or any particular outcome. Compatibility percentages are a light discovery signal based on shared interests and the answers you write — nothing more.",
      "We may pause or close an account that breaks these terms or our community guidelines.",
      "Replace this placeholder with your own reviewed Terms of Service before launch.",
    ],
  },
  {
    title: "Privacy Policy (placeholder)",
    body: [
      "We store your first name, date of birth, gender, who you'd like to meet, city, photo, bio, interests and your written answers. Other members only ever see your first name, age, city, photo, bio, interests and answers.",
      "Your date of birth is kept private and used solely to confirm you are 18 or older and to show your age.",
      "Your Telegram account details are used only to sign you in securely and are never shown to other members.",
      "Private messages are visible to you and the person you matched with. Moderators can only open a conversation when a specific report authorises it, and every such access is recorded.",
      "You can delete your account at any time from your profile. Deletion removes your profile, photo, likes, matches and messages.",
      "Replace this placeholder with your own reviewed Privacy Policy before launch.",
    ],
  },
  {
    title: "Community Guidelines",
    body: [
      "Be a real person. One account, your own photos, your own words.",
      "No harassment, hate, threats, or sexual content involving anyone under 18 — ever.",
      "No money requests, investment offers, external links, or promotion.",
      "Respect a no. If someone stops replying, leave it there.",
      "Report anything that feels wrong. Reports are private and reviewed by our moderation team.",
    ],
  },
];

function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
      <Link
        to="/profile"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="mt-4 font-display text-3xl leading-tight text-foreground">
        Terms, privacy and guidelines
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        BlindMatch is strictly for adults aged 18 and over.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="font-display text-xl text-foreground">{section.title}</h2>
          <div className="mt-2 space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
