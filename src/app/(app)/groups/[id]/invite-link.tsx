"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, inputClass } from "@/components/ui";

const noopSubscribe = () => () => {};

export function InviteLink({ path }: { path: string }) {
  // window.location is only available in the browser; the server renders the bare path.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  return (
    <div className="flex gap-2">
      <input readOnly value={url} aria-label="ลิงก์ชวนเข้ากลุ่ม" className={`${inputClass} py-1.5 text-sm`} />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: the user can still select the text */
          }
        }}
      >
        {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
      </Button>
    </div>
  );
}
