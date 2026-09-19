"use client";

import { CircuitBoard } from "@/components/ui/circuit-board";
import { Cloud, Server, Shield, Database } from "lucide-react";

export default function CircuitBoardDemo() {
  return (
    <div className="flex min-h-[360px] w-full items-center justify-center bg-background p-6">
      <CircuitBoard
        nodes={[
          {
            id: "start",
            x: 80,
            y: 150,
            label: "Cloud",
            icon: <Cloud className="w-4 h-4" />,
            status: "active",
          },
          {
            id: "process",
            x: 250,
            y: 80,
            label: "Server",
            icon: <Server className="w-4 h-4" />,
            status: "processing",
          },
          {
            id: "validate",
            x: 250,
            y: 220,
            label: "Validate",
            icon: <Shield className="w-4 h-4" />,
            status: "active",
          },
          {
            id: "end",
            x: 420,
            y: 150,
            label: "Database",
            icon: <Database className="w-4 h-4" />,
            status: "active",
          },
        ]}
        connections={[
          { from: "start", to: "process", animated: true },
          { from: "start", to: "validate", animated: true },
          { from: "process", to: "end", animated: true },
          { from: "validate", to: "end", animated: true },
        ]}
        width={500}
        height={300}
      />
    </div>
  );
}
