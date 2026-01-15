import GastoForm from '@/components/GastoForm';

export default function RegistrarPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Gasto</h1>
        <p className="text-gray-500">Lleva el control de cada peso que gastas</p>
      </div>
      <div className="max-w-2xl">
        <GastoForm />
      </div>
    </div>
  );
}
