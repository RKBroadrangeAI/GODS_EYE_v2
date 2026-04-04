import { AIAssistant } from "@/components/ai-assistant";

export const metadata = { title: "God's Eye AI Assistant" };

export default function AIAssistantPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">God&apos;s Eye AI Assistant</h1>
      <div className="h-[calc(100vh-220px)]">
        <AIAssistant />
      </div>
    </div>
  );
}
