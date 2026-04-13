# Requirements-Dokument – Cutlcat

## 1. Dokumentstatus

**Produktname:** Cutlcat
**Dokumenttyp:** Requirements-Dokument / Product Requirements Document (PRD)
**Version:** 0.1

---

## 2. Vision

Cutlcat ist eine browserbasierte, **niedliche, intuitive und gleichzeitig professionelle Cut-Software für Schreiner**.

Die Software kombiniert:

- [ ] einfache Bedienung
- [ ] visuell freundliches Design
- [ ] präzise Geometrie
- [ ] klassische Werkstattfunktionen

Ziel ist eine vollständige Software, mit der Bauteile entworfen, bearbeitet und für die Werkstatt vorbereitet werden können.

---

## 3. Zielsetzung

Cutlcat soll:

- [ ] extrem einfach bedienbar sein
- [ ] speziell für Schreiner optimiert sein
- [ ] klassische CAD/CAM-Komplexität reduzieren
- [ ] schrittweise zu einer vollständigen Cut-/Werkstattsoftware wachsen

---

## 4. Kernprinzipien

### 4.1 Fachlich

- [ ] Fokus auf Holz / Plattenbearbeitung
- [ ] präzise Geometrie
- [ ] reproduzierbare Ergebnisse

### 4.2 UX (Cute-Prinzip)

- [ ] große Buttons
- [ ] klare Werkzeuge
- [ ] freundliche Farben
- [ ] intuitive Interaktion

### 4.3 Technisch

- [ ] Web-App (Browser)
- [ ] modular aufgebaut
- [ ] erweiterbar Richtung CNC/CAM

---

## 5. Zentrale Kernanforderungen

### 5.1 Eckpunkte (sehr wichtig)

Eckpunkte sind **interaktive Schaltflächen**:

- [x] sichtbar als Griffe
- [x] einzeln auswählbar
- [x] per Drag verschiebbar
- [x] Live-Update der Geometrie
- [x] visuelles Feedback (Highlight)
- [x] weiche, „cute" Darstellung

---

### 5.2 Bearbeitungen

Muss unterstützen:

- [x] Bohrungen
- [x] Schnitte
- [x] Fräsungen
- [x] Kanten runden

Anforderungen:

- [x] einfach auswählbar
- [x] visuell sichtbar
- [x] editierbar
- [x] verschiebbar
- [x] CNC-ready strukturierbar

---

# 6. 30 Standardfunktionen (kompakt)

## 1. Rechteck erstellen

**Schritte:**

1. - [ ] Maße eingeben
2. - [ ] Geometrie erzeugen
3. - [ ] anzeigen
4. - [ ] speichern
5. - [ ] editieren

**Erweiterungen:**

- [ ] Templates
- [ ] Material
- [ ] Duplizieren
- [ ] Positionierung
- [ ] Presets

---

## 2. Polygon erstellen

**Schritte:**

1. - [ ] Punkte setzen
2. - [ ] verbinden
3. - [ ] schließen
4. - [ ] validieren
5. - [ ] speichern

**Erweiterungen:**

- [ ] Snap
- [ ] Winkelanzeige
- [ ] Symmetrie
- [ ] Vorlagen
- [ ] Live-Maße

---

## 3. Eckpunkte verschieben

**Schritte:**

1. - [ ] Griffe anzeigen
2. - [ ] auswählen
3. - [ ] drag
4. - [ ] live update
5. - [ ] undo

**Erweiterungen:**

- [ ] Mehrfachauswahl
- [ ] Raster
- [ ] Achsensperre
- [ ] numerisch
- [ ] löschen

---

## 4. Kanten verschieben

**Schritte:**

1. - [ ] Kante wählen
2. - [ ] Richtung berechnen
3. - [ ] verschieben
4. - [ ] Punkte anpassen
5. - [ ] prüfen

**Erweiterungen:**

- [ ] Maßangabe
- [ ] Multi-Kanten
- [ ] Kettenmodus
- [ ] Fixierungen
- [ ] Hilfslinien

---

## 5. Bohrung

**Schritte:**

1. - [ ] Tool wählen
2. - [ ] Position
3. - [ ] Durchmesser
4. - [ ] Vorschau
5. - [ ] speichern

**Erweiterungen:**

- [ ] Tiefe
- [ ] Raster
- [ ] Serien
- [ ] Bibliothek
- [ ] Kollisionscheck

---

## 6. Langloch

**Schritte:**

1. - [ ] Tool
2. - [ ] Start/Ende
3. - [ ] Breite
4. - [ ] Form
5. - [ ] speichern

**Erweiterungen:**

- [ ] Winkel
- [ ] Serien
- [ ] Radiusvarianten
- [ ] Templates
- [ ] CNC-Ready

---

## 7. Gerader Schnitt

**Schritte:**

1. - [ ] Linie
2. - [ ] Vorschau
3. - [ ] trennen
4. - [ ] speichern
5. - [ ] undo

**Erweiterungen:**

- [ ] Winkel
- [ ] Mehrfach
- [ ] Maßschnitt
- [ ] Listenintegration
- [ ] Namen

---

## 8. Freier Schnitt

**Schritte:**

1. - [ ] Linie zeichnen
2. - [ ] Schnittpunkte
3. - [ ] trennen
4. - [ ] prüfen
5. - [ ] anzeigen

**Erweiterungen:**

- [ ] Bézier
- [ ] Kurven
- [ ] Vorlagen
- [ ] Fräsbahn
- [ ] Warnungen

---

## 9. Tasche (Fräsung)

**Schritte:**

1. - [ ] Fläche wählen
2. - [ ] Kontur
3. - [ ] Tiefe
4. - [ ] Vorschau
5. - [ ] speichern

**Erweiterungen:**

- [ ] Inseln
- [ ] Mehrstufig
- [ ] Radius
- [ ] Strategie
- [ ] Bodenmaß

---

## 10. Nut

**Schritte:**

1. - [ ] Kante wählen
2. - [ ] Breite
3. - [ ] Tiefe
4. - [ ] Position
5. - [ ] speichern

**Erweiterungen:**

- [ ] mittig
- [ ] versetzt
- [ ] blind
- [ ] teilnut
- [ ] presets

---

## 11. Falz

**Schritte:**

1. - [ ] Kante
2. - [ ] Maße
3. - [ ] Vorschau
4. - [ ] anwenden
5. - [ ] speichern

**Erweiterungen:**

- [ ] doppelt
- [ ] Ecken
- [ ] Vorlagen
- [ ] Verbindungen
- [ ] Prüfung

---

## 12. Kanten runden

**Schritte:**

1. - [ ] Kante wählen
2. - [ ] Radius
3. - [ ] berechnen
4. - [ ] anzeigen
5. - [ ] speichern

**Erweiterungen:**

- [ ] variabel
- [ ] Serien
- [ ] Filter
- [ ] Liste
- [ ] Stil

---

## 13. Fase

**Schritte:**

1. - [ ] wählen
2. - [ ] Maß
3. - [ ] anwenden
4. - [ ] anzeigen
5. - [ ] editieren

**Erweiterungen:**

- [ ] Winkel
- [ ] doppelt
- [ ] Bibliothek
- [ ] Serien
- [ ] CNC

---

## 14. Maße anzeigen

- [ ] implementiert

---

## 15. Numerische Eingabe

- [ ] implementiert

---

## 16. Raster

- [ ] implementiert

---

## 17. Snap

- [ ] implementiert

---

## 18. Undo/Redo

- [ ] implementiert

---

## 19. Objektliste

- [ ] implementiert

---

## 20. Material

- [ ] implementiert

---

## 21. Stärke

- [ ] implementiert

---

## 22. Duplizieren

- [ ] implementiert

---

## 23. Spiegeln

- [ ] implementiert

---

## 24. Drehen

- [ ] implementiert

---

## 25. Verschieben

- [ ] implementiert

---

## 26. Import (SVG/DXF)

- [ ] implementiert

---

## 27. Export

- [ ] implementiert

---

## 28. Bearbeitungsliste

- [ ] implementiert

---

## 29. Kantenliste

- [ ] implementiert

---

## 30. Projekt speichern

- [ ] implementiert

👉 (alle folgen dem gleichen Schema: 5 Schritte + 5 Erweiterungen wie oben)

---

# 7. Nicht-funktionale Anforderungen

## Usability

- [ ] extrem einfach
- [ ] visuell klar
- [ ] keine Überladung

## Performance

- [ ] flüssige Interaktion
- [ ] Live-Updates

## Erweiterbarkeit

- [ ] modulare Bearbeitungen
- [ ] vorbereitbar für CNC

## Konsistenz

- [ ] gleiche Bedienlogik überall

---

# 8. Cute-Design

- [ ] weiche Farben
- [ ] runde Formen
- [ ] freundliche Icons
- [ ] leichte Animationen
- [ ] „Werkbank mit Persönlichkeit"

👉 Wichtig:
**Cute, aber nicht kindisch – sondern sympathisch professionell**

---

# 9. Roadmap

## Phase 1

- [ ] Geometrie + Punkte
- [ ] Snap + Raster
- [ ] Undo/Redo

## Phase 2

- [ ] Bohrungen
- [ ] Schnitte
- [ ] Fräsungen

## Phase 3

- [ ] Listen
- [ ] Material
- [ ] Export

## Phase 4

- [ ] Import
- [ ] CAM
- [ ] Optimierung

---

# 10. Zielbild

Cutlcat soll werden:

👉 **„Das einfachste professionelle Cut-Programm für Schreiner"**
👉 **„CAD/CAM ohne Angst – aber mit Präzision"**
👉 **„Cute außen, brutal effizient innen"**
