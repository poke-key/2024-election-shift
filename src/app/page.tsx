import ElectionShiftAnalysis from '../components/ElectionShiftAnalysis';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Election Results Analysis 2020-2024</h1>
      <ElectionShiftAnalysis />
    </main>
  );
}