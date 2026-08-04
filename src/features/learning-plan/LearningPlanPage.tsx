'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BrainCircuit, CalendarDays, Clock3, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Skeleton } from '../../components/shared';
import { learningPlanService } from '../../services';
import type { UpdateLearningPlanPayload } from '../../types';
import {
  DemoDisplayTitle,
  DemoHeroWhite,
  DemoPageRoot,
  DemoPill,
  DemoWhitePanel,
} from '../ui-reskin/demo-ui';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const LearningPlanPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['learning-plan'],
    queryFn: learningPlanService.getMine,
  });
  const [weeklyHours, setWeeklyHours] = useState(3);
  const [preferredDays, setPreferredDays] = useState([1, 3, 5]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [emailReminderEnabled, setEmailReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');

  useEffect(() => {
    if (!plan) return;
    setWeeklyHours(plan.weeklyHours);
    setPreferredDays(plan.preferredDays);
    setReminderEnabled(plan.reminderEnabled);
    setEmailReminderEnabled(plan.emailReminderEnabled);
    setReminderTime(plan.reminderTime);
  }, [plan]);

  const minutesPerSession = useMemo(
    () => Math.max(15, Math.round((weeklyHours * 60) / Math.max(1, preferredDays.length))),
    [preferredDays.length, weeklyHours],
  );
  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload: UpdateLearningPlanPayload) => learningPlanService.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-plan'] });
      toast.success('Your weekly study plan is saved.');
    },
    onError: () => toast.error('Could not save your study plan.'),
  });

  const toggleDay = (day: number) => {
    setPreferredDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const submit = () => {
    if (preferredDays.length === 0) {
      toast.error('Choose at least one study day.');
      return;
    }
    save({
      weeklyHours,
      preferredDays,
      reminderEnabled,
      emailReminderEnabled,
      reminderTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  return (
    <DemoPageRoot className="mx-auto max-w-4xl">
      <DemoHeroWhite>
        <DemoPill tone="blue">Learning plan</DemoPill>
        <DemoDisplayTitle>Set a pace you can keep.</DemoDisplayTitle>
        <p className="mt-3 max-w-2xl text-black/60">
          Choose your available time and reminders. Set each completion target inside its enrolled
          course so progress is evaluated against the right course.
        </p>
        <Link
          href="/learning-plan/adaptive"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#102b26] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#16433a] active:translate-y-px"
        >
          <BrainCircuit size={16} aria-hidden="true" />
          Open adaptive learning
        </Link>
      </DemoHeroWhite>

      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <EmptyState
          icon={<CalendarDays size={34} />}
          title="Could not load your learning plan"
          description="Please try again in a moment."
        />
      ) : (
        <DemoWhitePanel className="space-y-8 p-5 sm:p-7">
          <section>
            <div className="flex items-center gap-2">
              <Clock3 size={18} />
              <h2 className="font-semibold">Weekly commitment</h2>
            </div>
            <p className="mt-2 text-sm text-black/55">
              How many hours can you consistently set aside each week?
            </p>
            <div className="mt-4 flex items-center gap-4">
              <input
                aria-label="Weekly study hours"
                type="range"
                min="1"
                max="20"
                value={weeklyHours}
                onChange={(event) => setWeeklyHours(Number(event.target.value))}
                className="w-full accent-black"
              />
              <span className="min-w-20 rounded-full bg-black px-3 py-2 text-center text-sm font-semibold text-white">
                {weeklyHours} hr{weeklyHours === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} />
              <h2 className="font-semibold">Study days</h2>
            </div>
            <p className="mt-2 text-sm text-black/55">Pick the days you are most likely to study.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={preferredDays.includes(day.value)}
                  className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                    preferredDays.includes(day.value)
                      ? 'bg-[#d9f99d] text-black'
                      : 'border border-black/10 bg-white text-black/55'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div>
              <span className="flex items-center gap-2 font-semibold">
                <Bell size={18} />
                Reminder
              </span>
              <div className="mt-3 flex min-h-11 items-center justify-between rounded-lg border border-black/15 px-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(event) => setReminderEnabled(event.target.checked)}
                    className="size-4 accent-black"
                  />
                  Enable in-app reminders
                </label>
                <input
                  aria-label="Reminder time"
                  type="time"
                  value={reminderTime}
                  disabled={!reminderEnabled}
                  onChange={(event) => setReminderTime(event.target.value)}
                  className="bg-transparent text-sm disabled:text-black/30"
                />
              </div>
              <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={emailReminderEnabled}
                    disabled={!reminderEnabled}
                    onChange={(event) => setEmailReminderEnabled(event.target.checked)}
                    className="mt-0.5 size-4 accent-black disabled:cursor-not-allowed"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-black">
                      <Mail size={15} />
                      Send a copy to my verified email
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-black/55">
                      We&apos;ll send study reminders to your verified account email at the time you choose.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <div className="rounded-lg bg-[#102b26] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/50">Your weekly rhythm</p>
            <p className="mt-2 text-xl font-semibold">
              {preferredDays.length} study day{preferredDays.length === 1 ? '' : 's'} · about{' '}
              {minutesPerSession} minutes per session
            </p>
            <p className="mt-2 text-sm text-white/65">
              Keep this pace and ThreadLearn will use it to calculate a realistic next step.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} loading={isPending} className="rounded-full">
              Save learning plan
            </Button>
          </div>
        </DemoWhitePanel>
      )}
    </DemoPageRoot>
  );
};
