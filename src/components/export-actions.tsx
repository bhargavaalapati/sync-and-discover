import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export async function copyText(text: string, message = "Markdown copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Clipboard unavailable. Please allow clipboard access and try again.");
  }
}

export function ExportActions({ markdown, payload, filename }: { markdown: string; payload: unknown; filename: string }) {
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("JSON exported");
  }
  return <>
    <Button variant="outline" className="h-auto whitespace-normal" onClick={() => void copyText(markdown)}><Copy className="h-4 w-4 shrink-0" />Copy Markdown for Notion/Linear</Button>
    <Button variant="outline" onClick={download}><Download className="h-4 w-4" />Export JSON</Button>
  </>;
}