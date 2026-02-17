## DebtSet
DebtSet is a sleek, cross-platform mobile application built with React Native and Expo that helps you track personal debts, manage your payback schedule, and never miss a due date. With smooth animations and smart local notifications, DebtSet ensures you stay on top of your finances.
## Folder structure

```bash
DebtSet/
├── src/
│   ├── api/             # Supabase logic (fetching/inserting data)
│   ├── components/      # Reusable UI (DebtCard, Header, Input)
│   ├── lib/             # Third-party configurations (Supabase client)
│   ├── screens/         # Full screen views (Auth, Dashboard)
│   ├── types/           # TypeScript interfaces (Database types)
│   └── utils/           # Helper functions (Currency formatting, Date math)
├── .env                 # Environment variables (Hidden/Secret)
├── App.tsx              # Root component (Navigation & Auth check)
├── app.json             # Expo config
└── tsconfig.json        # TypeScript config
```

## 🛠 Tech Stack

* **Frontend:** React Native, Expo
* **Language:** TypeScript
* **Animations:** Moti (Reanimated)
* **Backend & Auth:** Supabase (PostgreSQL)
* **Native Modules:** Expo Notifications, React Native Community DateTimePicker

## Local Development Setup

Follow these steps to get the project running on your local machine.

### Prerequisites
* Node.js (v18 or newer recommended)
* `npm` or `yarn` installed
* Expo Go app installed on your physical device, or an iOS Simulator / Android Emulator running.

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/holydev99/debtSet.git
cd debtset
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables
Create a `.env` file in the root of your project and add your Supabase credentials. 
*(Note: Never commit your `.env` file to version control.)*

\`\`\`env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
\`\`\`
\`\`\`env.local
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 4. Database Setup (Supabase)
Ensure your Supabase project has a `debts` table with the following schema:
* `id` (uuid, primary key)
* `user_id` (uuid, references auth.users)
* `title` (text)
* `amount` (numeric)
* `description` (text, nullable)
* `payback_date` (timestamp with time zone)
* `is_paid` (boolean, default: false)
* `paid_at` (timestamp with time zone, nullable)
* `notification_id` (text, nullable)
* `created_at` (timestamp with time zone)

### 5. Start the App
\`\`\`bash
npx expo start
\`\`\`
Scan the QR code in your terminal with the Expo Go app (Android) or your Camera app (iOS) to load the app on your device.

---
