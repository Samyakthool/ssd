import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/modules/membership/service';
import { authenticateRequest } from '@/security/jurisdictionGuard';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = authenticateRequest(req);
    const params = await Promise.resolve(context.params);
    const body = await req.json().catch(() => ({}));

    const result = await MembershipService.approveApplication(session, params.id, body.remarks);

    return NextResponse.json({
      success: true,
      data: {
        application: result.application,
        member: result.member,
      },
      message: 'Application approved and Cadet Sainik officially commissioned',
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
