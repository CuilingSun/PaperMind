import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  // Sanitise: only allow arXiv ID characters
  if (!/^[\w./-]+$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const pdfUrl = `https://arxiv.org/pdf/${id}`;
  const res = await fetch(pdfUrl, {
    headers: { 'User-Agent': 'PaperMind/1.0' },
    redirect: 'follow',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'PDF fetch failed' }, { status: res.status });
  }

  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${id}.pdf"`,
    },
  });
}
