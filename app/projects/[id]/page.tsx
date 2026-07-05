import { notFound, redirect } from 'next/navigation';
import { getProject, productCount, recipeCount } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { ProjectWorkspace } from '@/components/projects/project-workspace';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const project = getProject(params.id, user.id);
  if (!project) notFound();

  return (
    <ProjectWorkspace
      project={project}
      productCount={productCount(project.id, user.id)}
      recipeCount={recipeCount(project.id, user.id)}
    />
  );
}
