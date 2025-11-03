import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Red flag symptoms that require emergency attention
const RED_FLAG_SYMPTOMS = [
  'chest pain',
  'severe bleeding',
  'shortness of breath',
  'difficulty breathing',
  'severe headache',
  'confusion',
  'loss of consciousness',
  'seizure',
  'stroke symptoms',
  'heart attack',
  'severe abdominal pain',
  'suicidal thoughts',
  'severe allergic reaction',
  'anaphylaxis',
];

const detectRedFlags = (message: string): string[] => {
  const lowerMessage = message.toLowerCase();
  return RED_FLAG_SYMPTOMS.filter(symptom => 
    lowerMessage.includes(symptom)
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, conversationHistory } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Check for red flags
    const emergencySymptoms = detectRedFlags(message);
    const hasRedFlag = emergencySymptoms.length > 0;

    // If emergency symptoms detected, return immediately
    if (hasRedFlag) {
      return new Response(
        JSON.stringify({
          response: `⚠️ EMERGENCY: I've detected symptoms that require immediate medical attention. Please call 911 or go to the nearest emergency room right away. Do not wait.\n\nDetected emergency symptoms:\n${emergencySymptoms.map(s => `• ${s}`).join('\n')}\n\nThis is a medical emergency and you should seek help immediately.`,
          redFlag: true,
          emergencySymptoms,
          triageLevel: 'emergency',
          confidence: 1.0,
          modelVersion: 'rule-based-triage',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are a clinical assistant AI providing preliminary medical guidance. Your role is to:

1. Gather relevant symptom information through follow-up questions
2. Provide probable conditions with confidence estimates (0-1 scale)
3. Recommend appropriate urgency levels: self-care, see-gp, urgent-care, or emergency
4. NEVER provide definitive diagnoses - always present as possibilities
5. ALWAYS recommend seeing a clinician when confidence < 0.85 or symptoms are concerning
6. Be empathetic and clear
7. Ask clarifying questions about: duration, severity, associated symptoms, medical history

For each response, structure your assessment as:
- Understanding of symptoms
- Follow-up questions (if needed)
- Possible conditions (with confidence estimates)
- Recommended next steps
- When to seek immediate care

Remember: You are an informational tool only, NOT a replacement for professional medical care.`,
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI service quota exceeded. Please contact support.');
      }
      
      throw new Error('AI service error');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Determine triage level based on keywords
    let triageLevel = 'low';
    const lowerResponse = aiResponse.toLowerCase();
    if (lowerResponse.includes('emergency') || lowerResponse.includes('immediately')) {
      triageLevel = 'emergency';
    } else if (lowerResponse.includes('urgent') || lowerResponse.includes('soon')) {
      triageLevel = 'high';
    } else if (lowerResponse.includes('doctor') || lowerResponse.includes('clinician')) {
      triageLevel = 'medium';
    }

    // Estimate confidence (simplified - in production would be more sophisticated)
    const hasUncertainty = lowerResponse.includes('may') || 
                          lowerResponse.includes('might') || 
                          lowerResponse.includes('possibly') ||
                          lowerResponse.includes('could');
    const confidence = hasUncertainty ? 0.6 : 0.75;

    return new Response(
      JSON.stringify({
        response: aiResponse,
        redFlag: false,
        triageLevel,
        confidence,
        modelVersion: 'google/gemini-2.5-flash',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in medical-diagnosis function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});