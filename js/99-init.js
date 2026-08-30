// ===== INIT (boot — must run last) =====
async function bootApp() {
  try {
    await bootstrapAccounts();
    if (activeProfileId) Tutorial.maybeAutoOpen();
  } catch (e) {
    console.warn('bootApp', e);
  }
}

// UI / meta
initProfiles();
initDifficulty();
Feedback.init();
Achievements.init();
Characters.init();
PermHub.init();
ScreenUI.init();
Tutorial.init();
Sfx.init();

// Gameplay
initRenderCache();
initDebugMode();
if (isTouchDevice()) layoutMobileViewport();
updateLivesUI();
updateGaugeUI();

// Boot
bootApp();
gameLoop();
