import { NextRequest, NextResponse } from 'next/server';
import { CmsService } from '@/modules/cms/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tag = searchParams.get('tag') || undefined;

    const gallery = await CmsService.getGallery({ tag });
    return NextResponse.json({ success: true, count: gallery.length, gallery });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
