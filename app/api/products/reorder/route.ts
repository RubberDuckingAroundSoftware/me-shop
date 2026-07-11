import { NextRequest, NextResponse } from 'next/server';
import { reorderProducts } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Persist a manual product ordering. Sets sort_order = index for each id in
 * the array. Both the list and board views send the full project ordering, so
 * the two views stay windows onto the same underlying order. Scoped to the
 * authenticated user.
 *
 * PUT { projectId, productIds: string[] }
 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const productIds = body?.productIds;
  if (
    !Array.isArray(productIds) ||
    !productIds.every((id) => typeof id === 'string')
  ) {
    return NextResponse.json(
      { error: 'productIds (string[]) is required' },
      { status: 400 }
    );
  }
  reorderProducts(user.id, productIds);
  return NextResponse.json({ success: true });
}
