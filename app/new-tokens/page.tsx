'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NewToken {
  id: string;
  address: string;
  name: string;
  network: string;
  dex: string;
  base_token_contract: string;
  pool_created_at: string;
  age_hours: number;
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
    m15: string;
    m30: string;
    h1: string;
    h6: string;
    h24: string;
  };
  quality_score: number;
}

interface Filters {
  network: string;
  hours: number;
  min_volume: number;
  min_liquidity: number;
  min_buyers: number;
}

type SortField = 'age_hours' | 'volume_usd.h24' | 'quality_score' | 'transactions.h24.buyers' | 'reserve_in_usd' | 'price_change_percentage.h24' | 'fdv_usd';
type SortOrder = 'asc' | 'desc';

export default function NewTokensPage() {
  const [tokens, setTokens] = useState<NewToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    network: 'solana',
    hours: 24,
    min_volume: 0,
    min_liquidity: 0,
    min_buyers: 0
  });
  const [sortField, setSortField] = useState<SortField>('quality_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [analyzingTokens, setAnalyzingTokens] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  interface XAnalysisResult {
    success: boolean;
    analysis?: {
      score: number;
      tier: string;
      token_type: string;
      legitimacy_factor: string;
      reasoning: string;
      best_tweet?: string;
      tweets_found: number;
      search_query: string;
    };
    error?: string;
  }
  const [xAnalysisResults, setXAnalysisResults] = useState<{[key: string]: XAnalysisResult}>({});

  const fetchNewTokens = async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        network: filters.network,
        hours: filters.hours.toString(),
        min_volume: filters.min_volume.toString(),
        min_liquidity: filters.min_liquidity.toString(),
        min_buyers: filters.min_buyers.toString(),
        page: page.toString()
      });
      
      const res = await fetch(`/api/geckoterminal/new-pools?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setTokens(data.data || []);
        setTotalTokens(data.total_fetched || data.data?.length || 0);
        setCurrentPage(page);
      } else {
        setError(data.error || 'Failed to fetch new tokens');
      }
    } catch {
      setError('Failed to fetch data');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchNewTokens(1); // Reset to page 1 when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchNewTokens(currentPage), 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, filters, currentPage]);

  const getSortedTokens = () => {
    const sorted = [...tokens].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortField) {
        case 'age_hours':
          aVal = a.age_hours;
          bVal = b.age_hours;
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

  const analyzeX = async (token: NewToken) => {
    const tokenId = token.base_token_contract;
    setAnalyzingTokens(prev => new Set(prev).add(tokenId));
    
    try {
      const res = await fetch('/api/x-analyze-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: token.base_token_contract,
          symbol: token.name.split(' / ')[0],
          network: token.network
        })
      });
      
      const result = await res.json();
      setXAnalysisResults(prev => ({
        ...prev,
        [tokenId]: result
      }));
    } catch (err) {
      console.error('X analysis failed:', err);
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
          <h1 className="text-4xl font-bold">New Token Discovery</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Main Explorer
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Network</label>
              <select
                value={filters.network}
                onChange={(e) => setFilters({...filters, network: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="solana">Solana</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="polygon_pos">Polygon</option>
                <option value="avalanche">Avalanche</option>
                <option value="bsc">BSC</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Age (hours)</label>
              <select
                value={filters.hours}
                onChange={(e) => setFilters({...filters, hours: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
              >
                <option value="1">Last 1 hour</option>
                <option value="6">Last 6 hours</option>
                <option value="12">Last 12 hours</option>
                <option value="24">Last 24 hours</option>
                <option value="48">Last 48 hours</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Min Volume</label>
              <select
                value={filters.min_volume}
                onChange={(e) => setFilters({...filters, min_volume: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
              >
                <option value="0">No minimum</option>
                <option value="1000">$1K+</option>
                <option value="5000">$5K+</option>
                <option value="10000">$10K+</option>
                <option value="25000">$25K+</option>
                <option value="50000">$50K+</option>
                <option value="100000">$100K+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Min Liquidity</label>
              <select
                value={filters.min_liquidity}
                onChange={(e) => setFilters({...filters, min_liquidity: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
              >
                <option value="0">No minimum</option>
                <option value="5000">$5K+</option>
                <option value="10000">$10K+</option>
                <option value="25000">$25K+</option>
                <option value="50000">$50K+</option>
                <option value="100000">$100K+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Min Buyers</label>
              <select
                value={filters.min_buyers}
                onChange={(e) => setFilters({...filters, min_buyers: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
              >
                <option value="0">No minimum</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
                <option value="10">10+</option>
                <option value="25">25+</option>
                <option value="50">50+</option>
                <option value="100">100+</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Auto-refresh (30s)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && <div className="text-center py-8">Loading new tokens...</div>}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {!loading && tokens.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    Found {tokens.length} new tokens 
                    {totalTokens > tokens.length && (
                      <span className="text-sm font-normal text-gray-600">
                        {' '}(Page {currentPage}, showing filtered results from {totalTokens} total)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: GeckoTerminal has hundreds of new tokens. Adjust filters or browse pages to see more.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    <button
                      onClick={() => fetchNewTokens(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 py-1 text-sm">Page {currentPage}</span>
                    <button
                      onClick={() => fetchNewTokens(currentPage + 1)}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Next →
                    </button>
                  </div>
                  <button
                    onClick={() => fetchNewTokens(currentPage)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Token</th>
                    <th 
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('age_hours')}
                    >
                      Age {sortField === 'age_hours' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                  {getSortedTokens().map((token) => (
                    <tr key={token.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{token.name}</div>
                          <div className="text-xs text-gray-500">
                            {token.dex} • {token.base_token_contract.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <div>{token.age_hours}h</div>
                          <div className="text-xs text-gray-500">
                            {new Date(token.pool_created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getQualityColor(token.quality_score)}`}>
                          {token.quality_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <div>{formatNumber(token.volume_usd.h24)}</div>
                          <div className="text-xs text-gray-500">
                            1h: {formatNumber(token.volume_usd.h1)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <div>{token.transactions.h24.buyers}</div>
                          <div className="text-xs text-gray-500">
                            {token.transactions.h24.buys} buys
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(token.reserve_in_usd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <div>{formatPercentage(token.price_change_percentage.h24)}</div>
                          <div className="text-xs text-gray-500">
                            1h: {formatPercentage(token.price_change_percentage.h1)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(token.fdv_usd)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2 justify-center">
                            <a
                              href={`https://www.geckoterminal.com/${token.network}/pools/${token.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Chart
                            </a>
                            <a
                              href={`https://dexscreener.com/${token.network}/${token.base_token_contract}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:underline text-sm"
                            >
                              DexS
                            </a>
                          </div>
                          {(() => {
                            const tokenId = token.base_token_contract;
                            const xResult = xAnalysisResults[tokenId];
                            const isAnalyzing = analyzingTokens.has(tokenId);
                            
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
                                  <div className="text-gray-600 mt-1">
                                    {xResult.analysis.tweets_found} tweets
                                  </div>
                                </div>
                              );
                            } else if (isAnalyzing) {
                              return (
                                <span className="text-blue-600 text-xs">Analyzing X...</span>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => analyzeX(token)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {!loading && tokens.length === 0 && !error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            No tokens found matching your filters. Try adjusting the criteria.
          </div>
        )}
      </div>
    </main>
  );
}