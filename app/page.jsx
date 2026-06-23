"use client";

import { useEffect, useMemo, useState } from "react";

const monthNames = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];
const callStatusLabels = {
  a_rappeler: "À rappeler",
  appele: "Appelé",
  inscrit_confirme: "Inscrit confirmé",
};

function parseBirthday(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function todayOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function birthdayDateForYear(member, year) {
  const { month, day } = parseBirthday(member.birthday);
  return new Date(year, month - 1, day);
}

function daysUntil(member) {
  const today = todayOnly();
  let nextBirthday = birthdayDateForYear(member, today.getFullYear());

  if (nextBirthday < today) {
    nextBirthday = birthdayDateForYear(member, today.getFullYear() + 1);
  }

  return Math.round((nextBirthday.getTime() - today.getTime()) / 86400000);
}

function formatBirthday(member) {
  const { day, month } = parseBirthday(member.birthday);
  return `${day} ${monthNames[month - 1]}`;
}

function nextAge(member) {
  const { year } = parseBirthday(member.birthday);
  const today = todayOnly();
  const nextYear =
    birthdayDateForYear(member, today.getFullYear()) < today
      ? today.getFullYear() + 1
      : today.getFullYear();

  return nextYear - year;
}

function buildReminderMessage(tomorrowMembers) {
  if (!tomorrowMembers.length) {
    return "Bonjour famille, aucun anniversaire n'est prevu demain dans notre liste.";
  }

  const names = tomorrowMembers.map((member) => member.name).join(", ");
  const plural = tomorrowMembers.length > 1;

  return [
    "Bonjour famille,",
    "",
    `Petit rappel : demain, ce sera l'anniversaire de ${names}.`,
    `Pensons a ${plural ? "leur" : "lui"} souhaiter un joyeux anniversaire dans le groupe.`,
    "",
    "Que Dieu benisse abondamment chaque personne que nous celebrons.",
  ].join("\n");
}

function normalizePhoneNumber(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  return cleaned;
}

function getPhoneLinks(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const whatsappPhone = normalizedPhone.replace(/\D/g, "");

  return {
    call: normalizedPhone ? `tel:${normalizedPhone}` : "#",
    whatsapp: whatsappPhone ? `https://wa.me/${whatsappPhone}` : "#",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildMembersExcelHtml(members) {
  const headers = [
    "Nom",
    "Date anniversaire",
    "Telephone WhatsApp",
    "Service ou note",
    "Statut appel",
    "Prochain rappel",
    "Jours restants",
  ];

  const rows = members.map((member) => [
    member.name,
    formatBirthday(member),
    member.phone,
    member.service || "",
    callStatusLabels[member.callStatus] || callStatusLabels.a_rappeler,
    daysUntil(member) === 0
      ? "Aujourd'hui"
      : daysUntil(member) === 1
        ? "Demain"
        : `Dans ${daysUntil(member)} jours`,
    daysUntil(member),
  ]);

  const columnWidths = [260, 150, 180, 260, 150, 180, 120];
  const headerCells = headers
    .map((header, index) => `<th style="width:${columnWidths[index]}px">${escapeHtml(header)}</th>`)
    .join("");
  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map((value, index) => {
          const numberFormat = index === 2 ? "mso-number-format:'\\@';" : "";
          return `<td style="${numberFormat}">${escapeHtml(value)}</td>`;
        })
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12pt; }
          th { background: #176344; color: #ffffff; font-weight: 700; text-align: left; }
          th, td { border: 1px solid #b9c0cc; padding: 8px 10px; white-space: nowrap; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export default function Home() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shareLink, setShareLink] = useState("/inscription");
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    loadMembers();
    setShareLink(`${window.location.origin}/inscription`);
  }, []);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => daysUntil(a) - daysUntil(b)),
    [members],
  );

  const todayMembers = useMemo(
    () => sortedMembers.filter((member) => daysUntil(member) === 0),
    [sortedMembers],
  );

  const tomorrowMembers = useMemo(
    () => sortedMembers.filter((member) => daysUntil(member) === 1),
    [sortedMembers],
  );

  const weekMembers = useMemo(
    () => sortedMembers.filter((member) => daysUntil(member) <= 7),
    [sortedMembers],
  );

  const reminderMessage = buildReminderMessage(tomorrowMembers);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reminderMessage)}`;

  async function loadMembers() {
    setIsLoading(true);
    const response = await fetch("/api/members", { cache: "no-store" });
    const data = await response.json();
    setMembers(data.members || []);
    setIsLoading(false);
  }

  function resetForm() {
    setName("");
    setBirthday("");
    setPhone("");
    setService("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const response = await fetch("/api/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        birthday,
        phone: phone.trim(),
        service: service.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setNotice(data.error || "Inscription impossible pour le moment.");
      return;
    }

    setMembers(data.members || []);
    resetForm();
    setNotice(`${data.member.name} a ete ajoute a la liste.`);
  }

  async function copyReminder() {
    await navigator.clipboard.writeText(reminderMessage);
    setNotice("Message de rappel copie. Tu peux le coller dans WhatsApp.");
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareLink);
    setNotice("Lien d'inscription copie. Tu peux le partager dans le groupe.");
  }

  async function removeMember(id) {
    const response = await fetch(`/api/members?id=${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      setNotice(data.error || "Impossible de retirer ce membre pour le moment.");
      return;
    }

    setMembers(data.members || []);
    setMemberToRemove(null);
    setNotice("Membre retiré de la liste.");
  }

  async function updateCallStatus(id, callStatus) {
    const response = await fetch("/api/members", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, callStatus }),
    });
    const data = await response.json();

    if (!response.ok) {
      setNotice(data.error || "Impossible de modifier le statut.");
      return;
    }

    setMembers(data.members || []);
    setNotice(`Statut mis à jour : ${callStatusLabels[callStatus]}.`);
  }

  function exportMembers() {
    if (!sortedMembers.length) {
      setNotice("Aucune liste a exporter pour le moment.");
      return;
    }

    const excelHtml = buildMembersExcelHtml(sortedMembers);
    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `anniversaires-vhd-bouake-${today}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Liste exportee pour Excel.");
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="heroText">
          <p className="eyebrow">VHD-BOUAKE</p>
          <h1>Ne plus oublier les anniversaires</h1>
          <p>
            Partage le lien d'inscription, les membres remplissent le formulaire
            depuis leur telephone, et la veille l'app prepare le rappel WhatsApp.
          </p>
        </div>

        <div className="heroPanel" aria-label="Rappel de demain">
          <span>Rappel de demain</span>
          <strong>{tomorrowMembers.length}</strong>
          <p>
            {tomorrowMembers.length
              ? tomorrowMembers.map((member) => member.name).join(", ")
              : "Aucun anniversaire prevu demain"}
          </p>
        </div>
      </section>

      <section className="stats" aria-label="Resume">
        <div>
          <span>Membres inscrits</span>
          <strong>{members.length}</strong>
        </div>
        <div>
          <span>Aujourd'hui</span>
          <strong>{todayMembers.length}</strong>
        </div>
        <div>
          <span>Cette semaine</span>
          <strong>{weekMembers.length}</strong>
        </div>
      </section>

      <section className="workspace">
        <form className="panel formPanel" onSubmit={handleSubmit}>
          <div>
            <p className="sectionLabel">Inscription</p>
            <h2>Ajouter un membre</h2>
          </div>

          <label>
            Nom complet
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Grace M."
            />
          </label>

          <label>
            Date d'anniversaire
            <input
              required
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>

          <label>
            Telephone WhatsApp
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ex : +225 07 00 00 00 00"
            />
          </label>

          <label>
            Service ou note
            <input
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Ex : chorale, accueil..."
            />
          </label>

          <button className="primaryButton" type="submit">
            Enregistrer
          </button>
        </form>

        <section className="panel sharePanel">
          <div className="sectionHeader">
            <div>
              <p className="sectionLabel">Lien public</p>
              <h2>Inscription depuis telephone</h2>
            </div>
            <button type="button" onClick={copyShareLink}>
              Copier
            </button>
          </div>

          <div className="shareBox">{shareLink}</div>
          <a className="whatsappButton" href={`/inscription`}>
            Voir le formulaire
          </a>
          <p className="hint">
            Quand l'app sera hebergee en ligne, tu partageras ce lien dans le
            groupe WhatsApp pour que chacun s'inscrive lui-meme.
          </p>
        </section>
      </section>

      <section className="workspace singleWorkspace">
        <section className="panel reminderPanel">
          <div className="sectionHeader">
            <div>
              <p className="sectionLabel">WhatsApp</p>
              <h2>Message pret pour la veille</h2>
            </div>
            <button type="button" onClick={copyReminder}>
              Copier
            </button>
          </div>

          <pre>{reminderMessage}</pre>

          <a className="whatsappButton" href={whatsappUrl} target="_blank">
            Ouvrir WhatsApp
          </a>

          <p className="hint">
            Pour envoyer automatiquement dans un groupe sans intervention, il
            faudra une integration WhatsApp Business ou un service externe.
          </p>
        </section>
      </section>

      <section className="panel listPanel">
        <div className="sectionHeader">
          <div>
            <p className="sectionLabel">Suivi</p>
            <h2>Anniversaires a venir</h2>
          </div>
          <button type="button" onClick={exportMembers} disabled={isLoading || !sortedMembers.length}>
            Exporter Excel
          </button>
        </div>

        {isLoading ? (
          <div className="empty">
            <strong>Chargement de la liste...</strong>
            <span>Un instant.</span>
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="empty">
            <strong>Aucun membre inscrit pour le moment.</strong>
            <span>Partage le lien d'inscription ou ajoute les premiers membres.</span>
          </div>
        ) : (
          <div className="memberGrid">
            {sortedMembers.map((member) => {
              const days = daysUntil(member);
              const phoneLinks = getPhoneLinks(member.phone);
              const callStatus = member.callStatus || "a_rappeler";
              return (
                <article className="memberCard" key={member.id}>
                  <div className="dateBox">
                    <strong>{parseBirthday(member.birthday).day}</strong>
                    <span>{monthNames[parseBirthday(member.birthday).month - 1].slice(0, 3)}</span>
                  </div>
                  <div>
                    <h3>{member.name}</h3>
                    <p>
                      {formatBirthday(member)} - {nextAge(member)} ans -{" "}
                      {days === 0
                        ? "aujourd'hui"
                        : days === 1
                          ? "demain"
                          : `dans ${days} jours`}
                    </p>
                    {(member.phone || member.service) && (
                      <p className="muted">
                        {[member.phone, member.service].filter(Boolean).join(" - ")}
                      </p>
                    )}
                    <div className="callTools">
                      <a className="toolButton" href={phoneLinks.call}>
                        Appeler
                      </a>
                      <a className="toolButton whatsappTool" href={phoneLinks.whatsapp} target="_blank">
                        WhatsApp
                      </a>
                      <label className="statusSelectLabel">
                        Statut
                        <select
                          className={`statusSelect status-${callStatus}`}
                          value={callStatus}
                          onChange={(event) => updateCallStatus(member.id, event.target.value)}
                        >
                          <option value="a_rappeler">À rappeler</option>
                          <option value="appele">Appelé</option>
                          <option value="inscrit_confirme">Inscrit confirmé</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={() => setMemberToRemove(member)}>
                    Retirer
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {memberToRemove && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="removeMemberTitle">
          <div className="confirmModal">
            <p className="sectionLabel">Confirmation</p>
            <h2 id="removeMemberTitle">Retirer ce membre ?</h2>
            <p>
              Tu es sur le point de retirer <strong>{memberToRemove.name}</strong> de la liste VHD-BOUAKE.
            </p>
            <div className="modalActions">
              <button type="button" onClick={() => setMemberToRemove(null)}>
                Annuler
              </button>
              <button type="button" className="dangerButton" onClick={() => removeMember(memberToRemove.id)}>
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
