import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/modules/finance/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const receipt = await FinanceService.getReceipt(params.id);
    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
