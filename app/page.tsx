'use client';

import { useState } from 'react';

interface TokenInfo {
  symbol: string;
  contract: string;
  volume_24h: number;
  age_days: string;
  pool_created: string;
  price_usd?: string;
}

interface XAnalysisResult {
  success: boolean;
  analysis?: {
    score: number;
    tier: string;
    reasoning: string;
    best_tweet?: string;
    tweets_found: number;
    search_query: string;
  };
  error?: string;
}

export default function Home() {
  const [geckoTokens, setGeckoTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  interface ProcessResults {
    success: boolean;
    results?: {
      processed: number;
      skipped: number;
      errors: number;
      tokens: Array<{symbol: string; contract: string; volume_24h: number; age_days: string}>;
    };
    message?: string;
  }
  const [processResults, setProcessResults] = useState<ProcessResults | null>(null);
  const [xAnalysisResults, setXAnalysisResults] = useState<{[key: string]: XAnalysisResult}>({});
  const [analyzingToken, setAnalyzingToken] = useState<string>('');

  const fetchAndPreview = async () => {
    setLoading('preview');
    setError('');
    setGeckoTokens([]);
    
    try {
      // First fetch trending pools
      const res = await fetch('/api/geckoterminal/trending?network=solana');
      const result = await res.json();
      
      if (result.success && result.data?.data) {
        // Extract token info for preview
        const tokens: TokenInfo[] = [];
        
        for (const pool of result.data.data) {
          const baseTokenId = pool.relationships.base_token.data.id;
          const contractAddress = baseTokenId.split('_')[1];
          const [tokenSymbol] = pool.attributes.name.split(' / ');
          
          // Skip standard tokens
          if (['SOL', 'USDC', 'USDT', 'ETH', 'BTC'].includes(tokenSymbol)) {
            continue;
          }
          
          const volume24h = parseFloat(pool.attributes.volume_usd.h24);
          if (volume24h < 10000) continue; // Skip low volume
          
          const createdAt = new Date(pool.attributes.pool_created_at);
          const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          
          tokens.push({
            symbol: tokenSymbol,
            contract: contractAddress,
            volume_24h: volume24h,
            age_days: ageInDays.toFixed(1),
            pool_created: createdAt.toLocaleDateString(),
            price_usd: pool.attributes.base_token_price_usd
          });
        }
        
        setGeckoTokens(tokens);
      }
    } catch {
      setError('Failed to fetch trending tokens');
    }
    setLoading('');
  };

  const processTokens = async () => {
    if (geckoTokens.length === 0) {
      setError('No tokens to process. Fetch trending first.');
      return;
    }
    
    setLoading('process');
    setError('');
    
    try {
      const res = await fetch('/api/geckoterminal/process-trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: 'solana' })
      });
      const data = await res.json();
      setProcessResults(data);
    } catch {
      setError('Failed to process tokens');
    }
    setLoading('');
  };

  const analyzeXStandalone = async (token: TokenInfo) => {
    setAnalyzingToken(token.contract);
    setError('');
    
    try {
      const res = await fetch('/api/x-analyze-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: token.contract,
          symbol: token.symbol,
          network: 'solana'
        })
      });
      
      const result = await res.json();
      setXAnalysisResults(prev => ({
        ...prev,
        [token.contract]: result
      }));
    } catch (err) {
      setError(`Failed to analyze ${token.symbol}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    setAnalyzingToken('');
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">KROM API Explorer - Manual Processing</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Fetch and Preview */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-bold mb-4">Step 1: Fetch & Preview Trending Tokens</h2>
          <button
            onClick={fetchAndPreview}
            disabled={loading === 'preview'}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
          >
            {loading === 'preview' ? 'Loading...' : 'Fetch Solana Trending Tokens'}
          </button>
          
          {geckoTokens.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Found {geckoTokens.length} tokens (excluding SOL/USDC/etc):</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2">Symbol</th>
                      <th className="border px-4 py-2">Contract</th>
                      <th className="border px-4 py-2">24h Volume</th>
                      <th className="border px-4 py-2">Age (days)</th>
                      <th className="border px-4 py-2">Created</th>
                      <th className="border px-4 py-2">X Analysis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geckoTokens.map((token, idx) => {
                      const xResult = xAnalysisResults[token.contract];
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border px-4 py-2 font-mono">{token.symbol}</td>
                          <td className="border px-4 py-2 font-mono text-xs">{token.contract.slice(0, 10)}...</td>
                          <td className="border px-4 py-2">${(token.volume_24h / 1000).toFixed(1)}k</td>
                          <td className="border px-4 py-2">{token.age_days}</td>
                          <td className="border px-4 py-2">{token.pool_created}</td>
                          <td className="border px-4 py-2">
                            {xResult ? (
                              xResult.success ? (
                                <div>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                    xResult.analysis!.score >= 7 ? 'bg-green-100 text-green-800' :
                                    xResult.analysis!.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {xResult.analysis!.score}/10 - {xResult.analysis!.tier}
                                  </span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {xResult.analysis!.tweets_found} tweets • {xResult.analysis!.token_type} • {xResult.analysis!.legitimacy_factor}
                                  </div>
                                  <details className="mt-1">
                                    <summary className="text-xs text-blue-600 cursor-pointer">View Details</summary>
                                    <div className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                                      <p><strong>Reasoning:</strong> {xResult.analysis!.reasoning}</p>
                                      {xResult.analysis!.best_tweet && (
                                        <p className="mt-2"><strong>Best Tweet:</strong> {xResult.analysis!.best_tweet}</p>
                                      )}
                                    </div>
                                  </details>
                                </div>
                              ) : (
                                <span className="text-red-600 text-xs">Error: {xResult.error}</span>
                              )
                            ) : analyzingToken === token.contract ? (
                              <span className="text-blue-600 text-xs">Analyzing...</span>
                            ) : (
                              <button
                                onClick={() => analyzeXStandalone(token)}
                                className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                              >
                                Analyze X
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Process */}
        {geckoTokens.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-2xl font-bold mb-4">Step 2: Save to Database</h2>
            <p className="mb-4 text-gray-600">
              This will save new tokens to the crypto_calls table with source=&apos;geckoterminal&apos;.
              Existing tokens will be skipped.
            </p>
            <button
              onClick={processTokens}
              disabled={loading === 'process'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading === 'process' ? 'Processing...' : 'Save New Tokens to Supabase'}
            </button>
            
            {processResults && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="text-sm">{JSON.stringify(processResults, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Instructions */}
        {processResults?.results && processResults.results.processed > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Step 3: Run X Analysis</h2>
            <p className="mb-2">Now that tokens are saved, you can:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Go to your Supabase dashboard</li>
              <li>Run the <code className="bg-gray-100 px-1 rounded">crypto-x-analyzer-nitter</code> edge function</li>
              <li>It will process tokens with source=&apos;geckoterminal&apos; that don&apos;t have X analysis yet</li>
              <li>High-scoring tokens (5+) will trigger Telegram notifications automatically</li>
            </ol>
            
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm">
                <strong>Tip:</strong> You can also trigger the orchestrator function which runs all analysis steps automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}