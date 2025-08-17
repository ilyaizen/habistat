# Sample Data Configuration

This document outlines the sample data used in the Habistat application for demonstration purposes. This data is defined in `src/lib/utils/sample-data.ts`.

---

## Calendars

### ✅ Basic Actions

- **Color Theme**: Green
- **Position**: 0

### 🛠️ Practice Skills

- **Color Theme**: Indigo
- **Position**: 1

### 📚 Study

- **Color Theme**: Pink
- **Position**: 2

### ⛔ Bad Habits

- **Color Theme**: Red
- **Position**: 3

## Habits

### ✅ Basic Actions

#### 🪥 Self-care

- **Description**: Brush teeth, wash face, basic grooming. Small consistent wins preserve energy and public dignity.
- **Type**: positive
- **Timer**: Enabled (2 minutes)
- **Points**: 5
- **Position**: 0

#### 🏋🏽 Exercise

- **Description**: Quick workout to stay active and mobile. Keep intensity focused on mobility and compound moves; treat this as nonnegotiable.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 40
- **Position**: 1

#### 💊 Supplements

- **Description**: Take daily vitamins or health boosters. Always with a meal for proper absorption and consistency.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 5
- **Position**: 2

#### ☕ Coffee Ritual

- **Description**: Brew and enjoy mindfully, no rush. No screens; use as a deliberate focus anchor, not a dopamine hit.
- **Type**: positive
- **Timer**: Enabled (20 minutes)
- **Points**: 5
- **Position**: 3

### 🛠️ Practice Skills

#### 💻 Code

- **Description**: Build projects, debug, or explore new tech stacks. One focused deep work block with a small deliverable each time.
- **Type**: positive
- **Timer**: Enabled (60 minutes)
- **Points**: 50
- **Position**: 0

#### ♟️ Chess

- **Description**: Play or solve puzzles to sharpen strategy skills. Always review one mistake after each session.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 15
- **Position**: 1

#### 🎸 Guitar

- **Description**: Practice chords, riffs, or new songs. Use a metronome and define one clear goal per practice.
- **Type**: positive
- **Timer**: Enabled (20 minutes)
- **Points**: 30
- **Position**: 2

#### 🖌️ Design/Sketch

- **Description**: Visual creativity, analog or digital. Push for quick iterations and complete one thumbnail or study.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 50
- **Position**: 3

### 📚 Study

#### 🎓 Watch Lecture

- **Description**: View and absorb educational content. Capture one clear note and action to apply within 24 hours.
- **Type**: positive
- **Timer**: Enabled (30 minutes)
- **Points**: 40
- **Position**: 0

#### ➗ Learn ML / Math

- **Description**: Work through problems or theory. Alternate solving with short derivations; log errors and fixes.
- **Type**: positive
- **Timer**: Enabled (45 minutes)
- **Points**: 50
- **Position**: 1

#### 📚 Read Non-Fiction

- **Description**: Learn from books on real-world topics. Summarize one actionable takeaway per session.
- **Type**: positive
- **Timer**: Enabled (20 minutes)
- **Points**: 30
- **Position**: 2

#### 🃏 Flashcards

- **Description**: Active recall or spaced repetition. Stick to recall, not recognition, and follow the schedule.
- **Type**: positive
- **Timer**: Enabled (10 minutes)
- **Points**: 25
- **Position**: 3

### ⛔ Bad Habits

#### 🚬 Cravings

- **Description**: Smoking/weed. Treat lapses as data and log triggers immediately.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 5
- **Position**: 0

#### 📱 Doomscroll

- **Description**: Mindless social media or news feed. Keep it to scheduled slots or 10 minutes max.
- **Type**: negative
- **Timer**: Enabled (30 minutes)
- **Points**: 10
- **Position**: 1

#### 🍻 Overindulgence

- **Description**: Alcohol, excess caffeine, or binge snacking. Define thresholds and swap to healthier alternatives.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 30
- **Position**: 2

#### ⏰ Procrastination

- **Description**: Avoiding tasks, drifting into distractions. Use a 10-minute timer and log the cause when you stall.
- **Type**: negative
- **Timer**: Enabled (30 minutes)
- **Points**: 30
- **Position**: 3
