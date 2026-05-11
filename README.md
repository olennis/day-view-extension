# Descle

Chrome 새 탭을 대체하는 glanceable 대시보드 확장 프로그램.  
오늘의 일정, 할 일, 북마크를 한 화면에서 확인한다.

## Features

- **Schedule** — Google Calendar 연동. 현재 진행 중/다음 일정 하이라이트, Google Meet 바로가기
- **Todo** — 우선순위(P0/P1/P2) 기반 할 일 관리, 완료율 인사이트
- **Bookmarks** — 브라우저 북마크 폴더 자동 탐색, 검색, 추가/삭제
- **Resizable columns** — 드래그로 3컬럼 비율 조정, localStorage에 저장
- **Dark mode** — system / light / dark 3-way 토글, OS preference 실시간 반영

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Chrome Extension (Manifest V3) |
| UI | React 19 + TypeScript |
| Build | Vite + @crxjs/vite-plugin |
| Styling | CSS custom properties (design tokens) |
| Storage | chrome.storage.local + localStorage |
| Auth | Chrome Identity API (OAuth2 → Google Calendar) |

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 (HMR)
npm run dev

# 프로덕션 빌드
npm run build
```

### Chrome에 로드

1. `chrome://extensions` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" → `dist/` 폴더 선택

## Project Structure

```
src/
├── App.tsx              # 메인 레이아웃, 컬럼 리사이즈, 테마 토글
├── index.tsx            # newtab entry
├── options-entry.tsx    # options page entry
├── Options.tsx          # 설정 페이지 (Quick Links 관리)
├── types.ts             # 공통 타입 정의
├── components/
│   ├── Schedule.tsx     # 캘린더 일정 패널
│   ├── TodoPanel.tsx    # 할 일 패널
│   └── QuickLinks.tsx   # 북마크 패널
���── hooks/
│   └── useChromeStorage.ts
├── services/
│   ├── storage.ts       # chrome.storage 래퍼
│   └── calendar.ts      # 일정 유틸 함수
└── styles/
    ├── tokens.css       # 디자인 토큰 (light + dark)
    └── layout.css       # 글로벌 레이아웃
```

## Permissions

| Permission | 용도 |
|------------|------|
| `identity` | Google OAuth2 로그인 |
| `storage` | 할 일, 일정 캐시, 설정 저장 |
| `alarms` | 백그라운드 캘린더 동기화 |
| `bookmarks` | 북마크 읽기/쓰기 |

## License

Private
