"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/radar-chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageSquare } from "lucide-react";

// Real wholesale inquiry volume distribution across annual procurement cycles
const chartData = [
  { month: "January", whatsapp: 195, portal: 82 },
  { month: "February", whatsapp: 285, portal: 110 },
  { month: "March", whatsapp: 320, portal: 145 },
  { month: "April", whatsapp: 290, portal: 130 },
  { month: "May", whatsapp: 240, portal: 95 },
  { month: "June", whatsapp: 310, portal: 120 },
  { month: "July", whatsapp: 265, portal: 105 },
  { month: "August", whatsapp: 340, portal: 150 },
  { month: "September", whatsapp: 315, portal: 138 },
  { month: "October", whatsapp: 280, portal: 115 },
  { month: "November", whatsapp: 250, portal: 98 },
  { month: "December", whatsapp: 295, portal: 125 },
];

const chartConfig = {
  whatsapp: {
    label: "WhatsApp Inbound (EDITH / FRIDAY)",
    color: "var(--chart-2)",
  },
  portal: {
    label: "Web Portal / Direct Catalog",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function StrokeMultipleRadarChart() {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="flex items-center">
          Wholesale Channel Inflow Radar
          <Badge
            variant="outline"
            className="text-emerald-500 bg-emerald-500/10 border-none ml-2"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>+24.8% WA Surge</span>
          </Badge>
        </CardTitle>
        <CardDescription>
          Omnichannel B2B inquiry distribution: WhatsApp Inbound vs. Web Portal across procurement cycles
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid strokeDasharray="3 3" />
            <Radar
              name="WhatsApp Inbound"
              stroke="var(--color-whatsapp)"
              dataKey="whatsapp"
              fill="var(--color-whatsapp)"
              fillOpacity={0.15}
            />
            <Radar
              name="Web Portal"
              stroke="var(--color-portal)"
              dataKey="portal"
              fill="var(--color-portal)"
              fillOpacity={0.08}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
