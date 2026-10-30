import { NextRequest, NextResponse } from 'next/server';
import { CmsService } from '@/modules/cms/service';
import { formatErrorResponse } from '@/lib/errors';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await CmsService.deleteGalleryItem(id);
    return NextResponse.json({ success: true, message: 'Gallery item removed', id });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

