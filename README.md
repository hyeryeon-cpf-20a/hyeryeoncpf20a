# Spring Wedding · 모바일 청첩장

5월의 봄을 담은 모바일 청첩장 웹앱입니다. **하객용 청첩장**과 **관리자 편집 사이트**가 하나의 프로젝트에 들어 있습니다.

| 주소 | 용도 |
| --- | --- |
| `/invite/our-wedding` | 하객용 청첩장 (로그인 없음) |
| `/admin` | 신랑·신부 편집 사이트 (로그인 필요) |

- 기술: React 19 + TypeScript + Vite, Tailwind CSS v4, Framer Motion, Supabase (Postgres · Auth · Storage)
- 관리자가 **게시**하면 같은 하객 링크에 바로 반영돼요 (재배포 필요 없음).
- 백엔드가 연결되지 않으면 저장 기능을 흉내 내지 않아요. 하객 화면에는 "서버 미연결 데모" 배너가 뜨고, 관리자 화면에는 연결 방법이 안내돼요.

---

## 1. Supabase 준비 (약 10분)

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 만듭니다. 리전은 `Northeast Asia (Seoul)`을 추천해요.
2. **SQL Editor**에 `supabase/migrations/20261117000000_init.sql` 전체를 붙여 넣고 실행합니다.
   - 또는 CLI를 쓴다면: `npx supabase link --project-ref <ref>` 다음 `npx supabase db push`
   - 테이블, 보안 정책(RLS), 스토리지 버킷(`media`, `guest-photos`), 기본 청첩장(`our-wedding`)이 함께 만들어집니다.
3. **Authentication → Sign In / Providers → Email**
   - 가입 직후 바로 로그인하려면 *Confirm email*을 끄세요. 켜 두면 확인 메일의 링크를 누른 뒤 로그인할 수 있어요.
   - 두 분이 가입을 마치면 *Allow new users to sign up*을 꺼 두는 것을 권장합니다.
4. **Authentication → URL Configuration**의 *Site URL*에 배포 주소(예: `https://our-wedding.vercel.app`)를 넣습니다.
5. **Project Settings → API**에서 `Project URL`과 `Publishable key`(또는 `anon` key)를 복사합니다.

## 2. 배포 (Vercel 권장)

1. 이 저장소를 Vercel에 Import 합니다. 프레임워크는 Vite가 자동으로 인식돼요.
2. Environment Variables에 다음을 추가합니다.
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # 또는 anon key
   ```
3. 배포가 끝나면 `https://<도메인>/admin`에서 **관리자 계정 만들기**를 누릅니다.
   → 청첩장에 관리자가 아직 없으면 **처음 가입한 계정이 관리자**가 됩니다.
4. 배우자는 같은 방법으로 가입한 뒤, 먼저 가입한 사람이 **설정 → 관리자 추가**에서 이메일로 추가합니다.

`vercel.json`과 `api/invite.js`가 `/invite/:slug` 요청에 게시된 제목·설명·대표 이미지를 OG 태그로 넣어 줍니다. 그래서 카카오톡·문자 링크 미리보기가 관리자 설정대로 표시돼요. 다른 호스팅(Netlify 등)을 쓴다면 모든 경로를 `index.html`로 보내는 SPA 설정이 필요하고, 링크 미리보기는 `index.html`의 기본값으로 표시됩니다.

## 3. 사용 방법

**편집** (왼쪽 · 가운데 · 오른쪽 3단)
- 왼쪽: 페이지 목록입니다. 드래그로 순서를 바꾸고, 더블클릭해 이름을 바꾸고, 숨기기·복제·삭제·추가를 할 수 있어요. 봉투는 항상 첫 화면이에요.
- 가운데: 실제 모바일 크기 미리보기입니다 (Galaxy 360, iPhone SE 375, iPhone 393, Pro Max 430). 스크롤과 애니메이션이 그대로 동작하고, 미리보기에서 섹션을 누르면 오른쪽 편집 패널이 그 섹션으로 바뀌어요.
- 오른쪽: 내용(글·사진·계좌 등)과 스타일(여백·정렬·배경·글자 크기·애니메이션)을 수정합니다. 기본 정보에서 날짜·이름·색상·폰트·내비게이션을 바꿀 수 있어요.
- 자동저장(1.2초)과 임시저장(⌘/Ctrl+S), 실행 취소(⌘/Ctrl+Z)를 지원합니다. **게시하기**를 눌러야 하객 화면에 반영돼요.

**운영**
- 축하글: 작성 허용/목록 공개 스위치, 숨기기·삭제, 하객의 삭제 요청 확인 (게시 없이 즉시 적용)
- 하객 사진: 승인 후 공개(기본), 일괄 승인·비공개·삭제, 개별 다운로드와 ZIP 일괄 다운로드
- 공유 · 배포: 링크 복사, QR 코드 PNG, 카카오톡 공유, 문자 보내기, 링크 미리보기(제목·설명·대표 이미지)
- 버전 기록: 게시할 때마다 버전이 저장되고(최근 50개) 초안으로 불러오거나 바로 되돌릴 수 있어요. 게시 중지도 여기서 합니다.

**선택 설정 (카카오)**
- 카카오톡 공유: [developers.kakao.com](https://developers.kakao.com)에서 앱을 만들고, *플랫폼 → Web*에 사이트 도메인을 등록하세요. 그다음 JavaScript 키를 **공유 · 배포**에 입력합니다.
- 카카오 지도 미리보기: 같은 키를 **오시는 길 → 카카오맵 JavaScript 키**에 입력합니다. 비워 두면 OpenStreetMap 지도가 표시돼요. 카카오맵·네이버지도 열기 버튼은 키가 없어도 항상 동작합니다.

## 4. 보안 설계

- 하객(anon)은 테이블에 **직접 접근할 수 없어요**. 게시된 내용, 공개된 축하글, 승인된 사진만 전용 RPC 함수로 받습니다. 초안과 관리자 정보는 내려가지 않아요.
- 쓰기 권한(초안 저장, 게시, 계좌 정보, 축하글·사진 관리)은 `invitation_admins`에 등록된 계정만 갖고, Postgres RLS가 서버에서 검증합니다.
- 축하글 보호: 입력값 검증(이름 20자, 내용 500자), 숨김 입력칸(honeypot), 너무 빠른 제출 차단, 링크 개수 제한, 1시간 내 중복 글 차단을 적용합니다. 요청 횟수 제한은 IP당 10분 5회·하루 30회, 청첩장 전체 10분 200회예요. 비밀번호는 bcrypt로 해시해 저장합니다.
- 하객 사진: 비공개 버킷에 저장되고, 승인된 사진만 서명된 URL로 공개돼요. 형식(JPG/PNG/WEBP/HEIC)과 15MB 제한을 서버에서 확인하고, 개인정보 동의가 필수입니다.
- IP는 원문을 저장하지 않고 해시만 저장합니다.

## 5. 로컬 개발

```bash
npm install
npx supabase start          # Docker 필요
npx supabase db reset       # 마이그레이션 적용
cp .env.example .env.local  # API URL / anon key 를 supabase status 값으로 채우기
npm run dev                 # http://localhost:5173/admin
```

## 구조

```
src/invite/        하객용 청첩장 (봉투, 10개 섹션, 내비게이션, 라이트박스)
src/admin/         관리자 편집기 (페이지 목록, 인스펙터, 미리보기, 관리 패널)
src/lib/           콘텐츠 모델·기본값·API·날짜·이미지 처리
supabase/          DB 스키마 · RLS · RPC · 스토리지 정책
api/invite.js      링크 미리보기(OG)용 Vercel 함수
```
