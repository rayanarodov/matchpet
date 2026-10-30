const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const artDir = 'C:\\Users\\usuario\\.gemini\\antigravity\\brain\\4b232b0a-fd37-4052-81e8-ef8d36a07f88';
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function capture(url, outName, width, height) {
  const tempPath = path.resolve(outName);
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

  // 1. Desktop Pet Cards
  console.log('1. Capturing Desktop Pet Cards...');
  const deskCardsHtml = originalHtml.replace('</head>', `<style>
    .quiz-hero-bg-section { margin-top: -300px !important; }
  </style></head>`);
  fs.writeFileSync('temp_desk_cards.html', deskCardsHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_desk_cards.html').replace(/\\/g, '/'), 'screenshot_desktop_colorful_pet_cards.png', 1280, 950);
  if (fs.existsSync('temp_desk_cards.html')) fs.unlinkSync('temp_desk_cards.html');

  // 2. Mobile Pet Cards
  console.log('2. Capturing Mobile Pet Cards...');
  const mobCardsHtml = originalHtml.replace('</head>', `<style>
    .quiz-hero-bg-section { display: none !important; }
    #live-activity-ticker { display: none !important; }
  </style></head>`);
  fs.writeFileSync('temp_mob_cards.html', mobCardsHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_mob_cards.html').replace(/\\/g, '/'), 'screenshot_mobile_colorful_pet_cards.png', 390, 844);
  if (fs.existsSync('temp_mob_cards.html')) fs.unlinkSync('temp_mob_cards.html');

  // 3. Pet Profile Modal (Open with Tobi or Luna)
  console.log('3. Capturing Pet Profile Modal (Top & Metrics)...');
  const modalHtml = originalHtml.replace('</body>', `<script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        const pet = (window.DEFAULT_ANIMALS && window.DEFAULT_ANIMALS[0]) || { id: "1", nome: "Tobi" };
        if (typeof openPetModal === 'function') {
          openPetModal(pet);
        }
      }, 300);
    });
  </script></body>`);
  fs.writeFileSync('temp_modal.html', modalHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_modal.html').replace(/\\/g, '/'), 'screenshot_pet_profile_modal_top.png', 1280, 1050);

  // 4. Pet Profile Modal Scrolled down (Compatibility, Story, Medical, Actions)
  console.log('4. Capturing Pet Profile Modal (Lower section)...');
  const modalScrolledHtml = originalHtml.replace('</head>', `<style>
    #pet-modal .modal-content {
      transform: translateY(-380px) !important;
    }
  </style></head>`).replace('</body>', `<script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        const pet = (window.DEFAULT_ANIMALS && window.DEFAULT_ANIMALS[0]) || { id: "1", nome: "Tobi" };
        if (typeof openPetModal === 'function') {
          openPetModal(pet);
        }
      }, 300);
    });
  </script></body>`);
  fs.writeFileSync('temp_modal_scrolled.html', modalScrolledHtml, 'utf8');
  await capture('file:///' + path.resolve('temp_modal_scrolled.html').replace(/\\/g, '/'), 'screenshot_pet_profile_modal_bottom.png', 1280, 1050);

  // Clean up
  if (fs.existsSync('temp_modal.html')) fs.unlinkSync('temp_modal.html');
  if (fs.existsSync('temp_modal_scrolled.html')) fs.unlinkSync('temp_modal_scrolled.html');

  console.log('All verification captures completed!');
}

run().catch(console.error);
