import Link from 'next/link';

export default function Home() {
  return (
    <main className="w-screen h-screen grid place-items-center">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Chrono Stride AR</h1>
        <div className="flex items-center justify-center gap-4">
          <Link href="/foot" className="bg-black text-white px-4 py-2 rounded">Foot (Any)</Link>
          <Link href="/foot/left" className="bg-black text-white px-4 py-2 rounded">Left Foot</Link>
          <Link href="/foot/right" className="bg-black text-white px-4 py-2 rounded">Right Foot</Link>
          <Link href="/ar" className="bg-black text-white px-4 py-2 rounded">AR Flat Surface</Link>
        </div>
      </div>
    </main>
  );
}
