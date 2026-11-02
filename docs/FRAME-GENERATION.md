# Frame Generation — implementation plan

## Product requirement

ANONYMOS PERFORMANCE must expose a Frame Generation module with 2x, 3x, 4x and Auto choices only when a compatible provider can actually apply them. The UI must distinguish rendered FPS from generated/output FPS and must never claim a multiplier is active unless the provider confirms it.

## Provider strategy

### AMD Fluid Motion Frames (AFMF)

- Detect Radeon hardware and installed AMD Software/driver version.
- Report eligibility from the documented GPU family, driver, Windows version, display mode and API requirements.
- AFMF is configured through AMD Software: Adrenalin Edition; do not pretend that a generic third-party toggle controls the driver.
- Provide a guided hand-off to the AMD application and re-check status where a reliable supported signal exists.
- AMD documents RX 6000 support in exclusive fullscreen and RX 7000 / supported Ryzen graphics for borderless support, with driver and API requirements. Revalidate requirements against current vendor documentation before release.

### Lossless Scaling (LSFG)

- Detect whether Lossless Scaling is installed; do not bundle or redistribute it.
- Offer an explicit launch/open action to the installed application and a setup guide.
- Only show provider-specific 2x/3x/4x controls if a documented, supported integration interface is available. Otherwise explain that the user must configure the provider itself.
- Do not edit undocumented settings files or inject DLLs into games.

### In-game SDK frame generation

- DLSS/FSR frame generation generally requires game-engine or game-vendor integration. It cannot be switched on universally by a generic external desktop app.
- Detect and explain capability when possible; do not claim to enable it globally.

## UX and measurement rules

- Label native/rendered FPS separately from generated/output FPS.
- Do not estimate generated FPS from a selected multiplier.
- Explain that frame generation consumes GPU resources and may increase latency or visual artifacts.
- Recommend a stable base frame rate; do not promise a fixed FPS gain.
- Save per-game preferences only for settings that the selected provider actually supports.
- FiveM/GTA V profiles must remain marked as compatibility-unverified until tested on real supported hardware and current game builds.

## Acceptance criteria

1. Provider and hardware detection produce explicit supported / unsupported / unknown states.
2. No provider action is reported successful without a verifiable result.
3. Unsupported GPUs receive an explanation, not a fake toggle.
4. 2x/3x/4x/Auto selections are shown only when the active provider supports them.
5. Native and generated FPS are sourced independently and visibly identified.
6. Changes are logged and reversible where the provider supports reversal.
