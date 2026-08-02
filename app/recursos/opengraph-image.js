import { ImageResponse } from "next/og";

export const alt = "Ktr3 Resources — sonidos para productores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f8f3ff",
          background: "radial-gradient(circle at 78% 18%, #59227f 0, #120b1a 38%, #07050a 78%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 5 }}>
          <b>KTR3</b>
          <span style={{ color: "#b879e8" }}>PRODUCER_RESOURCES://ONLINE</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#c07cff", fontSize: 22, letterSpacing: 4 }}>PRESETS · MIDI · FX · TEMPLATES</span>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22, fontSize: 82, lineHeight: .94, fontWeight: 800, letterSpacing: -5 }}>
            <span>Sonidos para llevar</span>
            <span>tus ideas más lejos.</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#9b90a4", fontSize: 23 }}>
          <span>Creado por Ktr3 para productores</span>
          <span>ktr3.es/recursos</span>
        </div>
      </div>
    ),
    size,
  );
}
