import { NextResponse } from 'next/server';

interface XAnalysisRequest {
  contract_address: string;
  symbol: string;
  network?: string;
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

export async function POST(request: Request): Promise<Response> {
  try {
    const { contract_address, symbol, network = 'solana' }: XAnalysisRequest = await request.json();

    if (!contract_address || !symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: contract_address and symbol' 
      }, { status: 400 });
    }

    // Step 1: Search for tweets about the token
    const searchQuery = contract_address;
    const nitterUrl = `https://nitter.net/search?q=${encodeURIComponent(searchQuery)}&f=tweets`;
    
    console.log(`Searching for tweets about ${symbol} (${contract_address})`);
    
    // Use ScraperAPI to fetch Nitter page (same as your edge function)
    const scraperResponse = await fetch(`http://api.scraperapi.com/?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(nitterUrl)}`);
    
    if (!scraperResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `ScraperAPI failed: ${scraperResponse.status}`
      }, { status: 500 });
    }

    const html = await scraperResponse.text();
    
    // Step 2: Parse tweets from HTML (simplified version)
    const tweets = parseTweetsFromNitter(html);
    
    if (tweets.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          score: 1,
          tier: 'TRASH',
          reasoning: 'No tweets found about this token on X/Twitter. This indicates very low social presence and community engagement.',
          tweets_found: 0,
          search_query: searchQuery
        }
      });
    }

    // Step 3: Analyze tweets with Claude (using your existing prompt style)
    const analysisPrompt = createXAnalysisPrompt(symbol, contract_address, tweets);
    
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Claude API failed: ${claudeResponse.status}`
      }, { status: 500 });
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content[0].text;

    // Step 4: Parse Claude's response
    const analysis = parseClaudeAnalysis(analysisText, tweets);

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        tweets_found: tweets.length,
        search_query: searchQuery
      }
    });

  } catch (error) {
    console.error('X Analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions (simplified versions of your edge function logic)
function parseTweetsFromNitter(html: string): string[] {
  const tweets: string[] = [];
  
  // Simple regex to extract tweet content (this could be improved)
  const tweetRegex = /<div class="tweet-content[^>]*>(.*?)<\/div>/g;
  let match;
  
  while ((match = tweetRegex.exec(html)) !== null && tweets.length < 10) {
    const tweetContent = match[1]
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]*;/g, ' ') // Remove HTML entities
      .trim();
    
    if (tweetContent.length > 20) { // Filter out very short content
      tweets.push(tweetContent);
    }
  }
  
  return tweets;
}

function createXAnalysisPrompt(symbol: string, contractAddress: string, tweets: string[]): string {
  return `Analyze the social media presence for cryptocurrency token ${symbol} (contract: ${contractAddress}) based on these X/Twitter posts:

${tweets.slice(0, 5).map((tweet, i) => `Tweet ${i + 1}: ${tweet}`).join('\n\n')}

Rate this token's X/Twitter presence on a scale of 1-10 based on:
- Community engagement and discussion quality
- Legitimacy indicators vs spam/bot activity  
- Development updates and project communication
- Organic growth vs artificial hype

Respond in this exact format:
SCORE: [1-10]
TIER: [ALPHA/SOLID/BASIC/TRASH]
REASONING: [2-3 sentences explaining the score]
BEST_TWEET: [The most informative/legitimate tweet, or "None" if all are poor quality]`;
}

function parseClaudeAnalysis(analysisText: string, tweets: string[]): {
  score: number;
  tier: string;
  reasoning: string;
  best_tweet?: string;
} {
  try {
    // Extract score
    const scoreMatch = analysisText.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 1;

    // Extract tier  
    const tierMatch = analysisText.match(/TIER:\s*(ALPHA|SOLID|BASIC|TRASH)/i);
    const tier = tierMatch ? tierMatch[1].toUpperCase() : 'TRASH';

    // Extract reasoning
    const reasoningMatch = analysisText.match(/REASONING:\s*(.*?)(?=\nBEST_TWEET:|$)/);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Analysis could not be parsed properly.';

    // Extract best tweet
    const bestTweetMatch = analysisText.match(/BEST_TWEET:\s*(.*?)$/);
    const bestTweet = bestTweetMatch && bestTweetMatch[1].trim() !== 'None' 
      ? bestTweetMatch[1].trim() 
      : undefined;

    return {
      score: Math.max(1, Math.min(10, score)), // Ensure score is 1-10
      tier,
      reasoning,
      best_tweet: bestTweet
    };
  } catch (error) {
    return {
      score: 1,
      tier: 'TRASH',
      reasoning: 'Failed to parse analysis results properly.'
    };
  }
}