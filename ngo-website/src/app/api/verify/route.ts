import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/modules/members/service';
import { formatErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sainikId = searchParams.get('id') || searchParams.get('sainikId') || searchParams.get('token') || searchParams.get('qr') || '';
    if (!sainikId) {
      return NextResponse.json({ success: false, verified: false, error: 'Sainik ID required' }, { status: 400 });
    }

    const result = await MemberService.verifyCadet(sainikId);
    const verification = result.member ? {
      verified: true,
      sainikId: result.member.sainik_id,
      fullName: result.member.full_name,
      photoUrl: result.member.photo_url || null,
      designation: result.member.designation || 'Cadet Sainik',
      wing: result.member.wing_name || 'Central Cadet Corps',
      state: result.member.state_name || 'Maharashtra',
      district: result.member.district_name || 'Nagpur',
      chapter: result.member.chapter_name || `${result.member.district_name || 'Nagpur'} Central Unit`,
      status: result.member.status || 'ACTIVE',
      commissionDate: result.member.approved_at || new Date().toISOString(),
      batchNo: result.member.batch_no || 'BATCH-2026/Q1',
      authority: 'National Executive Directorate, Central Command HQ Nagpur',
    } : null;

    return NextResponse.json({
      success: true,
      ...result,
      verification,
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json({ verified: false, ...body }, { status });
  }
}
