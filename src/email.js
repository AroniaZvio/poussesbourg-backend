const { Resend } = require('resend');
require('dotenv').config();

// Если ключ не задан — email просто не отправляется, сервер не падает
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

async function sendOrderConfirmation(customerEmail, customerName, orderId, total) {
  if (!resend) return console.log('⚠️ Email отключён (нет RESEND_API_KEY)');
  try {
    await resend.emails.send({
      from: 'Poussesbourg <onboarding@resend.dev>',
      to: [customerEmail],
      subject: `🌱 Ваш заказ #${orderId} подтверждён`,
      html: `
        <h1>Спасибо, ${customerName}!</h1>
        <p>Ваш заказ <b>#${orderId}</b> на сумму <b>${total}€</b> принят.</p>
        <p>Мы свяжемся с вами для подтверждения доставки.</p>
        <p>— Команда Poussesbourg 🌱</p>
      `
    });
    console.log(`✅ Email отправлен: ${customerEmail}`);
  } catch (err) {
    console.error('❌ Ошибка отправки email:', err.message);
  }
}

async function sendNewsletterWelcome(email) {
  if (!resend) return console.log('⚠️ Email отключён (нет RESEND_API_KEY)');
  try {
    await resend.emails.send({
      from: 'Poussesbourg <onboarding@resend.dev>',
      to: [email],
      subject: '🌱 Bienvenue chez Poussesbourg!',
      html: `
        <h1>Merci de vous être abonné!</h1>
        <p>Vous recevrez nos nouveautés et offres spéciales chaque semaine.</p>
        <p>— L'équipe Poussesbourg 🌱</p>
      `
    });
    console.log(`✅ Welcome email: ${email}`);
  } catch (err) {
    console.error('❌ Ошибка отправки email:', err.message);
  }
}

module.exports = { sendOrderConfirmation, sendNewsletterWelcome };