import { Suspense } from "react";
import { Summariser } from "@/components/summary/summariser";

export default function HomePage() {
  return (
    <Suspense>
      <Summariser />
    </Suspense>
  );
}
