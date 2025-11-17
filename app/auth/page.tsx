import { Suspense } from "react";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <Suspense>
      <AuthClient />
    </Suspense>
  );
}
