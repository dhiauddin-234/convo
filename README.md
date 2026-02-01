# Firebase Studio

This is a Next.js starter project configured for Firebase Studio.

## Getting Started

To start developing, take a look at the main page file at `src/app/page.tsx`.

## Project Structure

-   `src/app`: Contains all the application routes, using the Next.js App Router.
-   `src/components`: Contains reusable React components, including UI components from `shadcn/ui`.
-   `src/firebase`: Contains Firebase configuration, providers, and hooks.
-   `src/ai`: Contains Genkit flows for AI-powered features.
-   `docs/backend.json`: A blueprint for your Firebase data structures.
-   `firestore.rules`: Security rules for your Firestore database.
-   `storage.rules`: Security rules for Firebase Storage.

## Deployment

This application is configured for deployment with **Firebase App Hosting**.

From within Firebase Studio, you can typically find a "Deploy" button or a similar mechanism in the user interface to build and deploy your application.

When deployed, Firebase App Hosting automatically handles the build process (`npm run build`) and starts the application based on the Next.js configuration. The Firebase SDK is automatically configured in the deployed environment, so you don't need to manage production API keys manually.
