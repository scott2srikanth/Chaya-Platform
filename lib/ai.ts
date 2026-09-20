export interface AIHotspotSuggestion {
  startTime: number;
  endTime: number;
  title: string;
  popupContent: string;
}

const SYSTEM_PROMPT = `You are an instructional design expert.
Your task is to analyze a video transcript and identify important learning moments suitable for interactive hotspots.

Focus on:
* Concept introductions
* Definitions
* Architecture explanations
* Visual references
* Step-by-step processes

Avoid:
* Greetings
* Repetitions
* Off-topic discussion
* Long explanations`;

const USER_PROMPT_TEMPLATE = (transcript: string) => `Given the following video transcript, generate interactive hotspot suggestions for an educational video platform.

Transcript:
"""
${transcript}
"""

Rules:
* Return 5-10 hotspots max
* Each hotspot must have:
  * startTime (seconds)
  * endTime (seconds)
  * title (short, max 5 words)
  * popupContent (max 40 words, beginner-friendly)
* Content must be beginner-friendly
* Do not hallucinate timestamps outside transcript context

Return ONLY valid JSON array with no additional text or markdown formatting.`;

export async function generateHotspotSuggestions(
  transcript: string
): Promise<AIHotspotSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT_TEMPLATE(transcript) },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const parsed = JSON.parse(content);
    const hotspots = parsed.hotspots || parsed;

    if (!Array.isArray(hotspots)) {
      throw new Error('Invalid response format from AI');
    }

    return hotspots.map((h: any) => ({
      startTime: h.startTime || h.start_time || 0,
      endTime: h.endTime || h.end_time || 0,
      title: h.title || 'Hotspot',
      popupContent: h.popupContent || h.popup_content || h.content || '',
    }));
  } catch (error: any) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate hotspots: ${error.message}`);
  }
}
