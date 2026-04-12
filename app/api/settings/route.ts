import { NextResponse } from 'next/server';
import { loadSettings, saveSettings } from '@/lib/settings';

export async function GET() {
  return NextResponse.json(loadSettings());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const payload = body && typeof body === 'object' && 'settings' in body
      ? (body as { settings?: unknown }).settings
      : body;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    const settings = saveSettings(payload);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
