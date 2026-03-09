import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Use clawdbot's AI to analyze and fill in SaaS idea validation fields
export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json();

    if (!idea || !idea.title) {
      return NextResponse.json({ error: "Idea required" }, { status: 400 });
    }

    // Call clawdbot gateway for AI analysis
    const prompt = `Analyze this SaaS opportunity and provide validation data:

Title: ${idea.title}
Description: ${idea.description || "N/A"}
Category: ${idea.category}
Source: r/${idea.subreddit}
Pain Score: ${idea.pain_score}

Provide a JSON response with these fields (be specific and realistic):
{
  "demand_volume": "Estimate market demand (e.g., 'High - 50K+ monthly searches', 'Medium - 5-10K searches', 'Niche - <1K searches')",
  "expected_price": "Realistic SaaS pricing tier (e.g., '$29/mo starter, $99/mo pro')",
  "expected_revenue": "Potential MRR with realistic customer assumptions (e.g., '$5K-15K MRR with 100-500 customers')",
  "key_insight": "The core opportunity or pain point this addresses (2-3 sentences)",
  "competitors": "List 3-5 existing competitors with their weaknesses",
  "differentiator": "What unique angle or approach could win this market"
}

Return ONLY valid JSON, no markdown or explanation.`;

    // Try to call clawdbot gateway
    const gatewayUrl = process.env.CLAWDBOT_GATEWAY_URL || "http://localhost:18789";

    try {
      const response = await fetch(`${gatewayUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CLAWDBOT_API_KEY || ""}`,
        },
        body: JSON.stringify({
          message: prompt,
          model: "claude-3-5-sonnet-20241022",
          stream: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.content || result.message || result.text || "";

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, analysis });
        }
      }
    } catch (gatewayError) {
      console.log("Gateway not available, using fallback analysis");
    }

    // Fallback: Generate basic analysis based on category and pain score
    const fallbackAnalysis = generateFallbackAnalysis(idea);
    return NextResponse.json({ success: true, analysis: fallbackAnalysis });

  } catch (error) {
    console.error("Error analyzing idea:", error);
    return NextResponse.json(
      { error: "Failed to analyze idea", details: String(error) },
      { status: 500 }
    );
  }
}

function generateFallbackAnalysis(idea: any) {
  const categoryInsights: Record<string, any> = {
    automation: {
      demand_volume: "High - Automation tools see 100K+ monthly searches",
      expected_price: "$49/mo starter, $149/mo team, $499/mo enterprise",
      expected_revenue: "$10K-50K MRR potential with SMB focus",
      competitors: "Zapier (expensive), Make (complex), n8n (technical). Weakness: Most are too complex for non-technical users",
      differentiator: "Focus on specific workflow with dead-simple UX, no-code interface",
    },
    crm_sales: {
      demand_volume: "Very High - CRM market is $50B+, constant demand",
      expected_price: "$29/mo per user, $99/mo team plan",
      expected_revenue: "$20K-100K MRR - sales teams pay well for good tools",
      competitors: "HubSpot (bloated), Salesforce (expensive/complex), Pipedrive (limited). Weakness: Over-featured for small teams",
      differentiator: "Hyper-focused on one sales motion, AI-powered insights, simple pricing",
    },
    content: {
      demand_volume: "High - Content marketing is growing 15% YoY",
      expected_price: "$19/mo creator, $79/mo agency, $199/mo enterprise",
      expected_revenue: "$5K-30K MRR - content creators have budget",
      competitors: "Jasper (expensive), Copy.ai (generic), Writesonic (quality issues). Weakness: Generic outputs",
      differentiator: "Niche-specific training, brand voice learning, SEO optimization built-in",
    },
    data_management: {
      demand_volume: "Medium-High - Data tools see steady enterprise demand",
      expected_price: "$99/mo startup, $299/mo business, custom enterprise",
      expected_revenue: "$15K-80K MRR - enterprises pay for data solutions",
      competitors: "Airtable (expensive at scale), Notion (not a database), Excel (manual). Weakness: Scaling costs",
      differentiator: "Specific industry focus, better integrations, flat pricing",
    },
    billing_payments: {
      demand_volume: "High - Every SaaS needs billing",
      expected_price: "2-3% transaction fee + $49/mo platform fee",
      expected_revenue: "$10K-100K MRR - transaction fees scale well",
      competitors: "Stripe Billing (complex), Chargebee (expensive), Paddle (limited). Weakness: Complex setup",
      differentiator: "One-click setup, built-in dunning, usage-based billing made simple",
    },
    project_management: {
      demand_volume: "Very High - PM tools market is saturated but huge",
      expected_price: "$12/mo per user, $49/mo team",
      expected_revenue: "$10K-50K MRR - competitive market",
      competitors: "Asana, Monday, ClickUp, Linear. Weakness: Feature bloat, slow, expensive per-seat",
      differentiator: "Opinionated workflow, specific team type focus, AI task management",
    },
  };

  const painMultiplier = idea.pain_score >= 8 ? "High" : idea.pain_score >= 5 ? "Medium" : "Lower";
  const base = categoryInsights[idea.category] || {
    demand_volume: `${painMultiplier} demand based on pain indicators`,
    expected_price: "$29-99/mo typical SaaS pricing",
    expected_revenue: "$5K-20K MRR potential",
    competitors: "Research needed - check G2, Capterra for existing solutions",
    differentiator: "Focus on specific pain point, better UX, AI-powered features",
  };

  return {
    ...base,
    key_insight: `Pain score ${idea.pain_score}/10 from r/${idea.subreddit}. ${idea.description?.slice(0, 200) || idea.title}. This indicates ${painMultiplier.toLowerCase()} market validation - users are actively seeking solutions.`,
  };
}
