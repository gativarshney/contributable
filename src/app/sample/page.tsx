import type { Metadata } from "next";
import { ReportView } from "@/components/report/ReportView";
import { buildSampleReport } from "@/lib/sample/dataset";

export const metadata: Metadata = {
  title: "Example report",
  description: "An example RepoInsight engineering report built from illustrative data.",
};

export default function SamplePage() {
  return <ReportView report={buildSampleReport()} />;
}
