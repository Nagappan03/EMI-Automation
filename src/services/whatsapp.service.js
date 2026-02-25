import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppMessage({ to, body }) {
    await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${to}`,
        body
    });

    console.log("[WHATSAPP] Message sent successfully");
}