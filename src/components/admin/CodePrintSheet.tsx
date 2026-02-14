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
    <div className="print-area hidden">
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
