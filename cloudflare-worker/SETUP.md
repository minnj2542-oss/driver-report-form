# Cloudflare Worker 프록시 설정 (회사 네트워크 우회용)

회사 네트워크가 `script.google.com`을 막고 있어서, 그 앞에 무료 중계 서버를 하나 두는 설정입니다.
로그인이 필요한 단계라 직접 진행해주셔야 해요.

## 1. Cloudflare 계정 생성 + Worker 만들기
1. https://dash.cloudflare.com/sign-up 접속해서 무료 계정 생성 (이메일만 있으면 됨)
2. 로그인 후 왼쪽 메뉴에서 **"Workers 및 Pages"** 클릭
3. **"Worker 생성"**(Create Worker) 클릭
4. 이름은 아무거나 (예: `driver-report-proxy`) 입력하고 **"배포"**(Deploy) 클릭 (일단 기본 예제 코드로 배포됨)

## 2. 코드 교체
1. 방금 만든 Worker 페이지에서 **"코드 편집"**(Edit code) 클릭
2. 기본으로 들어있는 코드를 전부 지우고, 이 폴더의 `worker.js` 내용을 그대로 붙여넣기
3. 오른쪽 위 **"배포"**(Deploy) 클릭

## 3. 주소 확인
1. Worker 페이지 상단에 `https://driver-report-proxy.<본인계정>.workers.dev` 같은 형태의 주소가 보일 거예요
2. 이 주소를 복사해서 저한테 알려주시면, 제가 `index.html` / `dashboard.html` / 크롬 확장프로그램 안의 `APPS_SCRIPT_URL`을 전부 이 주소로 교체해드릴게요

## 4. 확인
- 회사 노트북에서 대시보드를 다시 열고, 데이터가 정상적으로 뜨는지 확인
- 안 되면 F12 콘솔 오류를 다시 캡처해서 보내주세요 (이번엔 어떤 오류인지에 따라 원인이 또 달라질 수 있어요)
