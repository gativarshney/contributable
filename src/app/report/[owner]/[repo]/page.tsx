import type { Metadata } from "next";
import { ReportLoader } from "@/components/report/ReportLoader";

type Props = { params: Promise<{ owner: string; repo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo } = await params;
  const name = `${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;
  return {
    title: `${name} engineering report`,
    description: `Evidence-backed report on ${name}: activity, maintenance, contributors, releases, issues and pull requests.`,
    robots: { index: false, follow: true },
  };
}

export default async function ReportPage({ params }: Props) {
  const { owner, repo } = await params;
  return (
    <ReportLoader owner={decodeURIComponent(owner)} name={decodeURIComponent(repo)} />
  );
}
