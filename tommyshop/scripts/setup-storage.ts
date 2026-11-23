/**
 * setup-storage.ts
 *
 * Creates the two required Supabase Storage buckets for Tommy Market.
 *
 * IMPORTANT: Both buckets MUST remain PRIVATE (public: false).
 * Screenshots and PDF reports are sensitive business data and are never
 * served via public URLs. All client access must go through signed URLs
 * generated server-side by supabaseAdmin.storage.createSignedUrl().
 *
 * Run once after configuring .env.local:
 *   npm run setup:storage
 */

import { supabaseAdmin } from '../src/lib/supabase/admin';

type BucketConfig = {
  name: string;
  options: {
    public: boolean;
    fileSizeLimit?: number | null;
    allowedMimeTypes?: string[];
  };
};

const buckets: BucketConfig[] = [
  {
    name: 'transfer-screenshots',
    options: {
      public: false,
      fileSizeLimit: 5242880, // 5 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
  {
    name: 'reports',
    options: {
      public: false,
      fileSizeLimit: null,
    },
  },
];

async function setupBucket(config: BucketConfig): Promise<void> {
  const { name, options } = config;
  const { error } = await supabaseAdmin.storage.createBucket(name, options);

  if (error) {
    // Supabase returns a 409-equivalent error when the bucket already exists.
    // The message contains "already exists" — treat this as a no-op.
    if (error.message.toLowerCase().includes('already exists')) {
      console.log(`✓ Bucket "${name}" already exists — skipping.`);
      return;
    }
    throw new Error(`Failed to create bucket "${name}": ${error.message}`);
  }

  console.log(`✓ Bucket "${name}" created successfully (private).`);
}

async function main(): Promise<void> {
  console.log('Setting up Supabase Storage buckets…\n');

  for (const bucket of buckets) {
    await setupBucket(bucket);
  }

  console.log('\nDone. Both buckets are private — access via signed URLs only.');
}

main().catch((err) => {
  console.error('\n✗ Setup failed:', err.message);
  process.exit(1);
});
