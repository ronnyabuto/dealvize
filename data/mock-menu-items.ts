import { MenuItem } from '@/lib/types';
import { BarChart3, Users, CheckSquare, FileText, PieChart, Settings, Mail, Building2 } from "lucide-react";

export const MAIN_MENU_ITEMS: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
    isActive: true,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Deals",
    url: "/deals",
    icon: PieChart,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Mail,
  },
];

export const BOTTOM_MENU_ITEMS: MenuItem[] = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Building2,
  },
];