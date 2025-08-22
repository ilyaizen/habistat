# Sample Data Configuration

This document outlines the sample data used in the Habistat application for demonstration purposes. This data is defined in `src/lib/utils/sample-data.ts`.

---

## Calendars

### 🙅 Bad Habits

- **Color Theme**: Red
- **Position**: 0

### 🌱 Common

- **Color Theme**: Green
- **Position**: 1

### 🥷 Practice

- **Color Theme**: Indigo
- **Position**: 2

### 🚀 Learn

- **Color Theme**: Pink
- **Position**: 3

## Habits

### 🙅 Bad Habits

#### 🚬 Cigarette

- **Description**: Engaging in smoking cigarettes. Focus on recording each lapse to understand and address triggers effectively.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 5
- **Position**: 0
 - **Frequency**: 50

#### 🍁 Weed

- **Description**: Engaging in smoking weed. Monitor and log each occurrence to identify patterns and triggers.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 15
- **Position**: 1
 - **Frequency**: 30

#### 🌽 Corn

- **Description**: Engaging in corn. Keep a detailed log of each lapse to analyze and mitigate triggers.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 40
- **Position**: 2
 - **Frequency**: 5

### 🌱 Common

#### 🪥 Hygiene

- **Description**: Maintain daily hygiene practices like brushing teeth and washing face. These small actions help maintain public dignity and personal well-being.
- **Type**: positive
- **Timer**: Enabled (5 minutes)
- **Points**: 5
- **Position**: 0
 - **Frequency**: 40

#### 🏋🏽 Exercise

- **Description**: Engage in a quick workout to stay active and maintain mobility. Focus on consistent, non-negotiable physical activity.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 40
- **Position**: 1
 - **Frequency**: 10

#### 🧘 Meditate

- **Description**: Take daily vitamins or health supplements. Ensure they are taken with meals for better absorption and consistency.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 10
- **Position**: 2
 - **Frequency**: 30

### 🥷 Practice

#### 💻 Code

- **Description**: Dedicate time to building projects, debugging, or exploring new tech stacks. Aim for focused deep work with a specific deliverable each session.
- **Type**: positive
- **Timer**: Enabled (45 minutes)
- **Points**: 50
- **Position**: 0
 - **Frequency**: 50

#### 🖌️ Design

- **Description**: Engage in visual creativity, whether analog or digital. Aim for quick iterations and complete at least one thumbnail or study per session.
- **Type**: positive
- **Timer**: Enabled (45 minutes)
- **Points**: 50
- **Position**: 1
 - **Frequency**: 20

#### ♟️ Chess

- **Description**: Play chess or solve puzzles to enhance strategic thinking. Review one mistake after each session for continuous improvement.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 15
- **Position**: 2
 - **Frequency**: 15

### 🚀 Learn

#### 🎓 Watch Lecture

- **Description**: Watch and absorb educational content. Capture key notes and identify one actionable item to apply within 24 hours.
- **Type**: positive
- **Timer**: Enabled (30 minutes)
- **Points**: 40
- **Position**: 0
 - **Frequency**: 10

#### ➗ Study Math

- **Description**: Work through math problems or theory. Alternate between solving problems and short derivations, logging errors and corrections as you go.
- **Type**: positive
- **Timer**: Enabled (45 minutes)
- **Points**: 50
- **Position**: 1
 - **Frequency**: 20

#### 📚 Read Non-Fiction

- **Description**: Read books on real-world topics and summarize one actionable takeaway from each session.
- **Type**: positive
- **Timer**: Enabled (20 minutes)
- **Points**: 30
- **Position**: 2
 - **Frequency**: 5
