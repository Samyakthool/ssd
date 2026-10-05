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
    const updated = await MembershipService.recommendApplication(
      session,
      params.id,
      body.rubric || body.assessmentRubric || {},
      body.remarks
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Application RECOMMENDED and advanced to next escalation tier',
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
