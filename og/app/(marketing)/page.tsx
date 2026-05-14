import { SmoothScroll } from "@/components/home/SmoothScroll";
import { StackedLanding } from "@/components/home/StackedLanding";

export default function HomePage() {
  return (
    <>
      <SmoothScroll />
      <main>
        <StackedLanding />
      </main>
    </>
  );
}
