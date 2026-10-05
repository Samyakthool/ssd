import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/service';
import { mfaSetupSchema } from '@/validation/auth.schema';
import { formatErrorResponse, generateRequestId } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const token = req.cookies.get('ssd_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId } },
        { status: 401 }
      );
    }

    const session = AuthService.verifySessionToken(token);
    const body = await req.json();

    const parseResult = mfaSetupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid 6-digit TOTP token is required',
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const { totpToken } = parseResult.data;
    const { secret } = body;

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SECRET',
            message: 'Secret key is required for initial verification',
            requestId,
          },
        },
        { status: 400 }
      );
    }

    await AuthService.verifyAndEnableMfa(session.userId, totpToken, secret);

    return NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication (MFA) successfully verified and activated.',
      requestId,
    });
  } catch (err: unknown) {
    const { statusCode, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status: statusCode });
  }
}
