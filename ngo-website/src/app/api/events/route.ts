import { NextRequest, NextResponse } from 'next/server';
import { CmsService } from '@/modules/cms/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const wing = searchParams.get('wing') || undefined;
    const all = searchParams.get('all') === 'true';

    const events = await CmsService.getEvents({ status, wing, all });
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
