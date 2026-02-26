<p align="center">
  <img src="public/icons/icon-192x192.png" alt="우리한표 로고" width="120" />
</p>

<h1 align="center">우리한표</h1>

<p align="center">
  <strong>소중한 한 표, 투명한 결과</strong><br/>
  초등학교 학생회장 선거를 위한 전자투표 시스템
</p>

<p align="center">
  <a href="https://english-class-e059f.web.app">라이브 데모</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-주요-기능">기능 소개</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-기술-스택">기술 스택</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-보안-아키텍처">보안</a>
</p>

---

## 프로젝트 소개

매년 초등학교에서는 학생회장 선거가 진행됩니다. 대부분의 학교에서는 종이 투표용지를 사용하여 투표하고, 교사들이 직접 개표하고 있습니다.

**우리한표**는 이 과정을 안전하고 투명한 전자투표로 대체합니다.

### 기존 종이투표의 문제점

| 문제 | 우리한표의 해결 |
|------|---------------|
| 투표용지 인쇄, 투표함 준비 등 준비에 많은 시간 소요 | QR 코드 출력 한 장이면 끝 |
| 수작업 개표에 1~2시간 소요 | 투표 종료 즉시 자동 집계 |
| 개표 과정의 실수 가능성 | 서버사이드 암호화 + 자동 집계로 오류 제로 |
| 투표 결과의 투명성 검증 어려움 | 해시체인으로 투표 무결성 수학적 증명 |
| 투표 용지 보관 및 폐기 부담 | 디지털 처리, 선거 후 자동 파기 가능 |

### 한눈에 보는 투표 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  선생님이    │     │  학생이      │     │  서버에서    │     │  투표 완료   │
│  투표 코드   │ ──▶ │  QR 스캔     │ ──▶ │  암호화 후   │ ──▶ │  영수증 발급 │
│  출력/배포   │     │  또는 입력   │     │  해시체인 저장│     │  (해시값)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 주요 기능

### 학생 (투표자)

- **QR 스캔 투표** - 선생님이 배부한 종이의 QR 코드를 스캔하면 바로 투표 화면으로
- **코드 직접 입력** - QR이 안 되면 6자리 코드를 직접 입력
- **투표 영수증** - 투표 후 해시값이 적힌 영수증 확인 (내 투표가 반영되었는지 검증 가능)
- **직관적인 UI** - 초등학생도 쉽게 사용할 수 있는 큰 글씨, 큰 버튼, 애니메이션

### 선생님 (관리자)

- **선거 생성** - 전교 회장 / 반 회장 / 커스텀 선거 유형 지원
- **후보자 등록** - 이름, 사진, 공약(최대 5개), 슬로건 입력
- **투표 코드 발급** - 반별로 투표 코드 자동 생성, QR 포함 출력용 시트 제공
- **실시간 모니터링** - 반별 투표 현황을 실시간으로 확인
- **자동 개표** - 투표 종료 즉시 결과 확인 (도넛 차트 + 반별 상세표)
- **감사 추적** - 모든 관리 행위가 감사 로그에 기록
- **해시체인 검증** - 버튼 하나로 전체 투표의 무결성 검증
- **결과 인쇄** - 결과를 PDF로 인쇄하여 공식 기록

### 학교 관리

- **멀티테넌트** - 학교별 데이터 완전 격리, 여러 학교가 동시 사용 가능
- **가입 코드** - 8자리 코드로 같은 학교 선생님 합류
- **권한 관리** - 관리자 승인제, 슈퍼관리자 역할 분리

---

## 보안 아키텍처

학교 선거라 해도 투표의 신뢰성은 핵심입니다. 우리한표는 실제 선거 시스템에 사용되는 보안 기술을 적용했습니다.

### 투표 비밀 보장 (서버사이드 암호화)

```
학생이 후보 선택
       │
       ▼
┌──────────────────┐
│  Cloud Function  │
│  AES-256-CBC     │  ← 암호화 키는 서버에만 존재
│  암호화          │     클라이언트는 절대 알 수 없음
└──────────────────┘
       │
       ▼
  Firestore에 암호화된 투표 저장
  (누가 누구를 찍었는지 DB를 봐도 알 수 없음)
```

### 투표 무결성 검증 (해시체인)

블록체인과 동일한 원리로 투표의 위변조를 수학적으로 증명합니다.

```
Block 0 (Genesis)     Block 1              Block 2
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ prevHash: "0"   │   │ prevHash: hash0 │   │ prevHash: hash1 │
│ voteHash: ...   │──▶│ voteHash: ...   │──▶│ voteHash: ...   │──▶ ...
│ blockHash: hash0│   │ blockHash: hash1│   │ blockHash: hash2│
└─────────────────┘   └─────────────────┘   └─────────────────┘

※ 중간에 하나라도 변조되면 이후 모든 해시가 불일치 → 즉시 감지
```

### 보안 요약

| 보안 항목 | 구현 방식 |
|-----------|-----------|
| 투표 비밀 보장 | AES-256-CBC 서버사이드 암호화 |
| 투표 무결성 | SHA-256 해시체인 (블록체인 원리) |
| 코드 보안 | HMAC-SHA256 해싱 (평문 코드 서버에 미저장) |
| API 보호 | IP 기반 요청 속도 제한 (Rate Limiting) |
| 데이터 격리 | 학교별 멀티테넌트 (schoolId 기반) |
| 접근 제어 | Firestore 보안 규칙 + 역할 기반 권한 |
| 개인정보 보호 | 선거 종료 후 데이터 파기 기능 (개인정보보호법 준수) |

---

## 기술 스택

### 프론트엔드

| 기술 | 용도 |
|------|------|
| **Next.js 16** | React 프레임워크 (App Router, Static Export) |
| **TypeScript** | 타입 안전성 |
| **Tailwind CSS v4** | 유틸리티 기반 스타일링 |
| **Framer Motion** | 애니메이션 (투표 완료 폭죽, 페이지 전환) |
| **Recharts** | 결과 시각화 (도넛 차트, 바 차트) |
| **html5-qrcode** | QR 코드 스캐너 |

### 백엔드

| 기술 | 용도 |
|------|------|
| **Firebase Auth** | 관리자 인증 (이메일/비밀번호) |
| **Cloud Firestore** | NoSQL 데이터베이스 (7개 컬렉션, 14개 복합 인덱스) |
| **Cloud Functions** | 서버리스 백엔드 (투표 처리, 암호화, 해시체인) |
| **Firebase Hosting** | 정적 호스팅 + CDN |
| **Cloudflare Pages** | 이중 호스팅 (고가용성) |

### 인프라

| 기술 | 용도 |
|------|------|
| **GitHub Actions** | CI/CD 자동 배포 (push → 빌드 → Firebase + Cloudflare 동시 배포) |
| **PWA** | 앱 설치 없이 모바일 홈 화면에 추가 가능 |

---

## 시스템 아키텍처

```
                         ┌─────────────────────────────┐
                         │        사용자 (브라우저)       │
                         │   학생: QR/코드 → 투표        │
                         │   선생님: 선거 관리/결과 확인   │
                         └──────────┬──────────────────┘
                                    │
                         ┌──────────▼──────────────────┐
                         │     Next.js Static Site      │
                         │    (Firebase Hosting + CDN)   │
                         └──────────┬──────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
           │  Cloud         │ │  Firestore  │ │  Firebase   │
           │  Functions     │ │  Database   │ │  Auth       │
           │                │ │             │ │             │
           │ - 투표 처리    │ │ - elections │ │ - 관리자    │
           │ - AES 암호화   │ │ - votes     │ │   로그인    │
           │ - 해시체인 생성│ │ - hashChain │ │             │
           │ - 코드 검증    │ │ - users     │ │             │
           │ - 결과 복호화  │ │ - auditLogs │ │             │
           └───────────────┘ └────────────┘ └─────────────┘
```

---

## 데이터 모델

```
schools (학교)
  ├── name, grades, classesPerGrade, joinCode
  └── adminIds[]

elections (선거)
  ├── title, type, status, targetClasses[]
  ├── candidates[] (이름, 사진, 공약, 슬로건)
  ├── settings (기권 허용, 실시간 집계, 후보 섞기 등)
  └── hashChainHead, totalVoters, totalVoted

votes (투표) — 암호화된 상태로 저장
  ├── encryptedVote (AES-256-CBC)
  ├── voteHash (영수증용)
  └── classId, timestamp

voterCodes (투표 코드) — 해시로만 저장
  ├── codeHash (HMAC-SHA256)
  ├── used, usedAt
  └── classId, studentNumber

hashChain (해시체인) — 투표 무결성 증명
  ├── index, voteHash, previousHash, blockHash
  └── 체인이 끊기면 변조 감지

auditLogs (감사 로그) — 모든 행위 기록
  └── action, actorId, details, timestamp
```

---

## 시작하기

### 사전 요구사항

- Node.js 22+
- Firebase 프로젝트 (Firestore + Auth + Functions)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/insushim/iwvote.git
cd iwvote

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local에 Firebase 설정값 입력

# 개발 서버 실행
npm run dev

# Cloud Functions 배포 (별도 터미널)
cd functions && npm install && npm run build
firebase deploy --only functions
```

### 환경변수

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 프로젝트 구조

```
iwvote/
├── src/
│   ├── app/                    # 페이지 (23개 라우트)
│   │   ├── vote/               #   투표 화면 (코드입력 → 투표 → 완료)
│   │   ├── admin/              #   관리자 대시보드
│   │   │   ├── elections/      #     선거 관리 (생성, 후보, 코드, 모니터, 결과, 감사)
│   │   │   ├── settings/       #     학교 설정
│   │   │   └── users/          #     사용자 관리
│   │   ├── privacy/            #   개인정보처리방침
│   │   └── terms/              #   이용약관
│   ├── components/             # UI 컴포넌트 (45+개)
│   │   ├── admin/              #   관리자용 (차트, 모니터, 코드생성 등)
│   │   ├── vote/               #   투표용 (투표용지, 후보카드, 영수증)
│   │   └── ui/                 #   공통 (Button, Card, Modal, Badge 등)
│   ├── hooks/                  # 커스텀 훅 (실시간 투표, 해시체인 등)
│   ├── lib/                    # Firebase, Firestore, 암호화 유틸
│   ├── types/                  # TypeScript 타입 정의
│   └── constants/              # 상수 (투표코드 설정, 라벨 등)
├── functions/                  # Cloud Functions (992줄)
│   └── src/index.ts            #   투표처리, 암호화, 해시체인, 코드검증
├── firestore.rules             # Firestore 보안 규칙 (104줄)
├── firestore.indexes.json      # 14개 복합 인덱스
├── firebase.json               # Firebase 호스팅 설정
├── .github/workflows/          # CI/CD 파이프라인
└── scripts/                    # 아이콘 생성 스크립트
```

---

## 바이브 코딩으로 만들었습니다

이 프로젝트는 **Claude Code**(Anthropic의 AI 코딩 에이전트)를 활용한 바이브 코딩으로 개발되었습니다.

### AI가 한 일

- 프론트엔드/백엔드 전체 코드 작성 (23개 페이지, 45+ 컴포넌트, Cloud Functions)
- AES-256 암호화 + SHA-256 해시체인 보안 아키텍처 설계 및 구현
- Firestore 보안 규칙 + 14개 복합 인덱스 설계
- GitHub Actions CI/CD 파이프라인 구성
- Playwright 기반 E2E 테스트 자동화
- 버그 탐지, 진단, 수정 (QR 중복 스캔, 캐시 문제, 권한 에러 등)

### 사람이 한 일

- 기능 기획 및 요구사항 정의
- UX 방향 결정 및 피드백
- Firebase/Cloudflare 인프라 설정
- 실제 환경 테스트 및 최종 검수

---

## 법적 준수

- **개인정보보호법** - 선거 종료 후 투표 데이터 파기 기능
- **아동 개인정보 보호** - 14세 미만 학생 투표 시 보호자 동의 절차
- 개인정보처리방침 및 이용약관 페이지 포함

---

<p align="center">
  <strong>우리한표</strong> — 소중한 한 표, 투명한 결과<br/>
  <sub>Made with Claude Code</sub>
</p>
