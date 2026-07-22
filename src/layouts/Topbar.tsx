'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, LogOut, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '../store';
import { Avatar, Badge } from '../components/shared';
import { notificationsService } from '../services';
import {
  TOPBAR_COLLAPSED_LEFT,
  TOPBAR_EXPANDED_LEFT,
} from './shell-metrics';

export const Topbar: React.FC = () => {
  const { user, logout, stats } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
    enabled: Boolean(user),
  });
  const unreadNotifications =
    notifications?.filter((notification) => !notification.isRead).length ?? 0;

  const level = stats?.level ?? 1;
  const xp = stats?.xp;
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-14 flex items-center justify-between px-5 border-b border-black/10 bg-white/85 backdrop-blur-xl transition-all duration-200 ${
        sidebarCollapsed ? TOPBAR_COLLAPSED_LEFT : TOPBAR_EXPANDED_LEFT
      }`}
    >
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue.trim()) {
                router.push(`/courses?search=${encodeURIComponent(searchValue)}`);
              }
            }}
            placeholder="Search courses..."
            className="h-8 bg-canvas-cream border border-black/10 text-ink placeholder:text-black/35 rounded-lg pl-8 pr-10 text-xs w-60 outline-none focus:border-black/25 focus:bg-white transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-ink-soft">
            <Command size={10} />
            <span className="text-[10px]">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {user && !isAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-lime/80 border border-black/5 mr-2">
            <span className="text-ink/70 text-xs">Lv.</span>
            <span className="text-ink text-xs font-semibold">{level}</span>
            {xp != null && (
              <>
                <span className="text-ink/30 text-xs">·</span>
                <span className="text-ink/70 text-xs">{xp.toLocaleString()} XP</span>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="relative p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-black/[0.05] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={15} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-black text-[10px] leading-4 text-white text-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/[0.05] transition-colors"
          >
            <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-52 bg-white border border-black/10 rounded-xl panel-shadow py-1 animate-fade-in">
                <div className="px-3 py-2.5 border-b border-black/10">
                  <p className="text-xs text-ink font-medium truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-ink-faint truncate">
                    {user?.email}
                  </p>
                  {!isAdmin && (
                    <div className="mt-1">
                      <Badge color={user?.planType === 'PREMIUM' ? 'amber' : 'gray'}>
                        {user?.planType}
                      </Badge>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-black/[0.04] transition-colors"
                >
                  Profile settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-500/5 transition-colors flex items-center gap-2"
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
