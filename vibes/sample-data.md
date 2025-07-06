# Sample Data Configuration

This document outlines the sample data used in the Habistat application for demonstration purposes. This data is defined in `src/lib/utils/sample-data.ts`.

## Calendars

### 🏋️ Fitness & Mindfulness

- **Color Theme**: Green
- **Position**: 0

### 🧠 Mind & Productivity

- **Color Theme**: Blue
- **Position**: 1

### 🚫 Bad Habits

- **Color Theme**: Red
- **Position**: 2

## Habits

### 🏋️ Fitness & Health

#### 🤸 Workout/Stretch

- **Description**: Start the day with light exercise and stretching.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 15
- **Position**: 0

#### 🚶 8,000 steps

- **Description**: Daily step goal for maintaining activity levels.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 30
- **Position**: 1

#### 🛌 Sleep ≥ 6H

- **Description**: Sleep at least 6 hours in the past 24 hours.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 10
- **Position**: 2

### 🧠 Mind & Productivity

#### 📖 Read

- **Description**: Daily reading for knowledge and mental stimulation.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 5
- **Position**: 0

#### 📝 Write

- **Description**: Write a focused 3-item to-do list for the day.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 3
- **Position**: 1

#### 🎯 Code

- **Description**: Practice coding skills.
- **Type**: positive
- **Timer**: Enabled (20 minutes)
- **Points**: 8
- **Position**: 2

### 🚫 Bad Habits

#### 🌽 Corn

- **Description**: Avoid eating corn.
- **Type**: negative
- **Timer**: Disabled
- **Points**: 15
- **Position**: 0
