import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/modules/members/service';
import { formatErrorResponse } from '@/lib/errors';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ssd_prod_secret_key_change_in_production_1927_2027';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ssd_cadet_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Cadet session required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const cardData = await MemberService.getMemberCardData(decoded.cadetId);

    return NextResponse.json({
      success: true,
      cadet: {
        ...decoded,
        ...cardData,
      },
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
