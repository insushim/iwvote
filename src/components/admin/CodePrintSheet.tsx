'use client';

import { useEffect, useState } from 'react';
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

function useQrDataUrls(codes: PrintCode[]) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (codes.length === 0) return;

    let cancelled = false;

    const generate = async () => {
      const QRCode = (await import('qrcode')).default;
      const map: Record<string, string> = {};

      for (const c of codes) {
        if (cancelled) return;
        const voteUrl = `${window.location.origin}/vote?code=${encodeURIComponent(c.code)}`;
        try {
          map[c.code] = await QRCode.toDataURL(voteUrl, {
            width: 120,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
        } catch {
          // skip failed QR
        }
      }

      if (!cancelled) {
        setQrMap(map);
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [codes]);

  return qrMap;
}

export function CodePrintSheet({ codes, electionTitle }: CodePrintSheetProps) {
  const qrMap = useQrDataUrls(codes);

  // Split codes into pages of 6 (2 columns x 3 rows) to fit QR codes
  const pages: PrintCode[][] = [];
  for (let i = 0; i < codes.length; i += 6) {
    pages.push(codes.slice(i, i + 6));
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
            grid-template-rows: repeat(3, 1fr);
            gap: 0;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          .print-card {
            border: 1px dashed #ccc;
            padding: 6mm 5mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .print-card-title {
            font-size: 9pt;
            font-weight: 600;
            color: #374151;
            text-align: center;
            margin-bottom: 2mm;
            line-height: 1.3;
          }

          .print-card-qr {
            width: 28mm;
            height: 28mm;
            margin-bottom: 2mm;
          }

          .print-card-qr img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .print-card-code {
            font-size: 22pt;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            letter-spacing: 3pt;
            color: #111827;
            margin-bottom: 2mm;
            background: #f3f4f6;
            padding: 2mm 5mm;
            border-radius: 2mm;
          }

          .print-card-info {
            font-size: 8pt;
            color: #6b7280;
            text-align: center;
            margin-bottom: 2mm;
          }

          .print-card-instructions {
            font-size: 7pt;
            color: #9ca3af;
            text-align: center;
            line-height: 1.3;
            border-top: 1px solid #e5e7eb;
            padding-top: 2mm;
            width: 100%;
          }

          .print-card-badge {
            position: absolute;
            top: 2mm;
            right: 3mm;
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
              {qrMap[codeItem.code] && (
                <div className="print-card-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrMap[codeItem.code]} alt="QR" />
                </div>
              )}
              <div className="print-card-code">{codeItem.code}</div>
              <div className="print-card-info">
                {classIdToLabel(codeItem.classId)} / {codeItem.studentNumber}번
              </div>
              <div className="print-card-instructions">
                QR 코드를 스캔하거나 코드를 입력하세요.
                <br />
                본 투표코드는 1회만 사용 가능합니다.
                <br />
                타인에게 코드를 보여주거나 공유하지 마세요.
              </div>
            </div>
          ))}
          {/* Fill remaining slots with empty cards for layout consistency */}
          {Array.from({ length: 6 - pageCodes.length }).map((_, emptyIndex) => (
            <div key={`empty-${emptyIndex}`} className="print-card" style={{ opacity: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
