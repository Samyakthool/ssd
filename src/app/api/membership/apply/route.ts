import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/modules/membership/service';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await MembershipService.submitApplication(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
