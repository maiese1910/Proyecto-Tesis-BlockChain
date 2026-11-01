import puppeteer from 'puppeteer';
import os from 'os';
import fs from 'fs';
import path from 'path';

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-sec-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('--- 1. Navegando al Login de http://localhost:5173 ---');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  console.log('--- 2. Probando límite de intentos fallidos (Fuerza Bruta) ---');
  const emailInput = await page.waitForSelector('input[type="email"]');
  await emailInput.type('jdtr0103@gmail.com');

  const pwdInput = await page.waitForSelector('input[type="password"]');

  // Ejecutar 5 intentos con clave errónea
  for (let i = 1; i <= 5; i++) {
    console.log(`Intento fallido ${i}/5...`);
    await pwdInput.click({ clickCount: 3 });
    await pwdInput.type(`ClaveErronea${i}!`);
    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  await page.screenshot({ path: 'test-screenshots/18_login_lockout_seguridad.png' });
  console.log('Captura 18: Bloqueo de seguridad por intentos fallidos guardada.');

  // Probar vista OTP y Cooldown
  console.log('--- 3. Probando Cooldown de Rate Limiting en OTP ---');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  const otpBtn = await page.waitForSelector('button ::-p-text(Acceder sin contraseña mediante código OTP)');
  await otpBtn.click();
  await new Promise(r => setTimeout(r, 600));

  const cedulaInput = await page.waitForSelector('input[placeholder="28.315.101"]');
  await cedulaInput.type('30.111.252');
  const otpEmailInput = await page.waitForSelector('input[type="email"]');
  await otpEmailInput.type('jdtr0103@gmail.com');

  const sendOtpBtn = await page.waitForSelector('button[type="submit"]');
  await sendOtpBtn.click();
  await new Promise(r => setTimeout(r, 2500));

  // Volver a la vista de solicitud OTP para comprobar cooldown
  const backBtn = await page.waitForSelector('button ::-p-text(Cambiar correo)');
  if (backBtn) {
    await backBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  await page.screenshot({ path: 'test-screenshots/19_otp_cooldown_activo.png' });
  console.log('Captura 19: Cooldown de seguridad en OTP guardada.');

  await browser.close();
  console.log('--- Pruebas de Ciberseguridad y Rate Limiting finalizadas con éxito ---');
})();
