import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json() as { filename: string };

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename required' }, { status: 400 });
    }

    // Security: only allow simple filenames (no path traversal)
    if (!/^[\w\-.]+\.json$/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const backupPath = path.join(dataDir, 'backups', filename);
    const currentPath = path.join(dataDir, 'current.json');

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Backup current before restoring
    if (fs.existsSync(currentPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      fs.copyFileSync(currentPath, path.join(dataDir, 'backups', `${timestamp}.json`));
    }

    fs.copyFileSync(backupPath, currentPath);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
