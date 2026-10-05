import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/modules/membership/service';
import { authenticateRequest } from '@/security/jurisdictionGuard';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get('status') || undefined;
    const wingId = searchParams.get('wingId') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await MembershipService.getApplicationsQueue(session, {
      status,
      wingId,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.applications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
