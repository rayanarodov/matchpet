const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const artDir = 'C:\\Users\\usuario\\.gemini\\antigravity\\brain\\4b232b0a-fd37-4052-81e8-ef8d36a07f88';
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function capture(url, outName, width, height) {
  const tempPath = `C:\\Users\\usuario\\${outName}`;
  await new Promise(resolve => {
    const p = spawn(edge, [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${width},${height}`,
      `--screenshot=${tempPath}`,
      url
    ]);
    p.on('exit', resolve);
  });
  if (fs.existsSync(tempPath)) {
    fs.copyFileSync(tempPath, path.join(artDir, outName));
    console.log(`Generated and copied ${outName}`);
  }
}

async function run() {
  const originalHtml = fs.readFileSync('index.html', 'utf8');

  // 1. Desktop Filters & Header View
  console.log('1. Capturing Desktop Filters view...');
  await capture('file:///' + path.resolve('index.html').replace(/\\/g, '/'), 'screenshot_desktop_filters.png', 1280, 850);

  // 2. Desktop Cards View (scrolled into cards)
  console.log('2. Capturing Desktop Cards view...');
  const deskCardsHtml = originalHtml.replace('</head>', `<style>
    .quiz-hero-bg-section { margin-top: -260px !important; }
  </style></head>`);
  fs.writeFileSync('temp_desk_cards.html', deskCardsHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_desk_cards.html').replace(/\\/g, '/'), 'screenshot_desktop_restored_cards.png', 1280, 850);
  if (fs.existsSync('temp_desk_cards.html')) fs.unlinkSync('temp_desk_cards.html');

  // 3. Mobile Overview (Quiz + Filters)
  console.log('3. Capturing Mobile Overview...');
  await capture('file:///' + path.resolve('index.html').replace(/\\/g, '/'), 'screenshot_mobile_header_quiz.png', 390, 844);

  // 4. Mobile Cards View (showing card photo with overlaid badges and clean mobile card)
  console.log('4. Capturing Mobile Cards view...');
  const mobCardsHtml = originalHtml.replace('</head>', `<style>
    .quiz-hero-bg-section { display: none !important; }
    #live-activity-ticker { display: none !important; }
  </style></head>`);
  fs.writeFileSync('temp_mob_cards.html', mobCardsHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_mob_cards.html').replace(/\\/g, '/'), 'screenshot_mobile_restored_cards.png', 390, 844);
  if (fs.existsSync('temp_mob_cards.html')) fs.unlinkSync('temp_mob_cards.html');

  console.log('All screenshots captured successfully!');
}

run();
