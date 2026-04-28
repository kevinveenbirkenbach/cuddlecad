# CuddleCAD
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-blue?logo=github)](https://github.com/sponsors/kevinveenbirkenbach) [![Patreon](https://img.shields.io/badge/Support-Patreon-orange?logo=patreon)](https://www.patreon.com/c/kevinveenbirkenbach) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20Coffee-Funding-yellow?logo=buymeacoffee)](https://buymeacoffee.com/kevinveenbirkenbach) [![PayPal](https://img.shields.io/badge/Donate-PayPal-blue?logo=paypal)](https://s.veen.world/paypaldonate)


Eine niedliche Browser-Webapp zum einfachen 3D-Modellieren mit 7 Werkzeugen:

1. Wuerfel
2. Kugel
3. Zylinder
4. Verschieben
5. Drehen
6. Skalieren
7. Loeschen

## Guide fuer Einsteiger

![CuddleCAD Guide Vorschau](assets/guide-hero-merged.png)

Wenn du CuddleCAD lieber Schritt fuer Schritt und in einer verspielten Geschichte einrichten moechtest, lies den illustrierten Guide fuer Windows-Einsteiger:

[Zum Guide](guide.md)

## Schnellstart lokal

```bash
python app.py
```

Dann im Browser oeffnen:

- http://localhost:8000

## Schnellstart mit Docker

```bash
make run
```

oder

```bash
docker compose up --build
```

## Export

Die Webapp exportiert Modelle als:

- OBJ
- STL

## Hinweise

- Fokus ist eine sehr einfache, verspielte Modellier-Webapp.
- Die Bedienung ist absichtlich reduziert.
- Die App ist inspiriert von einer warmen Baustellen-Spielzeug-Optik, ohne direkte Fremdfiguren zu verwenden.
