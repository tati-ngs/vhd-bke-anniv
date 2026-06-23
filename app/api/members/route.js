import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "members.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const membersTable = "members";
const callStatuses = new Set(["a_rappeler", "appele", "inscrit_confirme"]);

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
    callStatus: member.call_status || member.callStatus || "a_rappeler",
    createdAt: member.created_at || member.createdAt,
  };
}

function toDatabaseMember(member) {
  return {
    id: member.id,
    name: member.name,
    birthday: member.birthday,
    phone: member.phone,
    service: member.service,
    call_status: member.callStatus || "a_rappeler",
    created_at: member.createdAt,
  };
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
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
    const members = await supabaseRequest(`${membersTable}?select=*&order=created_at.desc`);
    return members.map(toAppMember);
  }

  try {
    const content = await readFile(dataFile, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeMembers(members) {
  if (hasSupabaseConfig()) {
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(members, null, 2));
}

async function addMember(member) {
  if (hasSupabaseConfig()) {
    const [createdMember] = await supabaseRequest(membersTable, {
      method: "POST",
      body: JSON.stringify(toDatabaseMember(member)),
    });

    return toAppMember(createdMember);
  }

  return member;
}

async function removeMember(id) {
  if (hasSupabaseConfig()) {
    await supabaseRequest(`${membersTable}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}

async function updateMemberStatus(id, callStatus) {
  if (hasSupabaseConfig()) {
    const [updatedMember] = await supabaseRequest(`${membersTable}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ call_status: callStatus }),
    });

    return toAppMember(updatedMember);
  }

  return null;
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizePhone(value) {
  const cleaned = cleanText(value).replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  return cleaned.replace(/\D/g, "");
}

function isValidBirthday(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

export async function GET() {
  try {
    const members = await readMembers();
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger les membres pour le moment.", members: [] },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const body = await request.json();
  const name = cleanText(body.name);
  const birthday = cleanText(body.birthday);
  const phone = cleanText(body.phone);
  const service = cleanText(body.service);

  if (!name || !isValidBirthday(birthday) || !phone) {
    return NextResponse.json(
      { error: "Le nom, la date d'anniversaire et le numero WhatsApp sont obligatoires." },
      { status: 400 },
    );
  }

  try {
    const members = await readMembers();
    const normalizedPhone = normalizePhone(phone);
    const alreadyExists = members.some(
      (member) => normalizedPhone && normalizePhone(member.phone) === normalizedPhone,
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Cette personne semble deja inscrite. Si c'est une erreur, contacte le responsable VHD-BOUAKE." },
        { status: 409 },
      );
    }

    const member = {
      id: crypto.randomUUID(),
      name,
      birthday,
      phone,
      service,
      callStatus: "a_rappeler",
      createdAt: new Date().toISOString(),
    };

    const createdMember = await addMember(member);
    const nextMembers = hasSupabaseConfig() ? await readMembers() : [...members, createdMember];
    await writeMembers(nextMembers);
    return NextResponse.json({ member: createdMember, members: nextMembers }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer cette inscription pour le moment." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const id = request.nextUrl.searchParams.get("id");

  try {
    const members = await readMembers();
    const nextMembers = members.filter((member) => member.id !== id);
    await removeMember(id);
    await writeMembers(nextMembers);
    return NextResponse.json({ members: nextMembers });
  } catch {
    return NextResponse.json(
      { error: "Impossible de retirer ce membre pour le moment.", members: [] },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  const body = await request.json();
  const id = cleanText(body.id);
  const callStatus = cleanText(body.callStatus);

  if (!id || !callStatuses.has(callStatus)) {
    return NextResponse.json(
      { error: "Le membre et le statut sont obligatoires." },
      { status: 400 },
    );
  }

  try {
    const members = await readMembers();
    const existingMember = members.find((member) => member.id === id);

    if (!existingMember) {
      return NextResponse.json(
        { error: "Membre introuvable." },
        { status: 404 },
      );
    }

    await updateMemberStatus(id, callStatus);
    const nextMembers = hasSupabaseConfig()
      ? await readMembers()
      : members.map((member) => member.id === id ? { ...member, callStatus } : member);

    await writeMembers(nextMembers);
    return NextResponse.json({ members: nextMembers });
  } catch {
    return NextResponse.json(
      { error: "Impossible de modifier le statut pour le moment." },
      { status: 500 },
    );
  }
}
