import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/modules/members/service';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, credential } = body;
    const result = await MemberService.cadetLogin(identifier, credential);

    const response = NextResponse.json({
      success: true,
      message: 'Cadet authenticated successfully',
      data: result,
    });

    response.cookies.set({
      name: 'ssd_cadet_session',
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
