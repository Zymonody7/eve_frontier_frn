import { useEffect, useState } from "react";
import { copyTextToClipboard } from "../features/requests/requestUtils";

type CopyButtonProps = {
  value: string;
  className?: string;
  idleLabel?: string;
};

export function CopyButton({
  value,
  className = "button ghost",
  idleLabel = "Copy"
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setStatus("idle"), 1600);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleCopy() {
    try {
      await copyTextToClipboard(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button className={className} onClick={handleCopy} type="button">
      {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : idleLabel}
    </button>
  );
}
