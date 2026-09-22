import { fetchBourses, fetchFormations } from "@/lib/api";
import HomePageClient from "./HomePageClient";

export const revalidate = 0; // Dynamic fetch

export default async function Home() {
  const [bourses, formations] = await Promise.all([
    fetchBourses(),
    fetchFormations(),
  ]);
  return (
    <HomePageClient initialBourses={bourses} initialFormations={formations} />
  );
}
