import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/service';
import { formatErrorResponse, generateRequestId } from '@/lib/errors';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const cookieToken = req.cookies.get('ssd_session')?.value;
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No active authentication session found',
            requestId,
          },
        },
        { status: 401 }
      );
    }

    const session = AuthService.verifySessionToken(token);

    return NextResponse.json({
      success: true,
      data: {
        user: session,
      },
      requestId,
    });
  } catch (err: unknown) {
    const { statusCode, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status: statusCode });
  }
}
