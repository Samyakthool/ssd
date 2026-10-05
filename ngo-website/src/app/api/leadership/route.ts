import { NextRequest, NextResponse } from 'next/server';
import { CmsService } from '@/modules/cms/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const leadership = await CmsService.getLeadership();
    return NextResponse.json({ success: true, count: leadership.length, leadership });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
