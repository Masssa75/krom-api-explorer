'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LatestPool {
  id: string;
  address: string;
  name: string;
  network: string;
  dex: string;
  base_token_contract: string;
  pool_created_at: string;
  age_seconds: number;
  base_token_price_usd: number;
  fdv_usd: number;
  market_cap_usd: number | null;
  volume_usd: {
    h1: number;
    h6: number;
    h24: number;
  };
  transactions: {
    h1: { buys: number; sells: number; buyers: number; sellers: number };
    h6: { buys: number; sells: number; buyers: number; sellers: number };
    h24: { buys: number; sells: number; buyers: number; sellers: number };
  };
  reserve_in_usd: number;
  price_change_percentage: {
    m5: string;
    h1: string;
    h24: string;
  };
  quality_score: number;
}

type SortField = 'age_seconds' | 'volume_usd.h24' | 'quality_score' | 'transactions.h24.buyers' | 'reserve_in_usd' | 'price_change_percentage.h24' | 'fdv_usd';
type SortOrder = 'asc' | 'desc';

export default function LatestPoolsPage() {
  const [pools, setPools] = useState<LatestPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('age_seconds');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [analyzingTokens, setAnalyzingTokens] = useState<Set<string>>(new Set());
  const [xAnalysisResults, setXAnalysisResults] = useState<{[key: string]: any}>({});

  const fetchAllPools = async () => {
    setLoading(true);
    setError('');
    
    try {
      const allPools: LatestPool[] = [];
      
      // Fetch all 10 pages (200 pools)
      for (let page = 1; page <= 10; page++) {
        const params = new URLSearchParams({
          network: 'solana',
          hours: '24', // We'll show all pools regardless of age
          min_volume: '0',
          min_liquidity: '0',
          min_buyers: '0',
          page: page.toString()
        });
        
        const res = await fetch(`/api/geckoterminal/new-pools?${params}`);
        const data = await res.json();
        
        if (data.success && data.data) {
          allPools.push(...data.data);
        } else if (!data.success) {
          setError(data.error || 'Failed to fetch pools');
          break;
        }
      }
      
      // Calculate age in seconds for each pool
      const now = new Date();
      const enrichedPools = allPools.map(pool => ({
        ...pool,
        age_seconds: Math.floor((now.getTime() - new Date(pool.pool_created_at).getTime()) / 1000)
      }));
      
      setPools(enrichedPools);
      setLastRefresh(now);
    } catch (err) {
      console.error('fetchAllPools error:', err);
      setError('Failed to fetch data');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAllPools();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchAllPools(), 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSortedPools = () => {
    const sorted = [...pools].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortField) {
        case 'age_seconds':
          aVal = a.age_seconds;
          bVal = b.age_seconds;
          break;
        case 'volume_usd.h24':
          aVal = a.volume_usd.h24;
          bVal = b.volume_usd.h24;
          break;
        case 'quality_score':
          aVal = a.quality_score;
          bVal = b.quality_score;
          break;
        case 'transactions.h24.buyers':
          aVal = a.transactions.h24.buyers;
          bVal = b.transactions.h24.buyers;
          break;
        case 'reserve_in_usd':
          aVal = a.reserve_in_usd;
          bVal = b.reserve_in_usd;
          break;
        case 'price_change_percentage.h24':
          aVal = parseFloat(a.price_change_percentage.h24) || 0;
          bVal = parseFloat(b.price_change_percentage.h24) || 0;
          break;
        case 'fdv_usd':
          aVal = a.fdv_usd;
          bVal = b.fdv_usd;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatPercentage = (val: string) => {
    const num = parseFloat(val) || 0;
    const color = num > 0 ? 'text-green-600' : num < 0 ? 'text-red-600' : 'text-gray-600';
    return <span className={color}>{num > 0 ? '+' : ''}{num.toFixed(2)}%</span>;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    if (score >= 30) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const analyzeX = async (pool: LatestPool) => {
    const tokenId = pool.base_token_contract;
    setAnalyzingTokens(prev => new Set(prev).add(tokenId));
    
    try {
      const res = await fetch('/api/x-analyze-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: pool.base_token_contract,
          symbol: pool.name.split(' / ')[0],
          network: pool.network
        })
      });
      
      const result = await res.json();
      setXAnalysisResults(prev => ({
        ...prev,
        [tokenId]: result
      }));
    } catch (err) {
      console.error('X analysis failed:', err);
      setXAnalysisResults(prev => ({
        ...prev,
        [tokenId]: {
          success: false,
          error: err instanceof Error ? err.message : 'Analysis failed'
        }
      }));
    }
    
    setAnalyzingTokens(prev => {
      const newSet = new Set(prev);
      newSet.delete(tokenId);
      return newSet;
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Latest 200 Pools</h1>
            <p className="text-gray-600 mt-2">Real-time view of the most recent token launches on Solana</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Main Explorer
          </Link>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Auto-refresh (30s)</span>
              </label>
              {lastRefresh && (
                <span className="text-sm text-gray-500">
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={fetchAllPools}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {!loading && pools.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">
                Showing all {pools.length} pools from the last ~{formatAge(Math.max(...pools.map(p => p.age_seconds)))}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Token</th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('age_seconds')}
                    >
                      Age {sortField === 'age_seconds' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('quality_score')}
                    >
                      Quality {sortField === 'quality_score' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('volume_usd.h24')}
                    >
                      24h Volume {sortField === 'volume_usd.h24' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('transactions.h24.buyers')}
                    >
                      Buyers {sortField === 'transactions.h24.buyers' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('reserve_in_usd')}
                    >
                      Liquidity {sortField === 'reserve_in_usd' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('price_change_percentage.h24')}
                    >
                      24h Change {sortField === 'price_change_percentage.h24' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('fdv_usd')}
                    >
                      FDV {sortField === 'fdv_usd' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedPools().map((pool) => {
                    const tokenId = pool.base_token_contract;
                    const xResult = xAnalysisResults[tokenId];
                    const isAnalyzing = analyzingTokens.has(tokenId);
                    
                    return (
                      <tr key={pool.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{pool.name}</div>
                            <div className="text-xs text-gray-500">
                              {pool.dex} • {pool.base_token_contract.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={pool.age_seconds < 120 ? 'text-green-600 font-semibold' : ''}>
                            {formatAge(pool.age_seconds)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(pool.pool_created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getQualityColor(pool.quality_score)}`}>
                            {pool.quality_score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(pool.volume_usd.h24)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <div>{pool.transactions.h24.buyers}</div>
                            <div className="text-xs text-gray-500">
                              {pool.transactions.h24.buys} buys
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(pool.reserve_in_usd)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPercentage(pool.price_change_percentage.h24)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(pool.fdv_usd)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2 justify-center">
                              <a
                                href={`https://www.geckoterminal.com/${pool.network}/pools/${pool.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Chart
                              </a>
                              <a
                                href={`https://dexscreener.com/${pool.network}/${pool.base_token_contract}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:underline text-sm"
                              >
                                DexS
                              </a>
                            </div>
                            {(() => {
                              if (xResult?.success && xResult.analysis) {
                                return (
                                  <div className="text-xs">
                                    <span className={`inline-block px-2 py-1 rounded font-bold ${
                                      xResult.analysis.score >= 7 ? 'bg-green-100 text-green-800' :
                                      xResult.analysis.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      X: {xResult.analysis.score}/10
                                    </span>
                                  </div>
                                );
                              } else if (xResult && !xResult.success) {
                                return (
                                  <div className="text-xs">
                                    <span className="text-red-600">Failed</span>
                                    <button
                                      onClick={() => analyzeX(pool)}
                                      className="block mt-1 text-blue-600 hover:underline"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                );
                              } else if (isAnalyzing) {
                                return (
                                  <span className="text-blue-600 text-xs">Analyzing...</span>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => analyzeX(pool)}
                                    className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                                  >
                                    Analyze X
                                  </button>
                                );
                              }
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {loading && <div className="text-center py-8">Loading all 200 pools...</div>}
      </div>
    </main>
  );
}