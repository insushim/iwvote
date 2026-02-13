import { APP_NAME, APP_SLOGAN } from '@/constants';

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-blue-100 px-4 py-8">
      {/* Cloud decorations - pointer-events-none so they don't block clicks */}
      <svg
        className="pointer-events-none absolute left-[-40px] top-[10%] w-48 animate-[float_8s_ease-in-out_infinite] opacity-30"
        viewBox="0 0 200 80"
        fill="white"
      >
        <path d="M160 65H40c-22 0-40-14-40-32s18-32 40-32c2 0 4 0 6 .4C54 .4 66-4 80 4c10 6 16 16 18 26 4-2 8-3 12-3 18 0 32 12 34 28h16c12 0 22 8 22 18s-10 18-22 18z" />
      </svg>
      <svg
        className="pointer-events-none absolute right-[-20px] top-[25%] w-36 animate-[float_10s_ease-in-out_infinite_1s] opacity-30"
        viewBox="0 0 200 80"
        fill="white"
      >
        <path d="M160 65H40c-22 0-40-14-40-32s18-32 40-32c2 0 4 0 6 .4C54 .4 66-4 80 4c10 6 16 16 18 26 4-2 8-3 12-3 18 0 32 12 34 28h16c12 0 22 8 22 18s-10 18-22 18z" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-[20%] left-[10%] w-32 animate-[float_9s_ease-in-out_infinite_2s] opacity-30"
        viewBox="0 0 200 80"
        fill="white"
      >
        <path d="M160 65H40c-22 0-40-14-40-32s18-32 40-32c2 0 4 0 6 .4C54 .4 66-4 80 4c10 6 16 16 18 26 4-2 8-3 12-3 18 0 32 12 34 28h16c12 0 22 8 22 18s-10 18-22 18z" />
      </svg>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center animate-[fade-in_0.5s_ease-out]">
        {/* Logo + Slogan */}
        <div className="mb-10 text-center animate-[slide-up_0.5s_ease-out]">
          <div className="text-6xl">&#x1F5F3;&#xFE0F;</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-lg font-medium text-white/80 drop-shadow-sm">
            {APP_SLOGAN}
          </p>
        </div>

        {/* Vote Button - plain <a> tag for guaranteed navigation */}
        <a
          href="/vote/"
          className="block w-full animate-[slide-up_0.6s_ease-out] rounded-2xl bg-blue-600 p-5 shadow-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-3xl">
              &#x1F392;
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">투표하기</h2>
                <svg className="h-4 w-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </div>
              <p className="mt-0.5 text-sm text-blue-100">
                투표 코드를 준비해주세요!
              </p>
            </div>
            <svg className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Admin Button - plain <a> tag for guaranteed navigation */}
        <a
          href="/admin/login/"
          className="mt-4 block w-full animate-[slide-up_0.7s_ease-out] rounded-2xl border-2 border-blue-300 bg-white/90 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-3xl">
              &#x1F511;
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">관리자</h2>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                선생님 전용 관리 페이지
              </p>
            </div>
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-2 animate-[fade-in_1s_ease-out]">
          <div className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 backdrop-blur-sm">
            <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-xs font-medium text-blue-700">
              해시 체인 보안 적용
            </span>
          </div>
          <p className="text-xs text-white/60">
            &copy; 2026 {APP_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}
