import "./globals.css";

export const metadata = {
  title: "Anniversaires VHD-BOUAKE",
  description: "Suivi simple des anniversaires et rappels WhatsApp pour VHD-BOUAKE.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
