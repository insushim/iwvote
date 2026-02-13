'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Inbox, Search } from 'lucide-react';
import { ElectionCard } from '@/components/admin/ElectionCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getElections } from '@/lib/firestore';
import type { Election, ElectionStatus } from '@/types';

type FilterTab = 'all' | 'active' | 'closed';

interface TabConfig {
  key: FilterTab;
  label: string;
  statuses: ElectionStatus[] | null; // null = all
}

const filterTabs: TabConfig[] = [
  { key: 'all', label: '전체', statuses: null },
  { key: 'active', label: '진행중', statuses: ['active', 'ready', 'paused'] },
  { key: 'closed', label: '완료', statuses: ['closed', 'finalized'] },
];

// Default school ID - in production this would come from user's profile
const SCHOOL_ID = 'default';

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchElections() {
      try {
        const data = await getElections(SCHOOL_ID);
        setElections(data);
      } catch (err) {
        console.error('Failed to fetch elections:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchElections();
  }, []);

  const filteredElections = useMemo(() => {
    const currentTab = filterTabs.find((t) => t.key === activeTab);
    let result = elections;

    // Filter by status tab
    if (currentTab?.statuses) {
      result = result.filter((e) =>
        currentTab.statuses!.includes(e.status)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [elections, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, active: 0, closed: 0 };
    counts.all = elections.length;
    counts.active = elections.filter((e) =>
      ['active', 'ready', 'paused'].includes(e.status)
    ).length;
    counts.closed = elections.filter((e) =>
      ['closed', 'finalized'].includes(e.status)
    ).length;
    return counts;
  }, [elections]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="blue" />
          <p className="text-sm text-gray-500">선거 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          선거 관리
        </h1>
        <Link href="/admin/elections/new">
          <Button
            size="md"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            새 선거 만들기
          </Button>
        </Link>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? 'flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm transition-all'
                  : 'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-all hover:text-gray-700'
              }
            >
              {tab.label}
              <span
                className={
                  activeTab === tab.key
                    ? 'rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700'
                    : 'rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-500'
                }
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="선거 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Election list */}
      <AnimatePresence mode="wait">
        {filteredElections.length > 0 ? (
          <motion.div
            key={`list-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredElections.map((election, idx) => (
              <ElectionCard
                key={election.id}
                election={election}
                index={idx}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16"
          >
            <Inbox className="h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-gray-600">
              {searchQuery.trim()
                ? '검색 결과가 없습니다'
                : '아직 선거가 없습니다'}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery.trim()
                ? '다른 키워드로 검색해보세요.'
                : '새 선거를 만들어 학교 투표를 시작하세요.'}
            </p>
            {!searchQuery.trim() && (
              <Link href="/admin/elections/new" className="mt-5">
                <Button
                  size="md"
                  iconLeft={<Plus className="h-4 w-4" />}
                >
                  새 선거 만들기
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
