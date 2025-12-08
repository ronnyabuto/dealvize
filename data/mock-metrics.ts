import { Metric } from '@/lib/types';
import { TrendingUp, Users, DollarSign, Target, Calendar, Trophy, Handshake, TrendingDown } from "lucide-react";

export const MOCK_METRICS: Metric[] = [
  {
    title: "Total Pipeline Value",
    value: "$4.8M",
    icon: DollarSign,
    trend: "+23%",
    trendUp: true,
  },
  {
    title: "Active Deals",
    value: "34",
    icon: Target,
    trend: "+18%",
    trendUp: true,
  },
  {
    title: "Monthly Commission",
    value: "$142K",
    icon: TrendingUp,
    trend: "+31%",
    trendUp: true,
  },
  {
    title: "Active Clients",
    value: "67",
    icon: Users,
    trend: "+12%",
    trendUp: true,
  },
  {
    title: "Deals Closing This Month",
    value: "8",
    icon: Calendar,
    trend: "+25%",
    trendUp: true,
  },
  {
    title: "Conversion Rate",
    value: "78%",
    icon: Trophy,
    trend: "+5%",
    trendUp: true,
  },
  {
    title: "Avg. Deal Size",
    value: "$485K",
    icon: Handshake,
    trend: "+11%",
    trendUp: true,
  },
  {
    title: "Days to Close",
    value: "42",
    icon: TrendingDown,
    trend: "-8%",
    trendUp: true,
  },
];