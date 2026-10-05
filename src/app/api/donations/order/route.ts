import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/modules/finance/service';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await FinanceService.createOrder(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
