# Prescribe Mobile

Expo React Native mobile frontend for the Prescribe monorepo.

## Getting Started

```bash
npm install
npm run ios
```

The app talks to the existing FastAPI backend. By default it uses:

- iOS simulator / web: `http://localhost:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`

For a physical device, set your machine's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000/api npm run ios
```

## Structure

- `app/` - Expo Router entrypoints.
- `src/api/` - backend request helpers.
- `src/auth/` - auth session context and token storage.
- `src/config/` - runtime configuration.
- `src/features/` - feature screens and components.
- `src/theme/` - React Native Paper theme.
