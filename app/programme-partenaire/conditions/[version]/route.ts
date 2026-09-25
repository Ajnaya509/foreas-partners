import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import currentPublication from '@/content/partner/conditions/publication-candidate.json';
import previousPublications from '@/content/partner/conditions/previous-publications.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public terms contain no personal data. Acceptance remains a separate authenticated action. */
export async function GET(_request: Request, context: { params: Promise<{ version: string }> }) {
  const { version } = await context.params;
  const publication = version === currentPublication.version ? currentPublication : previousPublications[version as keyof typeof previousPublications];
  if (!publication || version !== publication.version || !/^CONDITIONS_PROGRAMME_[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+\.html$/.test(publication.html_file)) {
    return new NextResponse('Document introuvable.', { status: 404 });
  }
  if (!publication.publication_authorized || publication.independent_review_state !== 'accepted_for_publication') {
    return new NextResponse('Ce document est en préparation.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }
  try {
    const body = await readFile(join(process.cwd(), 'content/partner/conditions', publication.html_file));
    if (createHash('sha256').update(body).digest('hex') !== publication.sha256) throw new Error('DOCUMENT_CHANGED');
    return new NextResponse(new Uint8Array(body), { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline; filename="FOREAS_conditions_partenaires_' + version + '.html"',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    } });
  } catch {
    return new NextResponse('Le document est momentanément indisponible.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
