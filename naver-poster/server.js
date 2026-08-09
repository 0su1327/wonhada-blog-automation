const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '50mb' })); // 사진(base64)이 포함되므로 용량 여유 있게

const NAVER_BLOG_ID = 'YOUR_NAVER_ID'; // ⚠️ 본인 네이버 블로그 아이디로 교체
const SESSION_PATH = '/data/naver-session.json';

app.post('/post', async (req, res) => {
  const { title, hook, body, footer, photos } = req.body;

  if (!fs.existsSync(SESSION_PATH)) {
    return res.status(500).json({ error: '로그인 세션이 없습니다. login-capture.js를 먼저 실행하세요.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    // 네이버 블로그 글쓰기 화면으로 이동
    await page.goto(`https://blog.naver.com/${NAVER_BLOG_ID}?Redirect=Write`);
    await page.waitForTimeout(3000);

    // 세션이 만료되면 네이버가 로그인 화면(nid.naver.com)으로 자동으로 튕겨냅니다.
    // 이걸 명확히 감지해서, 애매한 선택자 오류 대신 정확한 원인을 알려줍니다.
    if (page.url().includes('nid.naver.com')) {
      await browser.close();
      return res.status(401).json({
        error: '네이버 로그인 세션이 만료되었습니다. login-capture.js를 다시 실행해서 로그인해주세요.'
      });
    }

    // 실제 화면 구조 확인 결과, 스마트에디터는 iframe이 아니라 메인 문서 안에 바로 있습니다.
    // (일반적으로 알려진 정보와 달라서, 실제 확인 없이는 틀리기 쉬운 부분이었습니다.)

    // 이전에 쓰던 글이 있으면 뜨는 팝업 처리 (있을 때만) — 아직 실제 확인 전 추정값
    const popupCancelBtn = page.locator('button.se-popup-button-cancel');
    if (await popupCancelBtn.count() > 0) {
      await popupCancelBtn.click();
      await page.waitForTimeout(1000);
    }

    // 1. 제목 입력 — 실제 화면 구조로 확인됨 (se-title-text 계열은 네이버가 직접 부여한
    // 의미 있는 class라 해시값 class보다 안정적입니다)
    const titleArea = page.locator('.se-title-text .se-text-paragraph');
    await titleArea.click();
    await page.keyboard.type(title, { delay: 30 });

    // 2. 본문 영역으로 이동
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // 3. 도입부(hook) 입력
    await page.keyboard.type(hook, { delay: 20 });
    await page.keyboard.press('Enter');

    // 4. 본문을 [사진 N] 기준으로 나눠서, 텍스트 입력 → 사진 삽입을 반복
    const segments = body.split(/\[사진\s*(\d+)\]/);
    for (let i = 0; i < segments.length; i++) {
      if (i % 2 === 0) {
        if (segments[i].trim()) {
          await page.keyboard.type(segments[i].trim(), { delay: 15 });
          await page.keyboard.press('Enter');
        }
      } else {
        const photoOrder = parseInt(segments[i], 10);
        const photo = (photos || []).find(p => p.order === photoOrder);
        if (photo) {
          await insertPhoto(page, photo.imageData);
        }
      }
    }

    // 5. 마무리(CTA + 고정 안내 문구 + 해시태그)
    if (footer) {
      await page.keyboard.type(footer, { delay: 15 });
    }

    await page.waitForTimeout(1000);

    // 6. "저장" 버튼 클릭 (= 임시저장). 화면에 보이는 글자는 "저장"이지만,
    // 이 버튼을 누르면 "임시저장된 글" 목록에 쌓이는 걸로 확인됐습니다(발행 버튼과는 다른 영역).
    // 해시값 class(save_btn__...) 대신, 잘 안 바뀌는 data-click-area 속성으로 찾습니다.
    const saveDraftBtn = page.locator('button[data-click-area="tpb.save"]');
    await saveDraftBtn.click();
    await page.waitForTimeout(2000);

    await browser.close();
    res.json({ success: true });
  } catch (err) {
    if (browser) await browser.close();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// base64 이미지를 임시 파일로 저장 후, 네이버 에디터의 사진 업로드 버튼을 통해 삽입
async function insertPhoto(page, dataURL) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataURL || '');
  if (!match) return;
  const ext = match[1].split('/')[1];
  const buffer = Buffer.from(match[2], 'base64');
  const tmpPath = `/tmp/photo-${Date.now()}.${ext}`;
  fs.writeFileSync(tmpPath, buffer);

  // ✅ 실제 화면에서 확인된 값입니다. data-name="image" 속성이 가장 안정적이라 우선 사용하고,
  // 혹시 안 먹히면 se-image-toolbar-button class로 한 번 더 시도합니다.
  const photoBtn = page.locator('button[data-name="image"], button.se-image-toolbar-button');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    photoBtn.first().click()
  ]);
  await fileChooser.setFiles(tmpPath);
  await page.waitForTimeout(2000); // 업로드 완료 대기

  fs.unlinkSync(tmpPath);
}

const PORT = 4000;
app.listen(PORT, () => console.log(`naver-poster listening on ${PORT}`));
