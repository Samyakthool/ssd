import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/modules/finance/service';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await FinanceService.verifyPayment(body);
    return NextResponse.json({
      success: true,
      message: 'Payment confirmed & official 80G tax receipt generated',
      data: result,
      receiptNumber: result.receipt.receiptNumber,
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
