"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Package,
  Users,
  Star,
  FileText,
  Settings,
  Palette,
  BarChart3,
  UserCog,
  Heart,
  Zap,
  Bell,
  Activity,
  Shield,
  CheckCircle2,
  Database,
  Sparkles,
  Code,
  BookOpen,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavCategory {
  name: string;
  icon: LucideIcon;
  items: NavItem[];
}

const navigationCategories: NavCategory[] = [
  {
    name: "Overview",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    name: "Care Management",
    icon: Heart,
    items: [
      { name: "Patients", href: "/admin/patients", icon: Users },
      { name: "Messages", href: "/admin/messages", icon: MessageSquare },
      { name: "Feedback", href: "/admin/feedback", icon: Star },
      { name: "Bereavement", href: "/admin/bereavement", icon: Heart },
    ],
  },
  {
    name: "Operations",
    icon: Package,
    items: [
      { name: "Deliveries", href: "/admin/deliveries", icon: Package },
      { name: "Supplies", href: "/admin/supplies", icon: Package },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    name: "Users & Access",
    icon: Users,
    items: [
      { name: "Team Management", href: "/admin/team-management", icon: Users },
      { name: "Onboarding", href: "/admin/onboarding", icon: Sparkles },
    ],
  },
  {
    name: "Analytics & Reports",
    icon: BarChart3,
    items: [
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { name: "Advanced Analytics", href: "/admin/advanced-analytics", icon: BarChart3 },
      { name: "AI Insights", href: "/admin/ai-insights", icon: Sparkles },
      { name: "Reports", href: "/admin/reports", icon: BarChart3 },
      { name: "Performance", href: "/admin/performance", icon: Activity },
    ],
  },
  {
    name: "Content",
    icon: FileText,
    items: [
      { name: "Content", href: "/admin/content", icon: FileText },
      { name: "Documentation", href: "/admin/documentation", icon: BookOpen },
      { name: "Release Notes", href: "/admin/release-notes", icon: FileText },
    ],
  },
  {
    name: "Security & Compliance",
    icon: Shield,
    items: [
      { name: "Security", href: "/admin/security", icon: Shield },
      { name: "Compliance", href: "/admin/compliance", icon: CheckCircle2 },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
    ],
  },
  {
    name: "Integrations",
    icon: Zap,
    items: [
      { name: "Integrations", href: "/admin/integrations", icon: Zap },
      { name: "API Management", href: "/admin/api-management", icon: Code },
      { name: "Data Management", href: "/admin/data-management", icon: Database },
    ],
  },
  {
    name: "Customization",
    icon: Palette,
    items: [
      { name: "Branding", href: "/admin/branding", icon: Palette },
      { name: "White Label", href: "/admin/white-label", icon: Palette },
    ],
  },
  {
    name: "System",
    icon: Settings,
    items: [
      { name: "Settings", href: "/admin/settings", icon: Settings },
      { name: "Health Check", href: "/admin/health-check", icon: Activity },
    ],
  },
];

interface CollapsibleCategoryProps {
  category: NavCategory;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function CollapsibleCategory({ category, pathname, isExpanded, onToggle }: CollapsibleCategoryProps) {
  const CategoryIcon = category.icon;
  const hasActiveItem = category.items.some(item => pathname === item.href);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          hasActiveItem
            ? "bg-[#7A9B8E]/10 text-[#7A9B8E]"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <CategoryIcon className="h-4 w-4" />
          <span>{category.name}</span>
        </div>
        <div className={cn(
          "transition-transform duration-200",
          isExpanded ? "rotate-0" : "-rotate-90"
        )}>
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
          {category.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-[#7A9B8E] text-white shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Auto-expand category containing active item on mount only
  useEffect(() => {
    const activeCategory = navigationCategories.find(cat => 
      cat.items.some(item => pathname === item.href)
    );
    if (activeCategory) {
      setExpandedCategories(prev => {
        // Only update if the active category isn't already expanded
        if (!prev.has(activeCategory.name)) {
          return new Set([activeCategory.name]);
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      // If clicking the currently open category, close it
      if (prev.has(categoryName)) {
        return new Set();
      }
      // Otherwise, close all and open only the clicked one
      return new Set([categoryName]);
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(navigationCategories.map(cat => cat.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return (
    <aside className="w-64 border-r bg-card/50 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>Admin Portal</h2>
        <p className="text-sm text-muted-foreground mt-1">Hospice Agency</p>
      </div>



      <nav className="flex-1 p-3 overflow-y-auto">
        {navigationCategories.map((category) => (
          <CollapsibleCategory
            key={category.name}
            category={category}
            pathname={pathname}
            isExpanded={expandedCategories.has(category.name)}
            onToggle={() => toggleCategory(category.name)}
          />
        ))}
      </nav>
    </aside>
  );
}
