import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "members.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const membersTable = "members";

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

function toDatabaseMember(member) {
  return {
    id: member.id,
    name: member.name,
    birthday: member.birthday,
    phone: member.phone,
    service: member.service,
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

function cleanText(value) {
  return String(value || "").trim();
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
    const alreadyExists = members.some(
      (member) =>
        member.name.toLowerCase() === name.toLowerCase() &&
        member.birthday === birthday,
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Cette personne semble deja inscrite." },
        { status: 409 },
      );
    }

    const member = {
      id: crypto.randomUUID(),
      name,
      birthday,
      phone,
      service,
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
