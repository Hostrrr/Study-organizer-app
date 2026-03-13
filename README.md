<div align="center">

# 📚 StudyOrganizer

### A cross-platform mobile organizer for academic activities

<div align="center">
  <img src="assets/screenshots/schedule.png" width="30%" />
  <img src="assets/screenshots/calendar.png" width="30%" />
  <img src="assets/screenshots/knowledge.png" width="30%" />
</div>

[![React Native](https://img.shields.io/badge/React%20Native-0.74-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-local%20DB-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey?style=flat-square)](https://reactnative.dev/)

*Course project — Kuban State University, Faculty of Computer Technologies and Applied Mathematics*

</div>

---

## 📖 About

**StudyOrganizer** is a fully functional cross-platform mobile application designed to help students structure their academic workflow. Built with **React Native** and **Expo**, it runs natively on both iOS and Android from a single JavaScript codebase.

The app provides tools for managing class schedules, tracking deadlines, storing notes and study materials — all stored locally on the device using an SQLite database, with no internet connection required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📅 **Schedule** | View and manage your weekly class timetable with first-launch setup wizard |
| 🗓️ **Calendar** | Navigate by date, create and track academic events and deadlines |
| 🧠 **Knowledge Base** | Store subject-specific notes, summaries, and study materials |
| 💾 **Local Storage** | All data is persisted locally via SQLite — no account needed |
| 🌙 **Adaptive UI** | Responsive interface that adapts to different screen sizes |
| 📱 **Cross-platform** | Single codebase runs on both iOS and Android |

---

## 🛠️ Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation:** [React Navigation](https://reactnavigation.org/)
- **Database:** SQLite via `expo-sqlite`
- **Architecture:** MVC / MVVM hybrid
- **Language:** JavaScript (ES2022)
- **Dev Tools:** Expo Go, Expo CLI, Metro Bundler

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/client) app on your phone (for quick preview)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/study-organizer.git
cd study-organizer

# Install dependencies
npm install

# Start the development server
npx expo start
```

Then scan the QR code with **Expo Go** on your phone, or press `i` / `a` to open in an iOS/Android simulator.

---

## 📁 Project Structure

```
study-organizer/
├── app/
│   ├── screens/
│   │   ├── ScheduleScreen.js    # Weekly timetable view
│   │   ├── CalendarScreen.js    # Date-based event manager
│   │   └── KnowledgeScreen.js   # Study notes & materials
│   ├── components/              # Reusable UI components
│   ├── database/
│   │   └── db.js                # SQLite schema & queries
│   └── navigation/
│       └── AppNavigator.js      # Bottom tab navigation setup
├── assets/                      # Icons and images
├── app.json                     # Expo configuration
└── package.json
```

---

## 🗃️ Database Schema

The app uses a local **SQLite** database with the following main entities:

- **`schedule`** — weekly recurring lessons (subject, room, time, weekday)
- **`events`** — calendar events with dates and descriptions
- **`notes`** — knowledge base entries linked to subjects

---

## 📱 Screens

### 📅 Schedule
Displays the weekly timetable. On first launch, a setup wizard guides you through entering your class schedule. Supports adding, editing, and deleting lessons.

### 🗓️ Calendar
A date-picker view that shows events for the selected day. Create new events with titles, descriptions, and deadlines.

### 🧠 Knowledge Base
A subject-organized repository for storing study materials, key concepts, formulas, and summaries.

---

## 🏗️ Architecture

The project follows a **component-based architecture** inspired by MVC/MVVM principles:

- **UI layer** — React Native components with hooks for local state
- **Data layer** — SQLite accessed through a centralized `db.js` module
- **Navigation** — Stack and Tab navigators from React Navigation

---

## 🧪 Testing

The application was tested on:
- Physical Android device
- iOS Simulator (via Expo Go)
- Multiple screen sizes and orientations

---

## 📄 License

This project was developed as a **course work** at Kuban State University (2025).  
Free to use as a reference or learning material.

---

<div align="center">

Made with ❤️ by **G. S. Nazarenko**  
Kuban State University · 2025

</div>