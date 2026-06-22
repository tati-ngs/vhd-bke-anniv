"use client";

import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSending(true);
    setStatus("");

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
    setIsSending(false);

    if (!response.ok) {
      setStatus(data.error || "Inscription impossible pour le moment.");
      return;
    }

    setName("");
    setBirthday("");
    setPhone("");
    setService("");
    setStatus("Merci, ton anniversaire a bien ete enregistre.");
  }

  return (
    <main className="page signupPage">
      <section className="signupHero">
        <p className="eyebrow">VHD-BOUAKE</p>
        <h1>Inscription anniversaire</h1>
        <p>
          Remplis ce petit formulaire pour que ton anniversaire ne soit plus
          oublie dans le groupe.
        </p>
      </section>

      <form className="panel formPanel signupForm" onSubmit={handleSubmit}>
        <label>
          Nom complet
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ton nom"
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
          Numero WhatsApp
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

        <button className="primaryButton" type="submit" disabled={isSending}>
          {isSending ? "Enregistrement..." : "Envoyer"}
        </button>

        {status && <p className="formStatus">{status}</p>}
      </form>
    </main>
  );
}
