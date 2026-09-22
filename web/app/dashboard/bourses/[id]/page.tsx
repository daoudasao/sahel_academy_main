import { redirect } from "next/navigation";

export default async function BourseIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/bourses/${id}/candidatures`);
}
