'use client';

import { useMemo } from 'react';
import { classIdToLabel } from '@/lib/utils';
import type { ElectionResult, Candidate } from '@/types';

interface ClassResultTableProps {
  results: ElectionResult;
  candidates: Candidate[];
}

export function ClassResultTable({ results, candidates }: ClassResultTableProps) {
  const classIds = useMemo(() => {
    return Object.keys(results.classTurnout).sort((a, b) => {
      const [aGrade, aClass] = a.split('-').map(Number);
      const [bGrade, bClass] = b.split('-').map(Number);
      if (aGrade !== bGrade) return aGrade - bGrade;
      return aClass - bClass;
    });
  }, [results.classTurnout]);

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) => a.number - b.number),
    [candidates]
  );

  // Compute per-class candidate votes
  const classData = useMemo(() => {
    return classIds.map((classId) => {
      const turnout = results.classTurnout[classId];
      const candidateVotes: Record<string, number> = {};

      results.candidates.forEach((cr) => {
        candidateVotes[cr.candidateId] = cr.classCounts[classId] ?? 0;
      });

      const totalCandidateVotes = Object.values(candidateVotes).reduce(
        (sum, v) => sum + v,
        0
      );
      const totalClassVotes = turnout.voted;
      const abstentions = totalClassVotes - totalCandidateVotes;

      // Find the winning candidate for this class
      let maxVotes = 0;
      let winnerId: string | null = null;
      Object.entries(candidateVotes).forEach(([cid, votes]) => {
        if (votes > maxVotes) {
          maxVotes = votes;
          winnerId = cid;
        }
      });

      return {
        classId,
        candidateVotes,
        abstentions: Math.max(0, abstentions),
        totalVotes: totalClassVotes,
        total: turnout.total,
        rate: turnout.rate,
        winnerId,
      };
    });
  }, [classIds, results]);

  // Compute totals row
  const totals = useMemo(() => {
    const candidateVoteTotals: Record<string, number> = {};
    sortedCandidates.forEach((c) => {
      candidateVoteTotals[c.id] = 0;
    });

    let totalAbstentions = 0;
    let totalVotes = 0;
    let totalVoters = 0;

    classData.forEach((cd) => {
      Object.entries(cd.candidateVotes).forEach(([cid, votes]) => {
        candidateVoteTotals[cid] = (candidateVoteTotals[cid] ?? 0) + votes;
      });
      totalAbstentions += cd.abstentions;
      totalVotes += cd.totalVotes;
      totalVoters += cd.total;
    });

    return { candidateVoteTotals, totalAbstentions, totalVotes, totalVoters };
  }, [classData, sortedCandidates]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-900">
              반
            </th>
            {sortedCandidates.map((c) => (
              <th
                key={c.id}
                className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-900"
              >
                {c.number}번 {c.name}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-500">
              기권
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-900">
              총투표수
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-900">
              투표율
            </th>
          </tr>
        </thead>
        <tbody>
          {classData.map((cd, rowIndex) => (
            <tr
              key={cd.classId}
              className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
            >
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-700">
                {classIdToLabel(cd.classId)}
              </td>
              {sortedCandidates.map((c) => {
                const votes = cd.candidateVotes[c.id] ?? 0;
                const isClassWinner = cd.winnerId === c.id && votes > 0;

                return (
                  <td
                    key={c.id}
                    className={`px-4 py-2.5 text-center ${
                      isClassWinner
                        ? 'font-bold text-blue-700 bg-blue-50'
                        : 'text-gray-600'
                    }`}
                  >
                    {votes}
                  </td>
                );
              })}
              <td className="px-4 py-2.5 text-center text-gray-400">
                {cd.abstentions}
              </td>
              <td className="px-4 py-2.5 text-center font-medium text-gray-700">
                {cd.totalVotes}/{cd.total}
              </td>
              <td className="px-4 py-2.5 text-center font-medium text-gray-700">
                {cd.rate.toFixed(1)}%
              </td>
            </tr>
          ))}

          {/* Totals row */}
          <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
            <td className="whitespace-nowrap px-4 py-3 text-gray-900">합계</td>
            {sortedCandidates.map((c) => (
              <td key={c.id} className="px-4 py-3 text-center text-gray-900">
                {totals.candidateVoteTotals[c.id] ?? 0}
              </td>
            ))}
            <td className="px-4 py-3 text-center text-gray-500">
              {totals.totalAbstentions}
            </td>
            <td className="px-4 py-3 text-center text-gray-900">
              {totals.totalVotes}/{totals.totalVoters}
            </td>
            <td className="px-4 py-3 text-center text-gray-900">
              {totals.totalVoters > 0
                ? ((totals.totalVotes / totals.totalVoters) * 100).toFixed(1)
                : '0.0'}
              %
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
