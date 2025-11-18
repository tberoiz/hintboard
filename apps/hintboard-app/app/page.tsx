"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  MessageSquare,
  TrendingUp,
  Zap,
  Star,
  Users,
  Clock,
  Sparkles,
  BarChart3,
  Mail,
  Play,
  Lock,
  Send,
} from "lucide-react";

export default function HintboardModernLanding() {
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = React.useState<{ fullName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-xl font-bold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                <span className="text-sm text-white font-bold">H</span>
              </div>
              <span className="text-white">hintboard</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a
                href="#features"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Pricing
              </a>
              <a
                href="#"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Customers
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading &&
              (user ? (
                <a
                  href="/organizations"
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-orange-500/20 transition"
                >
                  {user?.fullName || ""}
                </a>
              ) : (
                <>
                  <a
                    href="/login"
                    className="hidden md:block text-sm text-gray-400 hover:text-white transition px-4 py-2"
                  >
                    Sign in
                  </a>
                  <a
                    href="/register"
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-orange-500/20 transition"
                  >
                    Start Free Trial
                  </a>
                </>
              ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-6 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full mix-blend-screen filter blur-3xl"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full mix-blend-screen filter blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Trusted by 500+ product teams</span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-tight">
              Turn feedback into
              <span className="block bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                features users love
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              The all-in-one hub to collect ideas, show progress, and announce
              updates. Build what matters. Keep users engaged.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a
                href="/register"
                className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </a>
              <button className="px-8 py-4 bg-white/5 text-white rounded-xl font-semibold border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 pt-8">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-400" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-400" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-400" />
                <span>2-min setup</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="aspect-video bg-gradient-to-br from-black to-gray-900 flex items-center justify-center p-8">
                {/* Mock Interface */}
                <div className="w-full max-w-4xl space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-bold text-white">
                          234
                        </span>
                      </div>
                      <span className="font-medium text-white">
                        Dark mode support
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Under consideration
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-white">
                          187
                        </span>
                      </div>
                      <span className="font-medium text-white">Mobile app</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Planned
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating stat */}
            <div
              className="absolute -top-6 -left-6 bg-black/80 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-white/10 animate-bounce"
              style={{ animationDuration: "3s" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ideas collected</p>
                  <p className="text-lg font-bold text-white">1,247</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider">
            Trusted by leading teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12">
            <a
              href="https://trysynq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-bold text-white/30 hover:text-white/50 transition"
            >
              Synq
            </a>
            <div className="text-2xl font-bold text-white/30">[Logo 2]</div>
            <div className="text-2xl font-bold text-white/30">[Logo 3]</div>
            <div className="text-2xl font-bold text-white/30">[Logo 4]</div>
            <div className="text-2xl font-bold text-white/30">[Logo 5]</div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Stop losing users in the void
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            You're building blindly. Feedback scattered across email, Twitter,
            and support tickets. Users don't know what you're working on. They
            forget you exist between logins.
          </p>

          {/* Pain Points Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-left space-y-3 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <span className="text-2xl">😓</span>
              </div>
              <h3 className="font-semibold text-white">
                Guessing what to build
              </h3>
              <p className="text-sm text-gray-400">
                You hear 5 loud voices but miss what 500 quiet users actually
                want
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-left space-y-3 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold text-white">Manual busywork hell</h3>
              <p className="text-sm text-gray-400">
                Hours spent on emails, organizing feedback, and updating users
                manually
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-left space-y-3 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <span className="text-2xl">👻</span>
              </div>
              <h3 className="font-semibold text-white">Ghosting your users</h3>
              <p className="text-sm text-gray-400">
                Ship features and users don't notice. No engagement = churn
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Everything you need in one place
            </h2>
            <p className="text-xl text-gray-400">
              Three powerful tools that work together seamlessly
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: MessageSquare, label: "Feedback Board" },
              { icon: BarChart3, label: "Public Roadmap" },
              { icon: Mail, label: "AI Announcements" },
            ].map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
                  activeTab === idx
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 backdrop-blur-sm"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feature Content */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Tab 0: Feedback Board */}
            {activeTab === 0 && (
              <>
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium border border-orange-500/20">
                    <MessageSquare className="w-4 h-4" />
                    Collect & Prioritize
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Let your users tell you what to build
                  </h3>
                  <p className="text-lg text-gray-400">
                    Community voting shows exactly what features will drive the
                    most value. Stop guessing. Start validating.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Upvoting reveals true demand",
                      "Embed anywhere or share standalone",
                      "See trending ideas at a glance",
                      "Comment threads keep discussions organized",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-500/20">
                          <Check className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                  <div className="bg-black/50 rounded-xl border border-white/10 p-6 space-y-3">
                    {[
                      {
                        votes: 234,
                        title: "Dark mode support",
                        status: "Planned",
                        color: "amber",
                      },
                      {
                        votes: 187,
                        title: "Mobile app",
                        status: "In Progress",
                        color: "purple",
                      },
                      {
                        votes: 156,
                        title: "API access",
                        status: "Considering",
                        color: "gray",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-bold text-white">
                              {item.votes}
                            </span>
                          </div>
                          <span className="font-medium text-white">
                            {item.title}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.color === "amber"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : item.color === "purple"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tab 1: Roadmap */}
            {activeTab === 1 && (
              <>
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium border border-purple-500/20">
                    <BarChart3 className="w-4 h-4" />
                    Show Progress
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Keep users in the loop
                  </h3>
                  <p className="text-lg text-gray-400">
                    Public roadmaps build trust and excitement. Users see you're
                    actively building and stay engaged with your product.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Drag-and-drop status updates",
                      "Beautiful public page on your domain",
                      "Automatic notifications when status changes",
                      "Build anticipation for upcoming features",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-500/20">
                          <Check className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                  <div className="bg-black/50 rounded-xl border border-white/10 p-6 space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Now
                      </p>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="font-medium text-emerald-300 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Dark Mode
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Next
                      </p>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="font-medium text-purple-300">
                          Mobile App
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Later
                      </p>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="font-medium text-gray-300">
                            API Access
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="font-medium text-gray-300">
                            Slack Integration
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab 2: Announcements */}
            {activeTab === 2 && (
              <>
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                    <Zap className="w-4 h-4" />
                    AI-Powered
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Ship & announce in 2 minutes
                  </h3>
                  <p className="text-lg text-gray-400">
                    Launch a feature. Click announce. AI writes the email. Send
                    to everyone who voted. Done. Users actually know about your
                    updates.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "AI generates professional copy instantly",
                      "Auto-notify users who requested the feature",
                      "Customizable templates match your brand",
                      "Track opens and clicks",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-500/20">
                          <Check className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                  <div className="bg-black/50 rounded-xl border border-white/10 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      AI-Generated Email
                    </div>
                    <h4 className="text-xl font-bold text-white">
                      🎉 Dark Mode is Live!
                    </h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      You asked for it, we built it. Dark mode is now available
                      for all users. Give your eyes a break and toggle it in
                      your settings.
                    </p>
                    <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition flex items-center justify-center gap-2">
                      Try Dark Mode
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                      <span>Sent to 234 voters</span>
                      <span>92% open rate</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 -z-10"></div>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                5 hrs
              </div>
              <p className="text-gray-400">Saved per week</p>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                3x
              </div>
              <p className="text-gray-400">More user engagement</p>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                94%
              </div>
              <p className="text-gray-400">Customer satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by product teams
            </h2>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-6 h-6 fill-amber-400 text-amber-400"
                />
              ))}
              <span className="ml-2 text-gray-400">
                4.9/5 from 200+ reviews
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-4 hover:bg-white/[0.07] transition backdrop-blur-sm"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed">
                  "[Testimonial quote about how Hintboard helped their product
                  development and user engagement]"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500"></div>
                  <div>
                    <p className="font-semibold text-white">Name Here</p>
                    <p className="text-sm text-gray-400">Title, Company</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-400">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6 hover:border-white/20 transition backdrop-blur-sm">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Monthly</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$15</span>
                  <span className="text-gray-400">/month</span>
                </div>
              </div>

              <ul className="space-y-3">
                {[
                  "Unlimited feedback posts",
                  "Unlimited subscribers",
                  "AI announcement generation",
                  "Public roadmap",
                  "Custom domain",
                  "Email support",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition border border-white/10">
                Start Free Trial
              </button>
            </div>

            {/* Yearly - Featured */}
            <div className="rounded-2xl border-2 border-orange-500 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-8 space-y-6 relative hover:shadow-lg hover:shadow-orange-500/20 transition backdrop-blur-sm">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold rounded-full shadow-lg">
                SAVE 20%
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Yearly</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$12</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Billed $144 annually
                </p>
              </div>

              <ul className="space-y-3">
                {[
                  "Everything in Monthly",
                  "Priority support",
                  "Early access to features",
                  "Remove Hintboard branding",
                  "Advanced analytics",
                  "Linear integration",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                className="block w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition text-center"
              >
                Start Free Trial
              </a>
            </div>
          </div>

          <p className="text-center text-gray-400 mt-8">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "How long does setup take?",
                a: "About 2 minutes. Create your board, customize your domain, and embed the widget. That's it.",
              },
              {
                q: "Can I use my own domain?",
                a: "Yes! Connect your custom domain (like feedback.yourcompany.com) on all paid plans.",
              },
              {
                q: "How does the AI announcement feature work?",
                a: "When you mark a feature as 'Shipped', our AI generates a professional announcement email. You can edit it before sending to all users who voted for that feature.",
              },
              {
                q: "What happens after the free trial?",
                a: "After 14 days, you'll be prompted to add a payment method. If you don't, your account stays active but with limited features.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, cancel anytime with one click. No questions asked. Your data is exportable.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition"
              >
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-white">
            Start building what users actually want
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join 500+ product teams using Hintboard to validate ideas, build
            trust, and keep users engaged.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a
              href="/register"
              className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </a>
            <button className="px-8 py-4 bg-white/5 text-white rounded-xl font-semibold border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </div>
          <p className="text-sm text-gray-400">
            No credit card required • 14-day free trial • Setup in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-sm text-white font-bold">H</span>
                </div>
                <span className="text-xl font-bold text-white">hintboard</span>
              </div>
              <p className="text-sm text-gray-400">
                The all-in-one hub for product feedback, roadmaps, and automated
                announcements.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  Twitter
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  LinkedIn
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  GitHub
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Changelog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    API
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Customers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition"
                  >
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2024 Hintboard. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition">
                Status
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                Security
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
