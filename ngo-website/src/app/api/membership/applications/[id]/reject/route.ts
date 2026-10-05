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
    const reason = body.reason || body.rejectionReason || 'Application does not meet eligibility criteria';

    const updated = await MembershipService.rejectApplication(session, params.id, reason);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Application marked REJECTED',
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
