import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Columns03 as FolderKanban,
  LayoutGrid01 as LayoutDashboard,
  CheckSquare,
  MessageChatSquare as MessageSquare,
  CalendarDate as CalendarDays,
} from "@untitledui/icons";
import { useQuery } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { useUnreadMessageCount } from "@/hooks/useMessages";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  isMiddle?: boolean;
  badge?: number | string | null;
  isActive: (pathname: string) => boolean;
}

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch unread messages for real-time badge on Chat
  const { data: unreadMessagesCount = 0 } = useUnreadMessageCount();

  // Fetch tasks to display total / active tasks badge on the middle button
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => taskApi.getTasks(),
    staleTime: 1000 * 30, // 30s cache
  });

  const activeTasksCount = tasks.filter(
    (t) => !t.isDeleted && t.status !== "done" && t.progress !== 100
  ).length;

  const navItems: NavItem[] = [
    {
      id: "boards",
      label: "Boards",
      icon: FolderKanban,
      path: "/",
      isActive: (pathname) => pathname === "/" || pathname.startsWith("/boards"),
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      isActive: (pathname) => pathname === "/dashboard",
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      path: "/tasks",
      isMiddle: true, // Most used in the middle
      badge: activeTasksCount > 0 ? (activeTasksCount > 99 ? "99+" : activeTasksCount) : null,
      isActive: (pathname) => pathname === "/tasks",
    },
    {
      id: "messages",
      label: "Chat",
      icon: MessageSquare,
      path: "/messages",
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? "99+" : unreadMessagesCount) : null,
      isActive: (pathname) => pathname.startsWith("/messages"),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarDays,
      path: "/calendar",
      isActive: (pathname) => pathname === "/calendar",
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-40 select-none pointer-events-auto"
    >
      <div className="relative flex items-center justify-around px-2 py-1.5 rounded-3xl bg-card/90 dark:bg-card/85 backdrop-blur-2xl border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(location.pathname);

          if (item.isMiddle) {
            // Elevated Center "Most Used" Button
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className="relative -top-3.5 flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl group cursor-pointer"
                aria-label={`${item.label} (Most Used)`}
                aria-current={active ? "page" : undefined}
              >
                {/* Glowing Aura Effect when active or hovered */}
                <div
                  className={cn(
                    "absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-primary/80 to-violet-500 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-75",
                    active && "opacity-80"
                  )}
                />

                {/* Central Button Core */}
                <div
                  className={cn(
                    "relative h-13 w-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-lg",
                    active
                      ? "bg-gradient-to-tr from-primary to-violet-600 text-primary-foreground shadow-primary/40 ring-2 ring-background scale-105"
                      : "bg-primary/90 text-primary-foreground hover:bg-primary shadow-primary/25"
                  )}
                >
                  <Icon className="h-6 w-6 stroke-[2.2] transition-transform duration-200 group-hover:scale-110" />

                  {/* Active Indicator Pip */}
                  {active && (
                    <motion.div
                      layoutId="activeMiddlePip"
                      className="absolute -bottom-1 h-1 w-3 rounded-full bg-primary-foreground"
                    />
                  )}

                  {/* Notification / Task Count Badge */}
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground font-black text-[10px] rounded-full flex items-center justify-center border-2 border-background shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[10px] font-bold mt-1 tracking-tight transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          }

          // Standard Nav Buttons (Buttons 1, 2, 4, 5)
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group cursor-pointer"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {/* Active Background Pill Indicator */}
              {active && (
                <motion.div
                  layoutId="bottomNavActivePill"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active
                      ? "text-primary stroke-[2.4] scale-110"
                      : "text-muted-foreground stroke-[1.8] group-hover:text-foreground group-hover:scale-105"
                  )}
                />

                {/* Badge for Chat unread messages */}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[17px] h-4 px-1 bg-destructive text-destructive-foreground font-bold text-[9px] rounded-full flex items-center justify-center border border-background shadow-xs animate-in zoom-in-50 duration-200">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "text-[10px] font-semibold mt-1 tracking-tight transition-colors z-10",
                  active
                    ? "text-primary font-bold"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
