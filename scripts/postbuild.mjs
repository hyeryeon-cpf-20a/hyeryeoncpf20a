// 빌드된 dist/index.html 을 dist/app.html 로 바꿉니다.
// Vercel 은 실제 파일이 있으면 rewrite 보다 파일을 먼저 보내므로, index.html 이 남아 있으면
// 기본 주소(/)가 링크 미리보기용 함수(api/invite)를 거치지 않아 카카오톡 미리보기가 바뀌지 않습니다.
import { renameSync, existsSync } from 'node:fs'

if (existsSync('dist/index.html')) {
  renameSync('dist/index.html', 'dist/app.html')
  console.log('postbuild: dist/index.html → dist/app.html')
}
