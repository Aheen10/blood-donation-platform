import AssistantChat from "@/components/assistant/AssistantChat";

export default function AssistantPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">Blood donation assistant</h1>
      <AssistantChat />
    </main>
  );
}