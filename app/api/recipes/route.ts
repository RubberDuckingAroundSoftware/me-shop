import { NextRequest, NextResponse } from 'next/server';
import { createRecipe, getProject, listRecipes } from '@/db/repo';
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
  return NextResponse.json({ recipes: listRecipes(projectId, user.id) });
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
  if (!getProject(projectId, user.id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const recipe = createRecipe({
    userId: user.id,
    projectId,
    name,
    description: body.description,
    servings: body.servings,
    prepTime: body.prepTime,
    cookTime: body.cookTime,
    ingredients: body.ingredients ?? [],
    instructions: body.instructions ?? [],
    notes: body.notes,
  });
  return NextResponse.json({ recipe }, { status: 201 });
}
