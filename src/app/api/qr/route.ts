import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || searchParams.get('data') || 'https://ssdind.vercel.app';
    const widthParam = parseInt(searchParams.get('width') || searchParams.get('size') || '300', 10);
    const width = isNaN(widthParam) || widthParam < 64 || widthParam > 1024 ? 300 : widthParam;

    const buffer = await QRCode.toBuffer(text, {
      type: 'png',
      width,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#001f3f',
        light: '#ffffff',
      },
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate QR code', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
