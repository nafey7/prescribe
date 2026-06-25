# Mobile App Guide

Expo React Native app for the Prescribe monorepo.

## Defaults

- Use Expo Router for navigation.
- Keep feature code under `src/features/*`.
- Keep reusable API/session/config code under `src/api`, `src/auth`, and `src/config`.
- Use `expo-secure-store` for token persistence.
- API payloads should match the backend wire format (`snake_case`).

## Commands

```bash
npm run typecheck
npm run ios
npm run android
npm run web
```

Set `EXPO_PUBLIC_API_URL` when running on a physical device or non-default host, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000/api npm run ios
```
