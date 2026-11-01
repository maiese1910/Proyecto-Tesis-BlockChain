import puppeteer from 'puppeteer';
import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';

function fetchMailpitLatest(subjectQuery) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:54324/api/v1/messages', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const msgs = json.messages || [];
          const match = msgs.find(m => !subjectQuery || m.Subject.includes(subjectQuery));
          if (!match) return resolve(null);
          http.get(`http://localhost:54324/api/v1/message/${match.ID}`, (r2) => {
            let body = '';
            r2.on('data', c => body += c);
            r2.on('end', () => resolve(JSON.parse(body)));
          }).on('error', reject);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-profile-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('--- 1. Navegando a http://localhost:5173 ---');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  // 1. Probar OTP: Ingresar a vista OTP
  console.log('--- 2. Probando Acceso Passwordless (OTP) ---');
  // Click en "Acceder sin contraseña mediante código OTP"
  const otpBtn = await page.waitForSelector('button ::-p-text(Acceder sin contraseña mediante código OTP)');
  await otpBtn.click();
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'test-screenshots/10_otp_vista_cedula_correo.png' });
  console.log('Captura 10: Vista OTP con Cédula y Correo guardada.');

  // Caso A: Cédula y correo no registrados
  console.log('Caso A: Usuario no registrado en OTP...');
  // Fill cedula
  const cedulaInputs = await page.$$('input[placeholder="28.315.101"]');
  if (cedulaInputs.length > 0) {
    await cedulaInputs[0].type('99.999.999');
  }
  const emailInputs = await page.$$('input[type="email"]');
  if (emailInputs.length > 0) {
    await emailInputs[0].type('noexiste@usm.edu.ve');
  }
  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: 'test-screenshots/11_otp_usuario_no_registrado.png' });
  console.log('Captura 11: Error usuario no registrado en OTP guardada.');

  // Caso B: Cédula y correo que no coinciden
  console.log('Caso B: Datos no coinciden en OTP...');
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(i => i.value = '');
  });
  await cedulaInputs[0].type('30.111.252'); // Cédula de Juan David
  await emailInputs[0].type('otro_correo@usm.edu.ve'); // Correo diferente
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: 'test-screenshots/12_otp_datos_no_coinciden.png' });
  console.log('Captura 12: Error datos no coinciden en OTP guardada.');

  // Caso C: Cédula y correo coincidentes
  console.log('Caso C: Cédula y correo correctos en OTP...');
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(i => i.value = '');
  });
  await cedulaInputs[0].type('30.111.252');
  await emailInputs[0].type('jdtr0103@gmail.com');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 2500));

  await page.screenshot({ path: 'test-screenshots/13_otp_codigo_enviado.png' });
  console.log('Captura 13: Vista de ingreso de 6 dígitos OTP guardada.');

  // 2. Probar Recuperar Contraseña
  console.log('--- 3. Probando Recuperación de Contraseña ---');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  const forgotBtn = await page.waitForSelector('button ::-p-text(¿Olvidaste tu contraseña?)');
  await forgotBtn.click();
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'test-screenshots/14_forgot_vista_cedula_correo.png' });
  console.log('Captura 14: Vista Recuperar Contraseña guardada.');

  // Probar datos coincidentes en Recuperación
  const forgotCedula = await page.waitForSelector('input[placeholder="28.315.101"]');
  await forgotCedula.type('30.111.252');
  const forgotEmail = await page.waitForSelector('input[type="email"]');
  await forgotEmail.type('jdtr0103@gmail.com');
  const sendForgotBtn = await page.waitForSelector('button[type="submit"]');
  await sendForgotBtn.click();
  await new Promise(r => setTimeout(r, 2500));

  await page.screenshot({ path: 'test-screenshots/15_forgot_codigo_enviado_directo.png' });
  console.log('Captura 15: Vista con ingreso directo de código de 6 dígitos guardada.');

  // Consultar Mailpit para ver el código generado
  const mail = await fetchMailpitLatest('Recuperación');
  if (mail) {
    console.log('Correo recuperado de Mailpit con Asunto:', mail.Subject);
    const tokenMatch = mail.Text ? mail.Text.match(/\b\d{6}\b/) : null;
    console.log('Token encontrado en texto:', tokenMatch ? tokenMatch[0] : 'Enlace en HTML');
  }

  await browser.close();
  console.log('--- Pruebas de navegador finalizadas exitosamente ---');
})();
