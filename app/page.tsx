import { redirect } from 'next/navigation';
import { listProjects, productCount, recipeCount } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { ProjectsHome } from '@/components/projects/projects-home';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const projects = listProjects(user.id).map((p) => ({
    ...p,
    itemCount: productCount(p.id, user.id) + recipeCount(p.id, user.id),
  }));

  return <ProjectsHome projects={projects} />;
}
