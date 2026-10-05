import { NextRequest, NextResponse } from 'next/server';
import { CmsService } from '@/modules/cms/service';
import { authenticateRequest } from '@/security/jurisdictionGuard';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = authenticateRequest(req);
    const logs = await CmsService.getAuditLogs(session);
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
