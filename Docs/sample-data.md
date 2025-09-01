# Sample Data Configuration

This document outlines the sample data used in the Habistat application for demonstration purposes. This data is defined in `src/lib/utils/sample-data.ts`.

---

## Calendars

### 👍 Good Habits

- **Color Theme**: Green
- **Position**: 0

### 👎 Bad Habits

- **Color Theme**: Red
- **Position**: 1

## Habits

### 👍 Good Habits

#### 🏋🏽 Exercise

- **Description**: Engage in a quick workout to stay active and maintain mobility. Focus on consistent, non-negotiable physical activity.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 40
- **Position**: 0
 - **Frequency**: 10

#### 🧘 Meditate

- **Description**: Practice daily meditation and mindfulness with focus and consistency.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 50
- **Position**: 1
 - **Frequency**: 30

### 👎 Bad Habits

#### 🚬 Cigarettes

- **Description**: Engaging in smoking cigarettes. Focus on recording each lapse to understand and address triggers effectively.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 5
- **Position**: 0
 - **Frequency**: 50

#### 🌽 Corn

- **Description**: Engaging in corn. Keep a detailed log of each lapse to analyze and mitigate triggers.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 40
- **Position**: 1
 - **Frequency**: 5

