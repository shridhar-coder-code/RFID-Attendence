# RFID Attendance Logger

A React Native / Expo app for an ESP32 and RC522 RFID attendance system. The app reads student profiles and scan logs from Firebase Realtime Database and displays live dashboard, attendance, student, and settings screens.

## Architecture

```text
ESP32 + RC522 ── scan events / heartbeat ──> Firebase Realtime Database
                                                │
                                                └──> React Native app
                                                     Dashboard / Attendance
                                                     Students / Settings
```

The firmware is maintained separately and is not included in this repository. The app expects the database schema below.

## Firebase Data

Student profiles are keyed by the card UID:

```json
{
  "students": {
    "UID_HEX_1": {
      "name": "Student Name",
      "rollNo": "CS101",
      "class": "Grade 10-A"
    }
  }
}
```

Attendance logs are pushed under unique Firebase keys. The app accepts either `studentUid` or `uid` and Unix-second or ISO timestamps:

```json
{
  "attendanceLogs": {
    "-FirebasePushKey": {
      "studentUid": "UID_HEX_1",
      "status": "IN",
      "timestamp": 1759409293,
      "scannerId": "esp32_campus_east"
    }
  }
}
```

Hardware status can be stored at the root or per device:

```json
{
  "hardwareStatus": {
    "esp32_campus_east": {
      "status": "online",
      "lastHeartbeat": 1759409293
    }
  }
}
```

The Settings screen checks root and per-device `lastSeen`/`lastHeartbeat` fields. It polls while Settings is open and shows hardware as connected when a heartbeat is recent.

## App Features

- **Dashboard:** Counts registered UIDs, uses each registered student's latest status for today's attendance, and excludes unknown cards from totals.
- **Attendance:** Shows newest Firebase scans first, resolves UIDs against `/students`, and supports search by name, roll number, UID, or status.
- **Students:** Adds, lists, and deletes Firebase profiles keyed by RFID UID.
- **Settings:** Stores school and webhook preferences locally, tests the configured webhook, reports hardware status, and lets users choose Light, Dark, or System appearance.
- **Typography:** Loads Orbitron Regular and Bold and applies them throughout the screens, form inputs, and tab labels.
- **Navigation:** Four bottom tabs with safe-area-aware spacing and theme-aware colors.

The app reads attendance and student data from Firebase. The Settings webhook button performs a connection test; RFID-to-Google-Sheets backup is handled by the separately maintained firmware when configured there.

## Hardware Reference

| Component | Connection | ESP32 pin |
| --- | --- | --- |
| RC522 RFID | SDA / SS | GPIO 5 |
| RC522 RFID | SCK | GPIO 18 |
| RC522 RFID | MOSI | GPIO 23 |
| RC522 RFID | MISO | GPIO 19 |
| RC522 RFID | RST | GPIO 4 |
| Status LED | Check-in | GPIO 2 |
| Status LED | Check-out | GPIO 16 |

Configure Wi-Fi credentials in the firmware, not in this repository's README.

## Run Locally

Prerequisites: Node.js and Expo Go on a device on the same Wi-Fi network.

```bash
git clone https://github.com/shridhar-coder-code/RFID-Attendence.git
cd RFID-Attendence
npm install
npx expo start --lan
```

Scan the terminal QR code with Expo Go. The dashboard and attendance feed poll Firebase while their tabs are active.

## Android APK

The `preview` EAS profile is configured to produce an APK:

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS build page and install it on an Android device. Native app configuration or asset changes require a new build.

## Recent Updates

- Added UID-based Firebase student profiles and attendance-log joins.
- Filtered dashboard totals to registered students and calculated absent as registered minus present.
- Added per-device heartbeat detection, persisted Light/Dark/System themes, and Orbitron typography.
- Configured the custom app icon, splash screen, and Android preview APK profile.