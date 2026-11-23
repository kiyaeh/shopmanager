import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import { createHash } from 'crypto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    await requireRole('SALES');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const clientHash = formData.get('imageHash') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be 5 MB or less' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Compute server-side SHA-256 hash
  const serverHash = createHash('sha256').update(buffer).digest('hex');

  // Compare with client-provided hash if present
  if (clientHash && clientHash !== serverHash) {
    return NextResponse.json({ error: 'File integrity check failed' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `transfers/${Date.now()}-${serverHash.slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('transfer-screenshots')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  return NextResponse.json({ storagePath: path, imageHash: serverHash });
}
