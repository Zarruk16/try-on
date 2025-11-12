"use client";
import ArScene from "@/components/ArScene";

export default function ModelPage() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <ArScene modelUrl="/3D%20Models/ballerinaShoe.glb" />
    </main>
  );
}
