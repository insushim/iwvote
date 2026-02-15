'use client';

import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </a>

        <h1 className="mb-8 text-2xl font-bold text-gray-900">개인정보처리방침</h1>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              1. 개인정보의 처리 목적
            </h2>
            <p>
              우리한표(이하 &quot;서비스&quot;)는 초등학교 학생회 선거 등 학교 내 투표를 안전하고
              공정하게 진행하기 위한 전자투표 시스템입니다. 다음의 목적으로 개인정보를
              처리합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>투표 자격 확인 및 중복 투표 방지</li>
              <li>투표 결과 집계 및 통계 제공</li>
              <li>투표 무결성 검증 (해시 체인)</li>
              <li>관리자(교사) 인증 및 선거 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              2. 처리하는 개인정보 항목
            </h2>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">구분</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">항목</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">목적</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">유권자</td>
                  <td className="border border-gray-300 px-3 py-2">
                    학년, 반 (투표코드에 연결)
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    투표 자격 확인 및 반별 통계
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">후보자</td>
                  <td className="border border-gray-300 px-3 py-2">
                    성명, 학년, 반, 사진, 공약
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    후보자 정보 안내
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">관리자(교사)</td>
                  <td className="border border-gray-300 px-3 py-2">
                    이메일, 표시이름, 학교명
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    관리자 인증 및 권한 관리
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              * 투표 내용(누구에게 투표했는지)은 AES-256으로 암호화되어 저장되며,
              관리자도 개별 투표 내용을 확인할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              3. 개인정보의 처리 및 보유 기간
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>투표 코드:</strong> 선거 결과 확정 후 7일 이내 파기
              </li>
              <li>
                <strong>투표 기록:</strong> 선거 결과 확정 후 30일 이내 파기
              </li>
              <li>
                <strong>후보자 정보:</strong> 선거 결과 확정 후 30일 이내 파기
              </li>
              <li>
                <strong>감사 로그:</strong> 관련 법령에 따라 1년간 보관 후 파기
              </li>
              <li>
                <strong>관리자 정보:</strong> 계정 삭제 요청 시 지체 없이 파기
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              4. 만 14세 미만 아동의 개인정보 보호
            </h2>
            <p>
              본 서비스는 초등학생(만 14세 미만 아동)을 대상으로 하며,
              개인정보 보호법 제22조의2에 따라 법정대리인(부모 또는 보호자)의 동의가
              필요합니다. 학교는 본 서비스 사용 전 학부모에게 가정통신문 등을 통해
              개인정보 처리에 대한 동의를 받아야 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              5. 개인정보의 안전성 확보 조치
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>투표 내용 AES-256-CBC 암호화</li>
              <li>투표 코드 HMAC-SHA256 해싱</li>
              <li>해시 체인을 통한 투표 무결성 검증</li>
              <li>HTTPS(TLS) 통신 암호화</li>
              <li>Firebase 인증을 통한 관리자 접근 제어</li>
              <li>보안 헤더 적용 (HSTS, X-Frame-Options 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              6. 개인정보의 파기 절차 및 방법
            </h2>
            <p>
              선거가 종료되고 결과가 확정된 후, 관리자는 &quot;데이터 파기&quot; 기능을 통해
              개인정보를 안전하게 삭제할 수 있습니다. 전자적 파일 형태의 개인정보는
              기술적 방법을 사용하여 복구 불가능하도록 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              7. 정보주체의 권리
            </h2>
            <p>
              정보주체(또는 법정대리인)는 언제든지 다음의 권리를 행사할 수 있습니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>개인정보 처리에 대한 동의 철회</li>
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정/삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 학교 관리자(담당 교사)에게 요청하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              8. 개인정보의 국외 이전
            </h2>
            <p>
              본 서비스는 Google LLC가 제공하는 Firebase(Google Cloud) 인프라를
              사용하며, 이에 따라 개인정보가 해외로 이전될 수 있습니다.
            </p>
            <table className="mt-3 w-full border-collapse border border-gray-300 text-xs">
              <tbody>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    이전받는 자
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Google LLC
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    이전 국가
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    미국 (또는 Google Cloud 리전 소재지)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    이전 목적
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    클라우드 인프라 제공 (데이터 저장, 사용자 인증, 서버리스 함수 실행)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    이전 항목
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    관리자 이메일, 표시이름, 투표 데이터(암호화됨), 해시 체인 데이터
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    이전 방법
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Firebase SDK를 통한 TLS 암호화 통신
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    보유 기간
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    제3조(처리 및 보유 기간)에 따름
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                    연락처
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Google Korea LLC (privacy.google.com)
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              * Google Cloud는 SOC 2, ISO 27001 등 국제 보안 인증을 취득하고 있으며,
              한국 개인정보보호법(PIPA) 준수를 위한 데이터 처리 조건을 제공합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              9. 개인정보 보호책임자
            </h2>
            <p>
              본 서비스의 개인정보 보호에 관한 문의는 각 학교의 선거 담당
              관리자(교사)에게 연락해 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              10. 개인정보처리방침의 변경
            </h2>
            <p>
              이 개인정보처리방침은 2026년 2월 15일부터 적용됩니다.
              변경 시 웹사이트를 통해 공지합니다.
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-600">변경 이력</p>
              <ul className="mt-1 text-xs text-gray-500">
                <li>2026.02.15 - 개인정보 국외이전 조항 추가 (제8조)</li>
                <li>2026.02.14 - 최초 제정</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
