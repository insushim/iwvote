"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function VoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Vote page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">문제가 발생했어요</h2>
        <p className="mt-2 text-sm text-gray-500">잠시 후 다시 시도해주세요</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </button>
          <a
            href="/vote/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            처음으로
          </a>
        </div>
      </div>
    </div>
  );
}
