# Miliki mobile app

Miliki is an Expo Router mobile app for property and real-estate operations. It combines authentication, company onboarding, portfolio and tenancy workflows, rent operations, maintenance, communication, and payment tooling on top of a GraphQL API.

## Platform overview

- **Framework:** Expo + React Native + TypeScript
- **Navigation:** Expo Router file-based routing
- **Data layer:** Apollo Client with HTTP queries/mutations and GraphQL subscriptions
- **State:** React context providers for auth, theme, messaging balances, and drawer state
- **Target:** Mobile-first property management workflows

## Main user flows

### Authentication

Routes under `app/(auth)` cover:

- welcome
- login
- registration
- email / OTP verification
- password reset

Authentication state is managed in `context/auth.tsx`, including token persistence, active company selection, and token refresh on app foreground.

### Onboarding

Routes under `app/(onboarding)` cover:

- choosing whether to create or join a company
- company creation
- plan selection
- getting-started guidance

### Main application

The main shell lives under `app/(tabs)`:

- `home` — dashboard and balances
- `building` — property/building management
- `tenants` — tenant listing and management
- `profile` — account and company settings

Additional drawer-accessible screens include units, leases, maintenance, payments, communication, rent schedules, arrears, accounting, agent statements, portfolio, and manual transfers.

## Data and integrations

- Apollo client setup: `lib/apollo.ts`
- GraphQL operations: `graphql/`
- API constants: `constants/api.ts`

The app sends:

- `Authorization: JWT <token>`
- `X-COMPANY-ID: <company id>`

for authenticated company-scoped requests.

## Project structure

```text
app/          Route definitions and screens
components/   Reusable UI and navigation pieces
constants/    API endpoints, theme constants, shared configuration
context/      Auth, theme, messaging, and drawer providers
graphql/      Queries, mutations, and subscriptions
hooks/        Reusable hooks such as pagination and SMS reading
lib/          Apollo setup and GraphQL helpers
```

## Development

Install dependencies:

```bash
npm install
```

Start the Expo dev server:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## Current implementation notes

- Several accounting/reporting screens currently use placeholder content rather than full workflows.
- The repository currently has pre-existing lint findings unrelated to this README update.
