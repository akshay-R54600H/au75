"use client";

import { useState } from "react";
import { Smartphone, Share, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useInstall } from "./useInstall";

export default function InstallButton({ size = "md", variant = "secondary" }: { size?: "sm" | "md" | "lg"; variant?: "primary" | "secondary" }) {
  const state = useInstall();
  const [showIos, setShowIos] = useState(false);

  if (state.kind === "installed") {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
        <CheckCircle2 size={16} /> Installed on this device
      </span>
    );
  }

  if (state.kind === "prompt") {
    return (
      <Button size={size} variant={variant} onClick={state.install}>
        <Smartphone size={16} /> Install app
      </Button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <Button size={size} variant={variant} onClick={() => setShowIos((v) => !v)}>
        <Smartphone size={16} /> Install app
      </Button>
      {showIos && (
        <p className="max-w-xs text-left text-xs text-muted">
          {state.kind === "ios" ? (
            <>Tap <Share size={12} className="inline" /> <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.</>
          ) : (
            <>Open this site in <strong>Chrome on Android</strong> (or Safari on iPhone) and choose <strong>Add to Home Screen</strong> from the browser menu.</>
          )}
        </p>
      )}
    </div>
  );
}
