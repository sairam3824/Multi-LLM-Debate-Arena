"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportMarkdownButtonProps = {
  claim: string;
  markdown: string;
  disabled?: boolean;
};

export function ExportMarkdownButton({ claim, markdown, disabled }: ExportMarkdownButtonProps) {
  return (
    <Button
      variant="outline"
      disabled={disabled || !markdown}
      onClick={() => {
        const fileName = `${claim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "debate"}.md`;
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="h-4 w-4" />
      Export Markdown
    </Button>
  );
}
