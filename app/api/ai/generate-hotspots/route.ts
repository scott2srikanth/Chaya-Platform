import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateHotspotSuggestions } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, transcript } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const suggestions = await generateHotspotSuggestions(transcript);

    const hotspots = suggestions.map((suggestion) => ({
      start_time: suggestion.startTime,
      end_time: suggestion.endTime,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.2,
      action: {
        type: 'popup' as const,
        title: suggestion.title,
        content: suggestion.popupContent,
      },
    }));

    return NextResponse.json({ hotspots }, { status: 200 });
  } catch (error: any) {
    console.error('AI hotspot generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate hotspots' },
      { status: 500 }
    );
  }
}
