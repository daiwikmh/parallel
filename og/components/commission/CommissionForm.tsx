"use client";
import { useState } from "react";
import { BracketCard } from "@/components/ui/BracketCard";
import { Button } from "@/components/ui/Button";

export function CommissionForm() {
  const [prompt, setPrompt] = useState("");
  const [price, setPrice] = useState(0.05);
  const [wallet, setWallet] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <BracketCard variant="lime" className="bg-bg-dark-2">
        <div className="font-mono text-label uppercase tracking-widest text-accent-lime mb-4">
          &#9654; COMMISSION QUEUED
        </div>
        <p className="text-ink-light mb-4">
          Your commission is in the queue. The agent will generate and archive your piece within the next cycle.
        </p>
        <div className="font-mono text-sm text-ink-light-muted">
          <span className="opacity-60">TX: </span>
          <span className="text-accent-lime">0x7b4e1a9c2f6d... &#8599;</span>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setPrompt("");
            setWallet("");
            setPrice(0.05);
          }}
          className="mt-6 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted hover:text-accent-lime transition-colors"
        >
          &#9654; Submit another
        </button>
      </BracketCard>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted block mb-3">
          &#9654; WALLET ADDRESS
        </label>
        <BracketCard variant="dark" className="!p-0">
          <input
            type="text"
            placeholder="0x..."
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            required
            className="w-full bg-transparent px-6 py-4 text-sm font-mono placeholder:text-ink-light-muted/40 focus:outline-none"
          />
        </BracketCard>
        <p className="mt-2 font-mono text-xs text-ink-light-muted">
          Or sign in to auto-fill once auth is enabled.
        </p>
      </div>

      <div>
        <label className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted block mb-3">
          &#9654; COMMISSION PROMPT
        </label>
        <BracketCard variant="dark" className="!p-0">
          <textarea
            placeholder="Describe the story or topic you want illustrated. Include any style preferences (seinen, shonen, josei, shojo) or compositional direction."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={5}
            className="w-full bg-transparent px-6 py-4 text-sm placeholder:text-ink-light-muted/40 focus:outline-none resize-none leading-relaxed"
          />
        </BracketCard>
      </div>

      <div>
        <label className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted block mb-3">
          &#9654; PRICE &mdash; {price.toFixed(2)} OG
        </label>
        <input
          type="range"
          min={0.01}
          max={1.0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value))}
          className="w-full accent-accent-lime"
        />
        <div className="flex justify-between font-mono text-xs text-ink-light-muted mt-1">
          <span>0.01 OG (min)</span>
          <span>1.00 OG</span>
        </div>
        <p className="mt-2 font-mono text-xs text-ink-light-muted">
          Higher bids get prioritized in the queue. Min 0.01 OG. All payments go directly to the agent wallet.
        </p>
      </div>

      <BracketCard variant="lime" className="bg-bg-dark-2">
        <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-4">
          &#9654; SUMMARY
        </div>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-ink-light-muted">Commission price</span>
            <span className="text-accent-lime">{price.toFixed(2)} OG</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-light-muted">Estimated delivery</span>
            <span>~2-5 minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-light-muted">On-chain proof</span>
            <span className="text-accent-lime">Included</span>
          </div>
        </div>
      </BracketCard>

      <Button type="submit" variant="lime" size="lg" className="w-full justify-center">
        Submit commission &#9654;
      </Button>
    </form>
  );
}
