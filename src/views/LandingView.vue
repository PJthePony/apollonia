<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="landing dark-section">
    <div class="particles">
      <div class="particle" v-for="n in 15" :key="n"></div>
    </div>

    <nav class="landing-nav">
      <div class="nav-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </div>
      <span class="nav-brand">tanzillo.ai</span>
      <div class="nav-status">
        <div class="status-dot"></div>
        <span>Tending to family business</span>
      </div>
    </nav>

    <section class="hero">
      <div class="hero-content">
        <div class="hero-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </div>
        <span class="hero-eyebrow">Personal CRM</span>
        <h1 class="hero-headline">Apollonia</h1>
        <p class="hero-description">She remembers so <em>you don't have to.</em></p>
        <button class="sign-in-btn" @click="goToLogin">Open the door</button>
      </div>
      <div class="scroll-hint">
        <span>Scroll</span>
        <div class="scroll-line"></div>
      </div>
    </section>

    <footer class="landing-footer">
      <span class="footer-copy">&copy; 2026 tanzillo.ai</span>
      <div class="footer-links">
        <a href="https://tanzillo.ai/privacy.html" target="_blank">Privacy</a>
        <a href="https://tanzillo.ai/terms.html" target="_blank">Terms</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  background: var(--color-navy);
  color: var(--color-sage);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Pinstripe overlay — the stage scrim */
.dark-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(240, 245, 243, 0.015) 39px, rgba(240, 245, 243, 0.015) 40px);
  pointer-events: none;
  z-index: 0;
}

.landing > * { position: relative; z-index: 1; }

/* Ambient particles */
.particles { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.particle { position: absolute; width: 2px; height: 2px; background: rgba(212, 36, 111, 0.06); border-radius: 50%; animation: particleFloat linear infinite; }
.particle:nth-child(1)  { left: 5%;  top: 10%; animation-duration: 28s; }
.particle:nth-child(2)  { left: 15%; top: 80%; animation-duration: 22s; animation-delay: -4s;  width: 3px; height: 3px; background: rgba(13, 92, 82, 0.05); }
.particle:nth-child(3)  { left: 25%; top: 30%; animation-duration: 32s; animation-delay: -8s;  width: 1px; height: 1px; }
.particle:nth-child(4)  { left: 35%; top: 60%; animation-duration: 26s; animation-delay: -2s;  background: rgba(13, 92, 82, 0.04); }
.particle:nth-child(5)  { left: 45%; top: 15%; animation-duration: 30s; animation-delay: -12s; width: 3px; height: 3px; }
.particle:nth-child(6)  { left: 55%; top: 70%; animation-duration: 24s; animation-delay: -6s;  width: 1px; height: 1px; background: rgba(240, 245, 243, 0.04); }
.particle:nth-child(7)  { left: 65%; top: 40%; animation-duration: 34s; animation-delay: -10s; }
.particle:nth-child(8)  { left: 75%; top: 85%; animation-duration: 20s; animation-delay: -3s;  background: rgba(212, 36, 111, 0.04); }
.particle:nth-child(9)  { left: 85%; top: 25%; animation-duration: 28s; animation-delay: -7s;  width: 1px; height: 1px; }
.particle:nth-child(10) { left: 92%; top: 55%; animation-duration: 36s; animation-delay: -14s; width: 3px; height: 3px; background: rgba(240, 245, 243, 0.04); }
.particle:nth-child(11) { left: 10%; top: 45%; animation-duration: 25s; animation-delay: -5s;  background: rgba(212, 36, 111, 0.05); }
.particle:nth-child(12) { left: 40%; top: 90%; animation-duration: 30s; animation-delay: -9s;  width: 1px; height: 1px; }
.particle:nth-child(13) { left: 70%; top: 5%;  animation-duration: 27s; animation-delay: -11s; background: rgba(240, 245, 243, 0.05); }
.particle:nth-child(14) { left: 50%; top: 50%; animation-duration: 33s; animation-delay: -1s;  width: 1px; height: 1px; background: rgba(212, 36, 111, 0.06); }
.particle:nth-child(15) { left: 20%; top: 65%; animation-duration: 29s; animation-delay: -13s; }

@keyframes particleFloat {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translate(60px, -120px) scale(1.5); opacity: 0.6; }
  90%  { opacity: 1; }
  100% { transform: translate(-30px, -240px) scale(1); opacity: 0; }
}

/* Nav */
.landing-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: 24px 40px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(38, 60, 78, 0.4);
  backdrop-filter: blur(20px) saturate(1.4);
  pointer-events: none;
}
.landing-nav > * { pointer-events: auto; }
.nav-brand {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 700;
  font-variation-settings: 'opsz' 24, 'WONK' 1;
  color: var(--color-accent);
  letter-spacing: -0.02em;
}
.nav-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-sage);
  letter-spacing: 0.02em;
}
.status-dot {
  width: 6px;
  height: 6px;
  background: #2B8A6E;
  border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Hero */
.hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}
.hero-content {
  text-align: center;
  max-width: 480px;
  opacity: 0;
  transform: translateY(30px);
  animation: fadeSlideUp var(--dur-5, 1100ms) var(--ease-out-expo) 0.3s forwards;
}
.hero-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: rgba(212, 36, 111, 0.08);
  border: 1px solid rgba(212, 36, 111, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}
.hero-eyebrow {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-sage-800);
  margin-bottom: 16px;
}
.hero-headline {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 600;
  font-variation-settings: 'opsz' 144, 'WONK' 1;
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--color-sage);
  margin-bottom: 20px;
  text-wrap: balance;
}
.hero-description {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-variation-settings: 'opsz' 36;
  line-height: 1.4;
  color: var(--color-navy-100);
  font-weight: 400;
  margin-bottom: 40px;
  max-width: 24ch;
  margin-left: auto;
  margin-right: auto;
  text-wrap: balance;
}
.hero-description em {
  color: var(--color-accent);
  font-style: italic;
  font-weight: 600;
}
.sign-in-btn {
  display: inline-block;
  padding: 12px 32px;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: -0.01em;
  transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo);
}
.sign-in-btn:hover {
  background: var(--color-accent-hover);
  box-shadow: var(--shadow-suspend);
  transform: translateY(-1px);
}
.sign-in-btn:active { transform: translateY(0); }

@keyframes fadeSlideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Scroll hint */
.scroll-hint {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.scroll-hint span {
  font-family: var(--font-sans);
  font-size: 0.65rem;
  color: var(--color-navy-100);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--color-accent), transparent);
  animation: scrollPulse 2s ease-in-out infinite;
}
@keyframes scrollPulse {
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50% { opacity: 1; transform: scaleY(1.2); }
}

/* Footer */
.landing-footer {
  padding: 32px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(240, 245, 243, 0.08);
}
.footer-copy {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-navy-100);
}
.footer-links { display: flex; gap: 16px; }
.footer-links a {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-navy-100);
  text-decoration: none;
  transition: color var(--dur-2) var(--ease-out-expo);
}
.footer-links a:hover { color: var(--color-accent); }

@media (max-width: 640px) {
  .landing-nav { padding: 18px 20px; }
  .landing-nav .nav-status { display: none; }
  .landing-footer { padding: 24px 20px; }
  .hero-description { font-size: 1.15rem; }
  .scroll-hint { display: none; }
}
</style>
