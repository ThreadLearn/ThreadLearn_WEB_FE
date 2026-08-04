'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Bot,
  User,
  Bell,
  Bookmark,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart2,
  Users,
  CreditCard,
  CheckCircle,
  History,
  Code2,
  Award,
  CalendarDays,
  GraduationCap,
  BrainCircuit,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../store';
import { getDisplayName } from '../utils';
import { Avatar } from '../components/shared';
import { BrandLogo } from '../components/shared/BrandLogo';
import {
  certificatesService,
  coursesService,
  enrollmentsService,
  notificationsService,
} from '../services';
import {
  SIDEBAR_COLLAPSED_CLASS,
  SIDEBAR_EXPANDED_CLASS,
} from './shell-metrics';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  /** Custom active matcher — avoid /quiz/[id] highlighting Quiz Attempts */
  isActive?: (pathname: string) => boolean;
}

interface NavGroup {
  label?: string;
  icon?: React.ReactNode;
  items: NavItem[];
}

const studentNavItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/courses', icon: <BookOpen size={16} />, label: 'Courses' },
  {
    to: '/learning-plan',
    icon: <CalendarDays size={16} />,
    label: 'Study plan',
    isActive: (pathname) => pathname === '/learning-plan',
  },
  {
    to: '/learning-plan/adaptive',
    icon: <BrainCircuit size={16} />,
    label: 'Adaptive path',
  },
  { to: '/ide', icon: <Code2 size={16} />, label: 'Code Lab' },
  {
    to: '/quiz/history',
    icon: <History size={16} />,
    label: 'Quiz Attempts',
    isActive: (pathname) =>
      pathname === '/quiz/history' || pathname.startsWith('/quiz/attempts/'),
  },
  { to: '/leaderboard', icon: <Trophy size={16} />, label: 'Leaderboard' },
  { to: '/certificates', icon: <Award size={16} />, label: 'Certificates' },
  { to: '/pricing', icon: <CreditCard size={16} />, label: 'Pricing' },
  { to: '/ai', icon: <Bot size={16} />, label: 'AI Advisor' },
  { to: '/bookmarks', icon: <Bookmark size={16} />, label: 'Bookmarks' },
  { to: '/notes', icon: <StickyNote size={16} />, label: 'My Notes' },
  { to: '/notifications', icon: <Bell size={16} />, label: 'Notifications' },
  { to: '/profile', icon: <User size={16} />, label: 'Profile' },
];

const adminNavigationItems: NavItem[] = [
  { to: '/admin', icon: <BarChart2 size={16} />, label: 'Analytics' },
  { to: '/admin/users', icon: <Users size={16} />, label: 'Users' },
  { to: '/admin/instructors', icon: <GraduationCap size={16} />, label: 'Instructors' },
  { to: '/admin/notifications', icon: <Bell size={16} />, label: 'Notifications' },
  { to: '/admin/courses', icon: <BookOpen size={16} />, label: 'Manage Courses' },
  { to: '/admin/quizzes', icon: <CheckCircle size={16} />, label: 'Quizzes' },
  { to: '/admin/code-assignments', icon: <Code2 size={16} />, label: 'Code Assignments' },
  { to: '/admin/plans', icon: <CreditCard size={16} />, label: 'Plans' },
];

const adminAccountItems: NavItem[] = [
  { to: '/profile', icon: <User size={16} />, label: 'Profile' },
];

const instructorNavGroups: NavGroup[] = [
  { label: 'Instructor', icon: <Shield size={10} />, items: [
    { to: '/instructor', icon: <LayoutDashboard size={16} />, label: 'Overview' },
    { to: '/instructor/courses', icon: <BookOpen size={16} />, label: 'My Courses' },
    { to: '/instructor/assignments', icon: <Code2 size={16} />, label: 'Code Assignments' },
    { to: '/instructor/quizzes', icon: <CheckCircle size={16} />, label: 'Quizzes' },
  ] },
  { label: 'Account', items: [{ to: '/profile', icon: <User size={16} />, label: 'Profile' }] },
];

const studentNavGroups: NavGroup[] = [{ items: studentNavItems }];

const adminNavGroups: NavGroup[] = [
  { label: 'Admin', icon: <Shield size={10} />, items: adminNavigationItems },
  { label: 'Account', items: adminAccountItems },
];

function itemActive(item: NavItem, pathname: string): boolean {
  if (item.isActive) return item.isActive(pathname);
  if (item.to === '/admin') return pathname === '/admin';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const displayName = getDisplayName(user);
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen, toggleSidebarCollapse } = useUIStore();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const navGroups = isAdmin ? adminNavGroups : isInstructor ? instructorNavGroups : studentNavGroups;

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const warmRoute = (route: string) => {
    router.prefetch(route);

    if (route === '/courses') {
      void queryClient.prefetchQuery({
        queryKey: ['courses', '', ''],
        queryFn: () => coursesService.list({}),
      });
    }
    if (route === '/dashboard') {
      void queryClient.prefetchQuery({
        queryKey: ['my-enrollments'],
        queryFn: enrollmentsService.getMyEnrollments,
      });
    }
    if (route === '/notifications') {
      void queryClient.prefetchQuery({
        queryKey: ['notifications'],
        queryFn: notificationsService.getAll,
      });
    }
    if (route === '/certificates') {
      void queryClient.prefetchQuery({
        queryKey: ['certificates'],
        queryFn: certificatesService.listMine,
      });
    }
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-black/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
    <aside
      className={`shell-sidebar fixed left-0 top-0 z-40 flex h-[100dvh] flex-col border-r backdrop-blur-xl transition-[transform,width] duration-200 ${
        sidebarCollapsed ? SIDEBAR_COLLAPSED_CLASS : SIDEBAR_EXPANDED_CLASS
      } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      aria-label="Primary navigation"
    >
      <div className="h-14 flex items-center justify-between px-3 border-b border-black/10 shrink-0">
        {!sidebarCollapsed && (
          <Link
            href="/"
            className="flex items-center min-w-0 flex-1 mr-1"
            aria-label="ThreadLearn home"
          >
            <BrandLogo variant="full" size="sm" priority className="max-w-[148px]" />
          </Link>
        )}
        {sidebarCollapsed && (
          <Link
            href="/"
            className="flex items-center justify-center mx-auto"
            title="ThreadLearn"
            aria-label="ThreadLearn home"
          >
            <BrandLogo variant="mark" size="sm" priority />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className={`text-ink-faint hover:text-ink hover:bg-black/[0.05] p-1 rounded-lg transition-colors shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {sidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="mx-auto mt-2 text-ink-faint hover:text-ink hover:bg-black/[0.05] p-1 rounded-lg transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={14} />
        </button>
      )}

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {navGroups.map((group, groupIndex) => (
          <React.Fragment key={group.label ?? 'student-navigation'}>
            {groupIndex > 0 && (
              <div className={`my-2 border-t border-black/10 ${sidebarCollapsed ? '' : 'mx-1'}`} />
            )}
            {group.label && !sidebarCollapsed && (
              <div className="flex items-center gap-1.5 px-3 py-1 mb-1">
                {group.icon}
                <span className="text-[10px] text-ink-faint uppercase tracking-widest">
                  {group.label}
                </span>
              </div>
            )}
            {group.items.map((item) => {
              const active = itemActive(item, pathname);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setSidebarOpen(false)}
                  onMouseEnter={() => warmRoute(item.to)}
                  onFocus={() => warmRoute(item.to)}
                  className={`${active ? 'sidebar-item-active' : 'sidebar-item'} ${
                    sidebarCollapsed ? 'justify-center px-0 py-2' : ''
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="border-t border-black/10 p-2 shrink-0">
        <Link
          href="/profile"
          onClick={() => setSidebarOpen(false)}
          onMouseEnter={() => warmRoute('/profile')}
          onFocus={() => warmRoute('/profile')}
          className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/[0.04] transition-colors ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Avatar src={user?.avatarUrl} name={displayName} size="sm" />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs text-ink font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-ink-faint truncate">{user?.role}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
    </>
  );
};
