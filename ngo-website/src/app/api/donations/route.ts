import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/modules/finance/service';
import { authenticateRequest } from '@/security/jurisdictionGuard';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = authenticateRequest(req);
    const donations = await FinanceService.listDonations(session);
    return NextResponse.json({ success: true, donations, total: donations.length });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
