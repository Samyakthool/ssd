import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/service';
import { loginSchema } from '@/validation/auth.schema';
import { formatErrorResponse, generateRequestId } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const rawBody = await req.json();
    const parseResult = loginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Invalid input fields',
            requestId,
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { email, password, totpToken } = parseResult.data;
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const result = await AuthService.login(email, password, totpToken, {
      ip,
      userAgent,
      requestId,
    });

    if (result.requiresMfa) {
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        message: 'Two-Factor Authentication required. Please provide 6-digit TOTP token.',
        requestId,
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        jurisdiction: result.jurisdiction,
      },
      requestId,
    });

    // Set secure HttpOnly session cookie
    if (result.token) {
      response.cookies.set({
        name: 'ssd_session',
        value: result.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return response;
  } catch (err: unknown) {
    const { statusCode, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status: statusCode });
  }
}
