import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Tu progreso hacia la libertad financiera</p>
      </div>
      <Dashboard />
    </div>
  );
}
