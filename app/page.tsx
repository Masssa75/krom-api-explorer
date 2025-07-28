'use client';

import { useState } from 'react';

export default function Home() {
  const [dexResults, setDexResults] = useState<object | null>(null);
  const [geckoResults, setGeckoResults] = useState<object | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchDexScreenerTrending = async () => {
    setLoading('dexscreener-trending');
    setError('');
    try {
      const res = await fetch('/api/dexscreener/trending');
      const data = await res.json();
      setDexResults(data);
    } catch {
      setError('Failed to fetch DexScreener data');
    }
    setLoading('');
  };

  const fetchGeckoTrending = async (network: string) => {
    setLoading(`gecko-${network}`);
    setError('');
    try {
      const res = await fetch(`/api/geckoterminal/trending?network=${network}`);
      const data = await res.json();
      setGeckoResults(data);
    } catch {
      setError('Failed to fetch GeckoTerminal data');
    }
    setLoading('');
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">KROM API Explorer</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* DexScreener Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">DexScreener API</h2>
            <div className="space-y-2">
              <button
                onClick={fetchDexScreenerTrending}
                disabled={loading === 'dexscreener-trending'}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading === 'dexscreener-trending' ? 'Loading...' : 'Get Trending Tokens'}
              </button>
            </div>
            
            {dexResults && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                  {JSON.stringify(dexResults, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* GeckoTerminal Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">GeckoTerminal API</h2>
            <div className="space-y-2">
              <button
                onClick={() => fetchGeckoTrending('ethereum')}
                disabled={loading === 'gecko-ethereum'}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading === 'gecko-ethereum' ? 'Loading...' : 'Trending ETH Pools'}
              </button>
              <button
                onClick={() => fetchGeckoTrending('solana')}
                disabled={loading === 'gecko-solana'}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading === 'gecko-solana' ? 'Loading...' : 'Trending SOL Pools'}
              </button>
            </div>
            
            {geckoResults && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                  {JSON.stringify(geckoResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Test Results Section */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">API Test Results</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                const res = await fetch('/api/test/dexscreener');
                const data = await res.json();
                setDexResults(data);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Test All DexScreener Endpoints
            </button>
            <button
              onClick={async () => {
                const res = await fetch('/api/test/geckoterminal');
                const data = await res.json();
                setGeckoResults(data);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Test All GeckoTerminal Endpoints
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}