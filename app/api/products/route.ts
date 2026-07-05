import { NextRequest, NextResponse } from 'next/server';
import { createProduct, getProject, listProducts } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId query param is required' },
      { status: 400 }
    );
  }
  return NextResponse.json({ products: listProducts(projectId, user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const projectId = body?.projectId;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!projectId || !name) {
    return NextResponse.json(
      { error: 'projectId and name are required' },
      { status: 400 }
    );
  }

  // Ensure the target project belongs to this user before attaching a product.
  if (!getProject(projectId, user.id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const product = createProduct({
    userId: user.id,
    projectId,
    name,
    description: body.description,
    metadata: body.metadata ?? {},
    sources: body.sources ?? [],
    status: body.status,
  });
  return NextResponse.json({ product }, { status: 201 });
}
