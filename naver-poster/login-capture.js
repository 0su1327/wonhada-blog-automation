// 최초 1회만 실행하는 스크립트입니다.
// 실행하면 브라우저 창이 뜨고, 거기서 직접 네이버에 로그인하면
// 그 로그인 상태(세션)를 파일로 저장해서 이후 자동화가 재사용합니다.
// 아이디/비밀번호를 코드에 저장하는 게 아니라, "이미 로그인된 상태" 자체를 저장하는 방식입니다.

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // 화면이 보여야 직접 로그인 가능
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://nid.naver.com/nidlogin.login');

  console.log('브라우저 창에서 네이버에 로그인해주세요.');
  console.log('로그인이 완료되면 이 터미널로 돌아와서 Enter를 눌러주세요.');

  // 터미널 입력을 기다림
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  // 로그인 직후, 실제로 나중에 자동화가 쓸 블로그 글쓰기 화면까지 한 번 방문해둡니다.
  // (혹시 블로그 서비스 전용으로 추가 설정되는 쿠키가 있을 경우를 대비한 안전장치)
  const naverId = process.argv[2];
  if (naverId) {
    console.log(`블로그 글쓰기 화면(${naverId})까지 확인차 방문합니다...`);
    await page.goto(`https://blog.naver.com/${naverId}/postwrite`);
    await page.waitForTimeout(3000);
  } else {
    console.log('(참고: "node login-capture.js 본인아이디"로 실행하면 블로그 화면까지 미리 방문해둘 수 있습니다)');
  }

  await context.storageState({ path: './naver-session.json' });
  console.log('로그인 세션이 저장되었습니다: ./naver-session.json');
  console.log('이제 다음 명령으로 이 파일을 컨테이너 안에 복사해주세요:');
  console.log('  docker compose cp naver-session.json naver-poster:/data/naver-session.json');

  await browser.close();
  process.exit(0);
})();
