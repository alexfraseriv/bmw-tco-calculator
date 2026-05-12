import { useState } from "react";

export function ShareBar() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (typeof navigator === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "BMW 430i vs EV — 3-Year TCO",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // user cancelled or clipboard unavailable — silent
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-line bg-panel2 px-3 py-1.5 text-xs text-muted hover:border-muted hover:text-fg"
    >
      {copied ? "Link copied" : "Share this view"}
    </button>
  );
}
