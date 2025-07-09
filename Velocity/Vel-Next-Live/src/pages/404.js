import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Try to load the page using client-side routing
    const path = window.location.pathname;
    router.push(path);
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1>Loading...</h1>
      <p>Redirecting to the requested page...</p>
    </div>
  );
}
