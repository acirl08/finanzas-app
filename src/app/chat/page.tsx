import ChatAssistant from '@/components/ChatAssistant';

export default function ChatPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Asistente Financiero</h1>
        <p className="text-gray-500">Pregúntame lo que quieras sobre tus finanzas</p>
      </div>
      <div className="max-w-3xl">
        <ChatAssistant />
      </div>
    </div>
  );
}
