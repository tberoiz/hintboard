"use client";

import React from "react";
import Link from "next/link";
import { Badge, Button } from "@hintboard/ui/component";
import {
  MessageSquare,
  Mail,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  ArrowUp,
  MessageCircle,
} from "lucide-react";

export default function HintboardLandingClean() {
  const [user, setUser] = React.useState<{ fullName?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      try {
        const { createClient } = await import("@hintboard/supabase/client");
        const supabase = createClient();

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          setUser({
            fullName:
              authUser.user_metadata?.full_name ||
              authUser.email?.split("@")[0] ||
              "User",
          });
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-semibold"
            >
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-xs text-primary-foreground font-bold">
                  H
                </span>
              </div>
              hintboard
            </Link>
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {!loading &&
              (user ? (
                <Button size="sm" asChild>
                  <Link href="/organizations">{user.fullName}</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/signup">Start Free</Link>
                  </Button>
                </>
              ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your users want to help
            <br />
            you build
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Give them a place to share ideas, show what you're working on, and
            announce updates—all automated from one hub.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free - 2 Minute Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
            <span>Free forever</span>
            <span>•</span>
            <span>No credit card</span>
            <span>•</span>
            <span>2 min setup</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-32">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Three tools. One engagement hub.
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to validate ideas and keep users engaged
            </p>
          </div>

          {/* 1. Feedback Board */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-4">
                  <MessageSquare className="mr-2 h-3 w-3" />
                  Collect Ideas
                </Badge>
                <h3 className="text-3xl font-bold mb-4">Feedback Board</h3>
                <p className="text-lg text-muted-foreground">
                  Users submit ideas and vote on what they want most. You see
                  exactly what to build next—no guessing.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Embed on your site or share a link</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Community voting shows priorities</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Validate ideas before you build</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex items-center justify-between p-4 rounded-md border hover:bg-accent/50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border text-xs font-medium">
                    <ArrowUp className="h-3 w-3" />
                    234
                  </div>
                  <span className="font-medium">Dark mode support</span>
                </div>
                <Badge>Under consideration</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-md border hover:bg-accent/50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border text-xs font-medium">
                    <ArrowUp className="h-3 w-3" />
                    187
                  </div>
                  <span className="font-medium">Export to CSV</span>
                </div>
                <Badge variant="secondary">Planned</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-md border hover:bg-accent/50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border text-xs font-medium">
                    <ArrowUp className="h-3 w-3" />
                    156
                  </div>
                  <span className="font-medium">Mobile app</span>
                </div>
                <Badge variant="outline">In Development</Badge>
              </div>
            </div>
          </div>

          {/* 2. Public Roadmap */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="rounded-lg border bg-card p-6 space-y-6 order-2 md:order-1">
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Planned
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-md border bg-blue-50 dark:bg-blue-950/20">
                    <div className="font-medium text-sm">API Access</div>
                  </div>
                  <div className="p-3 rounded-md border bg-blue-50 dark:bg-blue-950/20">
                    <div className="font-medium text-sm">Slack Integration</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  In Development
                </div>
                <div className="p-3 rounded-md border bg-purple-50 dark:bg-purple-950/20">
                  <div className="font-medium text-sm">Dark Mode</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Shipped
                </div>
                <div className="p-3 rounded-md border bg-green-50 dark:bg-green-950/20">
                  <div className="font-medium text-sm flex items-center gap-2">
                    Custom Domain
                    <span className="text-green-600">✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 order-1 md:order-2">
              <div>
                <Badge variant="secondary" className="mb-4">
                  <BarChart3 className="mr-2 h-3 w-3" />
                  Show Progress
                </Badge>
                <h3 className="text-3xl font-bold mb-4">Public Roadmap</h3>
                <p className="text-lg text-muted-foreground">
                  Show users what you're working on. They see you're actively
                  building and stay engaged with your product.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Drag and drop to update status</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Public page on your custom domain</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Build trust through transparency</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Email Announcements */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-4">
                  <Mail className="mr-2 h-3 w-3" />
                  Announce Updates
                </Badge>
                <h3 className="text-3xl font-bold mb-4">
                  Automated Announcements
                </h3>
                <p className="text-lg text-muted-foreground">
                  Ship a feature. Click announce. AI writes the email. Send to
                  everyone who voted. Done in 2 minutes.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>AI generates professional copy</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Auto-notify users who voted</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Links drive traffic to your hub</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  New Feature Live
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">
                    🎉 Dark Mode is Here!
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    You asked for it, we built it. Dark mode is now available
                    for all users. Toggle it in your settings to give your eyes
                    a break.
                  </p>
                </div>
                <Button className="w-full">
                  Try It Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                  Auto-generated • Sent to 234 voters
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Save time. Validate faster.
            </h2>
            <p className="text-lg text-muted-foreground">
              Stop doing manual busywork
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">5 hours saved weekly</h3>
              <p className="text-muted-foreground text-sm">
                No more manual emails, CSV exports, or hunting for feedback
                across Twitter, email, and support tickets.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Know what to build</h3>
              <p className="text-muted-foreground text-sm">
                Stop guessing. See exactly what users want most through voting.
                Build with confidence.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Stay top of mind</h3>
              <p className="text-muted-foreground text-sm">
                Regular updates keep users engaged with your product between
                logins. They remember you exist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Simple pricing</h2>
            <p className="text-lg text-muted-foreground">
              Start with a 2-week free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="rounded-lg border bg-card p-8 space-y-6 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold mb-2">Monthly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$15</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Billed monthly
                </p>
              </div>

              <div className="space-y-3 text-sm flex-grow">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Unlimited boards</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Unlimited subscribers</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>AI-generated announcements</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Custom domain</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Linear integration</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Remove branding</span>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-auto" asChild>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>

            <div className="rounded-lg border-2 border-primary bg-card p-8 space-y-6 relative flex flex-col">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Save 20%
              </Badge>

              <div>
                <h3 className="text-2xl font-bold mb-2">Yearly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$12</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  $144 billed annually
                </p>
              </div>

              <div className="space-y-3 text-sm flex-grow">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Unlimited boards</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Unlimited subscribers</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>AI-generated announcements</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Custom domain</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Linear integration</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>Remove branding</span>
                </div>
              </div>

              <Button className="w-full mt-auto" asChild>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include a 2-week free trial. No credit card required to
            start.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to engage your users?
          </h2>
          <p className="text-xl text-muted-foreground">
            Set up your hub in 2 minutes. No credit card required.
          </p>

          <Button size="lg" asChild>
            <Link href="/signup">
              Start Free Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold mb-4"
              >
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-bold">
                    H
                  </span>
                </div>
                hintboard
              </Link>
              <p className="text-sm text-muted-foreground">
                Engage users with feedback, roadmaps, and automated
                announcements.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <Link href="#pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Changelog
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Roadmap
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Documentation
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Support
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    API
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <Link href="#" className="hover:text-foreground">
                    About
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Privacy
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-foreground">
                    Terms
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 hintboard
          </div>
        </div>
      </footer>
    </div>
  );
}
