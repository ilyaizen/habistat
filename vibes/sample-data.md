# Sample Data Configuration

This document outlines the sample data used in the Habistat application for demonstration purposes. This data is defined in `src/lib/utils/sample-data.ts`.

## Calendars

### 🏋️ Fitness

- **Color Theme**: Green
- **Position**: 0

### 🧠 Productivity

- **Color Theme**: Blue
- **Position**: 1

### 🚫 Bad Habits

- **Color Theme**: Red
- **Position**: 2

## Habits

### 🏋️ Fitness (Calendar)

#### 🛌 Sleep ≥ 6H

- **Description**: Sleep at least 6 hours in the past 24 hours.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 10
- **Position**: 0

#### 🤸 Workout/Stretch

- **Description**: Start the day with light exercise and stretching.
- **Type**: positive
- **Timer**: Enabled (15 minutes)
- **Points**: 15
- **Position**: 1

#### 🚶 Steps ≥ 8,000

- **Description**: Daily step goal for maintaining activity levels.
- **Type**: positive
- **Timer**: Disabled
- **Points**: 30
- **Position**: 2

### 🧠 Productivity (Calendar)

#### 🎯 Code

- **Description**: Practice coding skills.
- **Type**: positive
- **Timer**: Enabled (25 minutes)
- **Points**: 8
- **Position**: 0

#### 📝 Write

- **Description**: Write.
- **Type**: positive
- **Timer**: Enabled (25 minutes)
- **Points**: 3
- **Position**: 1

#### 📖 Read

- **Description**: Daily reading for knowledge and mental stimulation.
- **Type**: positive
- **Timer**: Enabled (25 minutes)
- **Points**: 5
- **Position**: 2
