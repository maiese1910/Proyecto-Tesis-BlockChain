import puppeteer from 'puppeteer';
import os from 'os';
import fs from 'fs';
import path from 'path';

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-login-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('--- 1. Navegando al Login de http://localhost:5173 ---');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  // Caso 1: Correo no registrado
  console.log('--- 2. Probando inicio de sesión con correo no registrado ---');
  const emailInput = await page.waitForSelector('input[type="email"]');
  await emailInput.type('alguien_no_registrado_999@usm.edu.ve');
  const pwdInput = await page.waitForSelector('input[type="password"]');
  await pwdInput.type('Password123!');

  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'test-screenshots/16_login_usuario_no_registrado.png' });
  console.log('Captura 16: Notificación de usuario no registrado en login guardada.');

  // Caso 2: Correo registrado pero contraseña incorrecta
  console.log('--- 3. Probando inicio de sesión con correo registrado pero clave errónea ---');
  await page.evaluate(() => {
    const email = document.querySelector('input[type="email"]');
    if (email) {
      email.value = '';
      email.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const pwd = document.querySelector('input[type="password"]');
    if (pwd) {
      pwd.value = '';
      pwd.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  const emailInput2 = await page.waitForSelector('input[type="email"]');
  await emailInput2.type('jdtr0103@gmail.com');

  const pwdInput2 = await page.waitForSelector('input[type="password"]');
  await pwdInput2.type('ClaveIncorrecta999!');

  const submitBtn2 = await page.waitForSelector('button[type="submit"]');
  await submitBtn2.click();
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'test-screenshots/17_login_clave_incorrecta.png' });
  console.log('Captura 17: Notificación de clave incorrecta guardada.');

  await browser.close();
  console.log('--- Pruebas de login con correo no registrado finalizadas con éxito ---');
})();
