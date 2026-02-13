'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pencil, Lock, Shield } from 'lucide-react';
import { APP_NAME, APP_SLOGAN } from '@/constants';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
};

function CloudSVG({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 80"
      fill="white"
      fillOpacity="0.3"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M160 65H40c-22 0-40-14-40-32s18-32 40-32c2 0 4 0 6 .4C54 .4 66-4 80 4c10 6 16 16 18 26 4-2 8-3 12-3 18 0 32 12 34 28h16c12 0 22 8 22 18s-10 18-22 18z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-blue-100 px-4 py-8">
      {/* Cloud decorations */}
      <CloudSVG className="absolute left-[-40px] top-[10%] w-48 animate-[float_8s_ease-in-out_infinite]" />
      <CloudSVG className="absolute right-[-20px] top-[25%] w-36 animate-[float_10s_ease-in-out_infinite_1s]" />
      <CloudSVG className="absolute left-[10%] bottom-[20%] w-32 animate-[float_9s_ease-in-out_infinite_2s]" />
      <CloudSVG className="absolute right-[5%] bottom-[35%] w-40 animate-[float_11s_ease-in-out_infinite_0.5s]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full max-w-md flex-col items-center"
      >
        {/* Logo + Slogan */}
        <motion.div variants={itemVariants} className="mb-10 text-center">
          <div className="text-6xl">&#x1F5F3;&#xFE0F;</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-lg font-medium text-white/80 drop-shadow-sm">
            {APP_SLOGAN}
          </p>
        </motion.div>

        {/* Vote Button */}
        <motion.div variants={itemVariants} className="w-full">
          <Link href="/vote" className="block">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 rounded-2xl bg-blue-600 p-5 shadow-xl transition-shadow hover:shadow-2xl"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-3xl">
                &#x1F392;
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">투표하기</h2>
                  <Pencil className="h-4 w-4 text-blue-200" />
                </div>
                <p className="mt-0.5 text-sm text-blue-100">
                  투표 코드를 준비해주세요!
                </p>
              </div>
              <div className="text-blue-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Admin Button */}
        <motion.div variants={itemVariants} className="mt-4 w-full">
          <Link href="/admin/login" className="block">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 rounded-2xl border-2 border-blue-300 bg-white/90 p-5 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-3xl">
                &#x1F511;
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">관리자</h2>
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  선생님 전용 관리 페이지
                </p>
              </div>
              <div className="text-gray-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              해시 체인 보안 적용
            </span>
          </div>
          <p className="text-xs text-white/60">
            &copy; 2026 {APP_NAME}
          </p>
        </motion.div>
      </motion.div>

    </div>
  );
}
