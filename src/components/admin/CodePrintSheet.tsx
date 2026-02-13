'use client';

import { classIdToLabel } from '@/lib/utils';

interface PrintCode {
  code: string;
  classId: string;
  studentNumber: number;
}

interface CodePrintSheetProps {
  codes: PrintCode[];
  electionTitle: string;
}

export function CodePrintSheet({ codes, electionTitle }: CodePrintSheetProps) {
  // Split codes into pages of 8 (2 columns x 4 rows)
  const pages: PrintCode[][] = [];
  for (let i = 0; i < codes.length; i += 8) {
    pages.push(codes.slice(i, i + 8));
  }

  return (
    <div className="print-sheet">
      <style jsx>{`
        @media screen {
          .print-sheet {
            display: none;
          }
        }

        @media print {
          .print-sheet {
            display: block;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          .print-page {
            width: 190mm;
            height: 267mm;
            page-break-after: always;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(4, 1fr);
            gap: 0;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          .print-card {
            border: 1px dashed #ccc;
            padding: 8mm 6mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .print-card-title {
            font-size: 10pt;
            font-weight: 600;
            color: #374151;
            text-align: center;
            margin-bottom: 4mm;
            line-height: 1.3;
          }

          .print-card-code {
            font-size: 28pt;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            letter-spacing: 3pt;
            color: #111827;
            margin-bottom: 4mm;
            background: #f3f4f6;
            padding: 3mm 6mm;
            border-radius: 2mm;
          }

          .print-card-info {
            font-size: 9pt;
            color: #6b7280;
            text-align: center;
            margin-bottom: 3mm;
          }

          .print-card-instructions {
            font-size: 7pt;
            color: #9ca3af;
            text-align: center;
            line-height: 1.4;
            border-top: 1px solid #e5e7eb;
            padding-top: 2mm;
            width: 100%;
          }

          .print-card-badge {
            position: absolute;
            top: 3mm;
            right: 4mm;
            font-size: 7pt;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 1mm 2mm;
            border-radius: 1mm;
          }
        }
      `}</style>

      {pages.map((pageCodes, pageIndex) => (
        <div key={pageIndex} className="print-page">
          {pageCodes.map((codeItem, cardIndex) => (
            <div key={cardIndex} className="print-card">
              <div className="print-card-badge">
                {classIdToLabel(codeItem.classId)} {codeItem.studentNumber}번
              </div>
              <div className="print-card-title">{electionTitle}</div>
              <div className="print-card-code">{codeItem.code}</div>
              <div className="print-card-info">
                {classIdToLabel(codeItem.classId)} / {codeItem.studentNumber}번
              </div>
              <div className="print-card-instructions">
                본 투표코드는 1회만 사용 가능합니다.
                <br />
                타인에게 코드를 보여주거나 공유하지 마세요.
                <br />
                투표 후 영수증 해시를 보관하세요.
              </div>
            </div>
          ))}
          {/* Fill remaining slots with empty cards for layout consistency */}
          {Array.from({ length: 8 - pageCodes.length }).map((_, emptyIndex) => (
            <div key={`empty-${emptyIndex}`} className="print-card" style={{ opacity: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
