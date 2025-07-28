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
    token_type: string;
    legitimacy_factor: string;
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
          token_type: 'meme',
          legitimacy_factor: 'Low',
          reasoning: 'No tweets found about this token on X/Twitter. This indicates very low social presence and community engagement.',
          tweets_found: 0,
          search_query: searchQuery
        }
      });
    }

    // Step 3: Analyze tweets with Kimi K2 (exact copy of working main app)
    const analysisPrompt = createXAnalysisPrompt(symbol, contract_address, tweets);
    
    // Prepare tweet content exactly like main app
    const tweetTexts = tweets
      .map((tweet, i) => `Tweet ${i + 1}: ${tweet}`)
      .join('\n');
    
    console.log('Using Kimi K2 via OpenRouter - exact implementation as main app');
    
    // Use EXACT same implementation as working app
    const model = 'moonshotai/kimi-k2';
    const maxTokens = 1000;
    
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: analysisPrompt
          },
          {
            role: 'user',
            content: `Analyze these tweets about ${symbol} token (captured at unknown time):\n\n${tweetTexts}`
          }
        ],
        temperature: 0,
        max_tokens: maxTokens
      })
    });

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text();
      console.error('OpenRouter API Error:', openRouterResponse.status, errorBody);
      return NextResponse.json({
        success: false,
        error: `Kimi K2 API failed: ${openRouterResponse.status} - ${errorBody}`
      }, { status: 500 });
    }

    const openRouterResult = await openRouterResponse.json();
    const analysisText = openRouterResult.choices[0].message.content;

    // Step 4: Parse Kimi K2's response
    const analysis = parseKimiAnalysis(analysisText, tweets);

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

// Helper functions (same logic as working edge functions)
function parseTweetsFromNitter(html: string): string[] {
  const tweets: string[] = [];
  
  // Use the same robust pattern as working edge functions
  const tweetMatches = html.matchAll(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);

  for (const match of tweetMatches) {
    const content = match[1]
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (content && content.length > 20) {
      tweets.push(content);
    }
    
    if (tweets.length >= 10) break; // Get up to 10 tweets
  }

  console.log(`Found ${tweets.length} tweets for analysis`);
  
  return tweets;
}

function createXAnalysisPrompt(symbol: string, contractAddress: string, tweets: string[]): string {
  const prompt = `You are an expert crypto analyst evaluating Twitter/X social media data about cryptocurrency tokens.

IMPORTANT: You are analyzing historical tweets that were captured at the time of the original call. These tweets provide social context about the token.

Analyze the provided tweets and score the token's social media presence from 1-10 based on:

SCORING CRITERIA:
- Community engagement quality and authenticity
- Team/developer transparency and activity  
- Legitimate partnerships or endorsements
- Technical discussions and development updates
- Warning signs (bot activity, pump rhetoric, fake hype)
- Overall community sentiment and growth potential

SCORE GUIDE:
1-3: TRASH - Obvious scam, heavy bot activity, pump and dump rhetoric, no real community
4-5: BASIC - Limited genuine activity, some red flags, unclear value proposition
6-7: SOLID - Good community engagement, active development, some positive signals
8-10: ALPHA - Exceptional community, verified partnerships, strong development activity

For each token, provide:
1. Score (1-10)
2. Token Type: "meme" or "utility" based on social media presence
3. Legitimacy Factor: "Low", "Medium", or "High"
4. Best Tweet: The single most informative/relevant tweet (copy exact text)
5. Key Observations: 2-3 bullet points about what you found (max 20 words each)
6. Reasoning: Brief explanation of your score (2-3 sentences)

TOKEN TYPE CLASSIFICATION:
- Meme: Community-driven, humor/viral focus, price speculation, moon/rocket talk, animal themes
- Utility: Technical discussions, real use cases, development updates, partnerships, solving problems
- Hybrid: Shows both meme culture AND actual utility/development

Remember: Focus on the quality of engagement and legitimate development activity, not just volume of tweets.`;

  const tweetTexts = tweets
    .filter(tweet => tweet && tweet.length > 20)
    .slice(0, 5)
    .map((tweet, i) => `Tweet ${i + 1}: ${tweet}`)
    .join('\n');

  return `${prompt}\n\nAnalyze these tweets about ${symbol} token (contract: ${contractAddress}):\n\n${tweetTexts}`;
}

function parseKimiAnalysis(analysisText: string, tweets: string[]): {
  score: number;
  tier: string;
  token_type: string;
  legitimacy_factor: string;
  reasoning: string;
  best_tweet?: string;
} {
  try {
    // Extract score
    const scoreMatch = analysisText.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 1;

    // Extract token type
    const tokenTypeMatch = analysisText.match(/token\s*type[:\s]+(meme|utility)/i);
    const tokenType = tokenTypeMatch ? tokenTypeMatch[1].toLowerCase() : 'meme';

    // Extract legitimacy factor
    const legitimacyMatch = analysisText.match(/legitimacy\s*factor[:\s]+(low|medium|high)/i);
    const legitimacyFactor = legitimacyMatch ? legitimacyMatch[1].charAt(0).toUpperCase() + legitimacyMatch[1].slice(1) : 'Low';

    // Extract best tweet
    const bestTweetMatch = analysisText.match(/best\s*tweet[:\s]*(.+?)(?=\n|key\s*observations|$)/i);
    const bestTweet = bestTweetMatch ? bestTweetMatch[1].trim() : null;

    // Extract reasoning
    const reasoningMatch = analysisText.match(/reasoning[:\s]*(.+?)$/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : analysisText;

    // Determine tier based on score
    let tier = 'TRASH';
    if (score >= 8) tier = 'ALPHA';
    else if (score >= 6) tier = 'SOLID';
    else if (score >= 4) tier = 'BASIC';

    return {
      score: Math.max(1, Math.min(10, score)), // Ensure score is 1-10
      tier,
      token_type: tokenType,
      legitimacy_factor: legitimacyFactor,
      reasoning,
      best_tweet: bestTweet && bestTweet !== 'None' ? bestTweet : undefined
    };
  } catch (error) {
    return {
      score: 1,
      tier: 'TRASH',
      token_type: 'meme',
      legitimacy_factor: 'Low',
      reasoning: 'Failed to parse analysis results properly.'
    };
  }
}