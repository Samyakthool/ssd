import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/service';
import { formatErrorResponse, generateRequestId } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const token = req.cookies.get('ssd_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to setup MFA', requestId } },
        { status: 401 }
      );
    }

    const session = AuthService.verifySessionToken(token);
    const mfaData = await AuthService.setupMfa(session.userId);

    return NextResponse.json({
      success: true,
      data: mfaData,
      requestId,
    });
  } catch (err: unknown) {
    const { statusCode, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status: statusCode });
  }
}
