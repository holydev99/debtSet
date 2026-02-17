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
