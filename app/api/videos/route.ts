import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create Supabase client with the user's token
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

    let query = supabase.from('videos').select('*').order('created_at', { ascending: false });

    if (profile?.role !== 'ADMIN') {
      query = query.eq('status', 'PUBLISHED');
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create Supabase client with the user's token
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

    if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentPlan = subscription?.plan || 'FREE';
    const isProActive = subscription?.plan === 'PRO' && subscription?.status === 'ACTIVE';

    if (!isProActive) {
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);

      const videoLimit = 2;

      if (count !== null && count >= videoLimit) {
        return NextResponse.json(
          {
            error: 'Upload limit reached',
            message: `Free plan allows up to ${videoLimit} videos. Upgrade to Pro for unlimited uploads.`,
            limit: videoLimit,
            current: count
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, url, thumbnail_url, duration, transcript, status, course_id, video_order } = body;

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        url,
        thumbnail_url,
        course_id,
        video_order: video_order || 1,
        duration,
        transcript,
        status: status || 'DRAFT',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ video: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
