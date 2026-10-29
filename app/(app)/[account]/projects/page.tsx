import { notFound } from "next/navigation";

import { pageTitle } from "@/core/i18n/metadata";
import { can, getAccountContext } from "@/core/tenancy/accounts";
import { ProjectsView } from "@/modules/example/components/projects-view";

export const generateMetadata = pageTitle("Projects.title");

type Props = { params: Promise<{ account: string }> };

/** Example module page. The data loads in the browser under RLS; this page only checks access. */
export default async function ProjectsPage({ params }: Props) {
  const { account: slug } = await params;
  const context = await getAccountContext(slug);

  if (!context || !can(context, "projects.view")) {
    notFound();
  }

  return <ProjectsView />;
}
