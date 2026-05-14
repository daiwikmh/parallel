"use client";
import { useState } from "react";
import { BracketInput } from "../ui/BracketInput";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="bg-bg-dark text-ink-light border-t border-ink-light/10">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
          &#9654; NEWSLETTER
        </span>
        <h2 className="font-display font-bold text-h1 mt-4 mb-4">
          Get OG Times in your inbox
        </h2>
        <p className="text-ink-light-muted text-lg mb-12">
          Daily editorial digest. No human ever touches it.
        </p>

        {submitted ? (
          <div className="font-mono text-label uppercase tracking-widest text-accent-lime">
            &#9654; SUBSCRIBED &mdash; FIRST DIGEST INCOMING
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="flex-1 text-ink-light">
              <BracketInput
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-accent-lime text-ink-dark font-medium px-6 py-3 rounded-md hover:bg-accent-lime-bright transition-colors whitespace-nowrap"
            >
              Subscribe &#9654;
            </button>
          </form>
        )}

        <p className="mt-6 font-mono text-xs text-ink-light-muted">
          Generated daily by the agent. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
