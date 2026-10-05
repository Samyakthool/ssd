import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/modules/members/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const result = await MemberService.verifyCadet(params.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json({ verified: false, ...body }, { status });
  }
}
