'use client';

import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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

        <h1 className="mb-8 text-2xl font-bold text-gray-900">이용약관</h1>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제1조 (목적)
            </h2>
            <p>
              이 약관은 우리한표(이하 &quot;서비스&quot;)의 이용에 관한 조건 및
              절차, 서비스 제공자와 이용자의 권리, 의무 및 책임사항을 규정함을
              목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제2조 (서비스의 내용)
            </h2>
            <p>서비스는 다음의 기능을 제공합니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>학교 내 선거(학생회장 선거, 학급 대표 선거 등) 전자투표</li>
              <li>투표 코드 생성 및 배포</li>
              <li>실시간 투표 현황 및 결과 집계</li>
              <li>해시 체인 기반 투표 무결성 검증</li>
              <li>투표 데이터 암호화 및 비밀투표 보장</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제3조 (이용자의 의무)
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                관리자(교사)는 서비스 이용 전 학부모에게 개인정보 처리에 대한
                동의를 받아야 합니다.
              </li>
              <li>
                관리자는 투표 코드를 안전하게 관리하고, 유권자 외의 사람에게
                코드가 유출되지 않도록 해야 합니다.
              </li>
              <li>
                이용자는 타인의 투표 코드를 사용하거나, 부정한 방법으로 투표에
                참여해서는 안 됩니다.
              </li>
              <li>
                이용자는 서비스의 정상적인 운영을 방해하는 행위를 해서는 안
                됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제4조 (서비스 제공자의 의무)
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                서비스 제공자는 투표 데이터의 보안을 위해 합리적인 기술적 조치를
                취합니다.
              </li>
              <li>
                서비스 제공자는 개인정보보호법에 따라 이용자의 개인정보를
                보호합니다.
              </li>
              <li>
                서비스 제공자는 서비스의 안정적 운영을 위해 노력합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제5조 (면책 조항)
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                본 서비스는 무료로 제공되며, 서비스 제공자는 서비스의 중단,
                장애, 데이터 손실 등에 대하여 법률이 허용하는 범위 내에서 책임을
                지지 않습니다.
              </li>
              <li>
                천재지변, 시스템 장애, 네트워크 문제 등 불가항력적인 사유로 인한
                서비스 중단에 대해 책임을 지지 않습니다.
              </li>
              <li>
                이용자의 귀책사유(투표 코드 유출, 부정 사용 등)로 발생한 문제에
                대해 서비스 제공자는 책임을 지지 않습니다.
              </li>
              <li>
                서비스 제공자는 서비스 이용 수준(SLA)을 보장하지 않습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제6조 (서비스의 변경 및 중단)
            </h2>
            <p>
              서비스 제공자는 운영상의 필요에 따라 서비스의 전부 또는 일부를
              변경하거나 중단할 수 있으며, 이 경우 사전에 웹사이트를 통해
              공지합니다. 다만, 긴급한 사유가 있는 경우 사후에 공지할 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제7조 (지적재산권)
            </h2>
            <p>
              서비스의 소프트웨어, 디자인, 로고 등 지적재산권은 서비스
              제공자에게 귀속됩니다. 이용자가 입력한 데이터(후보자 정보, 투표
              데이터 등)의 권리는 해당 학교에 귀속됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제8조 (분쟁 해결)
            </h2>
            <p>
              서비스 이용과 관련하여 분쟁이 발생한 경우, 서비스 제공자와
              이용자는 상호 협의하여 해결하도록 노력합니다. 협의가 이루어지지
              않을 경우, 관련 법령에 따른 관할 법원에서 해결합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              제9조 (약관의 변경)
            </h2>
            <p>
              이 약관은 2026년 2월 15일부터 적용됩니다. 서비스 제공자는 약관을
              변경할 수 있으며, 변경 시 웹사이트를 통해 공지합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
