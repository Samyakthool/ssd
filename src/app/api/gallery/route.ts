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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }

    const item = await CmsService.createGalleryItem(body);
    return NextResponse.json({ success: true, message: 'Gallery item saved successfully', gallery: item });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
