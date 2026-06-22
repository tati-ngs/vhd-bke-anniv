import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const dataFile = path.join(process.cwd(), "data", "members.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const reminderEmailTo = process.env.REMINDER_EMAIL_TO;
const reminderEmailFrom = process.env.REMINDER_EMAIL_FROM || "VHD-BOUAKE <onboarding@resend.dev>";
const timezone = "Africa/Abidjan";

function getReminderRecipients() {
  return String(reminderEmailTo || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

function toAppMember(member) {
  return {
    id: member.id,
    name: member.name,
    birthday: member.birthday,
    phone: member.phone,
    service: member.service || "",
    createdAt: member.created_at || member.createdAt,
  };
}

async function supabaseRequest(pathname) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Erreur Supabase");
  }

  return data;
}

async function readMembers() {
  if (hasSupabaseConfig()) {
    const members = await supabaseRequest("members?select=*&order=name.asc");
    return members.map(toAppMember);
  }

  try {
    const content = await readFile(dataFile, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function getDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function getTomorrowKey() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { month, day } = getDateParts(tomorrow);
  return `${month}-${day}`;
}

function formatBirthday(member) {
  const [, month, day] = member.birthday.split("-");
  return `${day}/${month}`;
}

function buildWhatsAppMessage(members) {
  const names = members.map((member) => member.name).join(", ");
  const plural = members.length > 1;

  return [
    "Bonjour famille VHD-BOUAKE,",
    "",
    `Petit rappel : demain, ce sera l'anniversaire de ${names}.`,
    `Pensons a ${plural ? "leur" : "lui"} souhaiter un joyeux anniversaire dans le groupe.`,
    "",
    "Que Dieu benisse abondamment chaque personne que nous celebrons.",
  ].join("\n");
}

function buildEmailText(members) {
  const lines = members.map((member) => {
    const service = member.service ? ` - ${member.service}` : "";
    return `- ${member.name} (${formatBirthday(member)})${service} - ${member.phone}`;
  });

  return [
    "Rappel anniversaires VHD-BOUAKE",
    "",
    "Demain, nous devons souhaiter un joyeux anniversaire a :",
    ...lines,
    "",
    "Message WhatsApp pret a copier :",
    "",
    buildWhatsAppMessage(members),
  ].join("\n");
}

async function sendReminderEmail(members) {
  const recipients = getReminderRecipients();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: reminderEmailFrom,
      to: recipients,
      subject: `Rappel anniversaire VHD-BOUAKE - ${members.length} personne(s) demain`,
      text: buildEmailText(members),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Erreur lors de l'envoi email");
  }

  return data;
}

export async function GET() {
  try {
    const members = await readMembers();
    const tomorrowKey = getTomorrowKey();
    const tomorrowMembers = members.filter((member) => member.birthday?.slice(5) === tomorrowKey);

    if (!tomorrowMembers.length) {
      return NextResponse.json({
        sent: false,
        message: "Aucun anniversaire demain.",
      });
    }

    if (!resendApiKey || !getReminderRecipients().length) {
      return NextResponse.json(
        {
          sent: false,
          error: "RESEND_API_KEY et REMINDER_EMAIL_TO doivent etre configures.",
          tomorrowMembers,
        },
        { status: 500 },
      );
    }

    const email = await sendReminderEmail(tomorrowMembers);

    return NextResponse.json({
      sent: true,
      email,
      tomorrowMembers,
    });
  } catch {
    return NextResponse.json(
      { sent: false, error: "Impossible d'envoyer le rappel pour le moment." },
      { status: 500 },
    );
  }
}
